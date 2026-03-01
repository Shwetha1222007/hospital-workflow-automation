"""
Movement Logs router — inter-department movement audit trail.
Provides:
  GET /                            — Admin: full audit trail
  GET /patient/{id}                — All staff + patient: complete timeline
  GET /patient/{id}/summary        — Compact summary with time-in-stage
  POST /nurse-action               — Nurse shortcut: log workflow actions
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

from app.database import get_db
from app.models.user import User, UserRole
from app.models.movement_log import MovementLog, log_movement, LogColor
from app.models.patient_user import PatientUser
from app.models.nurse import Nurse
from app.core.dependencies import get_current_user, require_super_admin

router = APIRouter()


# ── Schemas ───────────────────────────────────────────────────────────────────

class MovementLogOut(BaseModel):
    id:              int
    patient_id:      Optional[int] = None
    reference_id:    int
    ref_type:        str
    from_department: Optional[str] = None
    to_department:   str
    action:          str
    status:          Optional[str] = None
    color_code:      Optional[str] = None
    timestamp:       datetime
    updated_by:      int
    actor_name:      Optional[str] = None

    class Config:
        from_attributes = True


class TimelineStep(BaseModel):
    action:      str
    status:      Optional[str] = None
    color_code:  Optional[str] = None
    actor_name:  Optional[str] = None
    timestamp:   datetime
    ref_type:    str


class TimelineSummary(BaseModel):
    patient_id:         int
    current_stage:      str
    stage_color:        str
    time_in_stage_mins: int
    steps:              List[TimelineStep]


class NurseActionIn(BaseModel):
    patient_id: int
    action:     str   # e.g. "Patient Arrived", "Report Received & Verified"


# ── Helpers ───────────────────────────────────────────────────────────────────

def _enrich_log(log: MovementLog) -> MovementLogOut:
    out = MovementLogOut.model_validate(log)
    if log.actor:
        out.actor_name = log.actor.full_name
    return out


def _nurse_owns_patient(nurse_user: User, patient_id: int, db: Session) -> bool:
    """Check if the nurse's assigned doctor covers this patient."""
    from app.models.patient import Patient
    nurse = db.query(Nurse).filter(Nurse.user_id == nurse_user.id).first()
    if not nurse:
        return False
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        return False
    return patient.doctor_id == nurse.doctor_id


# ── GET / — Admin-only: all logs ─────────────────────────────────────────────

@router.get("/", response_model=List[MovementLogOut])
def get_all_logs(
    ref_type:    Optional[str] = None,
    db: Session = Depends(get_db),
    _: User = Depends(require_super_admin),
):
    """Super Admin only — full audit trail of all movement logs."""
    q = db.query(MovementLog)
    if ref_type:
        q = q.filter(MovementLog.ref_type == ref_type.upper())
    return [_enrich_log(log) for log in q.order_by(MovementLog.timestamp.desc()).all()]


# ── GET /patient/{id} — Complete timeline for one patient ─────────────────────

@router.get("/patient/{patient_id}", response_model=List[MovementLogOut])
def get_patient_logs(
    patient_id: int,
    db: Session  = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Return ALL movement logs for a patient (PATIENT + LAB + TICKET events)
    filtered by patient_id. Accessible by all staff and the patient (ownership checked).
    """
    # Patients: enforce ownership
    if current_user.role == UserRole.PATIENT:
        link = db.query(PatientUser).filter(PatientUser.user_id == current_user.id).first()
        if not link or link.patient_id != patient_id:
            raise HTTPException(403, "You can only view your own movement logs")

    # Nurses: enforce scope
    if current_user.role == UserRole.NURSE:
        if not _nurse_owns_patient(current_user, patient_id, db):
            raise HTTPException(403, "Patient is not under your assigned doctor")

    logs = (
        db.query(MovementLog)
        .filter(MovementLog.patient_id == patient_id)
        .order_by(MovementLog.timestamp.asc())
        .all()
    )
    return [_enrich_log(log) for log in logs]


# ── GET /patient/{id}/summary — Compact stage summary with time-in-stage ──────

@router.get("/patient/{patient_id}/summary", response_model=TimelineSummary)
def get_patient_timeline_summary(
    patient_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Returns a compact summary: current stage, color, time-in-stage (minutes),
    and an ordered list of all timeline steps.
    Accessible to Admin, Doctor, Nurse (scope-checked), and Patient (ownership-checked).
    """
    # Patient ownership
    if current_user.role == UserRole.PATIENT:
        link = db.query(PatientUser).filter(PatientUser.user_id == current_user.id).first()
        if not link or link.patient_id != patient_id:
            raise HTTPException(403, "You can only view your own timeline")

    # Nurse scope
    if current_user.role == UserRole.NURSE:
        if not _nurse_owns_patient(current_user, patient_id, db):
            raise HTTPException(403, "Patient is not under your assigned doctor")

    logs = (
        db.query(MovementLog)
        .filter(MovementLog.patient_id == patient_id)
        .order_by(MovementLog.timestamp.asc())
        .all()
    )

    if not logs:
        # ── Synthetic steps from patient record (no real logs yet) ──────────
        from app.models.patient      import Patient
        from app.models.doctor       import Doctor
        from app.models.nurse        import Nurse
        from app.models.patient_user import PatientUser

        patient = db.query(Patient).filter(Patient.id == patient_id).first()
        if not patient:
            return TimelineSummary(patient_id=patient_id, current_stage="Patient Registered",
                                   stage_color="GREEN", time_in_stage_mins=0, steps=[])

        synth = []
        reg_time = patient.created_at or datetime.utcnow()

        # Step 1: Patient Registered
        synth.append(TimelineStep(
            action="Patient Registered",
            status="COMPLETED", color_code="GREEN",
            actor_name="Super Admin", timestamp=reg_time, ref_type="PATIENT",
        ))

        # Step 2: Doctor Assigned (if any)
        if patient.doctor_id and patient.doctor:
            doc_name = patient.doctor.user.full_name if patient.doctor.user else "Doctor"
            synth.append(TimelineStep(
                action=f"Doctor Assigned: {doc_name} ({patient.specialization_required or ''})",
                status="COMPLETED", color_code="GREEN",
                actor_name="System", timestamp=reg_time, ref_type="PATIENT",
            ))
            # Step 3: Nurse Assigned (if any)
            nurse = db.query(Nurse).filter(Nurse.doctor_id == patient.doctor_id).first()
            if nurse and nurse.user:
                synth.append(TimelineStep(
                    action=f"Nurse Assigned: {nurse.user.full_name}",
                    status="COMPLETED", color_code="GREEN",
                    actor_name="System", timestamp=reg_time, ref_type="PATIENT",
                ))

        # Step 4: In-progress / Completed
        if patient.status == "IN_PROGRESS":
            synth.append(TimelineStep(
                action="Doctor Consultation In Progress",
                status="IN_PROGRESS", color_code="YELLOW",
                actor_name=None, timestamp=reg_time, ref_type="PATIENT",
            ))
        elif patient.status == "COMPLETED":
            synth.append(TimelineStep(
                action="Treatment Completed",
                status="COMPLETED", color_code="GREEN",
                actor_name=None, timestamp=reg_time, ref_type="PATIENT",
            ))

        last_step = synth[-1]
        delta = datetime.utcnow() - reg_time
        time_mins = int(delta.total_seconds() / 60)

        return TimelineSummary(
            patient_id         = patient_id,
            current_stage      = last_step.action,
            stage_color        = last_step.color_code or "GREEN",
            time_in_stage_mins = time_mins,
            steps              = synth,
        )

    last = logs[-1]
    delta = datetime.utcnow() - last.timestamp
    time_mins = max(0, int(delta.total_seconds() / 60))

    steps = []
    for log in logs:
        steps.append(TimelineStep(
            action     = log.action,
            status     = log.status,
            color_code = log.color_code,
            actor_name = log.actor.full_name if log.actor else None,
            timestamp  = log.timestamp,
            ref_type   = log.ref_type,
        ))

    return TimelineSummary(
        patient_id         = patient_id,
        current_stage      = last.action,
        stage_color        = last.color_code or "YELLOW",
        time_in_stage_mins = time_mins,
        steps              = steps,
    )


# ── POST /nurse-action — Nurse workflow shortcut ──────────────────────────────

@router.post("/nurse-action", response_model=MovementLogOut)
def nurse_action(
    data: NurseActionIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Nurse logs a workflow action for her patient (e.g., Patient Arrived, Report Received).
    Only nurses whose assigned doctor covers this patient can call this.
    """
    if current_user.role not in [UserRole.NURSE, UserRole.SUPER_ADMIN]:
        raise HTTPException(403, "Only nurses can log workflow actions")

    if current_user.role == UserRole.NURSE:
        if not _nurse_owns_patient(current_user, data.patient_id, db):
            raise HTTPException(403, "Patient is not under your assigned doctor")

    entry = log_movement(
        db,
        patient_id   = data.patient_id,
        reference_id = data.patient_id,
        ref_type     = "PATIENT",
        from_dept    = "NURSE",
        to_dept      = "NURSE",
        action       = data.action,
        updated_by   = current_user.id,
        status       = "COMPLETED",
        color_code   = LogColor.GREEN,
    )
    db.commit()
    db.refresh(entry)
    return _enrich_log(entry)
