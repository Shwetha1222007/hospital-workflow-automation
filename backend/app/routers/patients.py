from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from app.database import get_db
from app.models.patient import Patient, generate_patient_code, detect_specialization
from app.models.doctor  import Doctor
from app.models.nurse   import Nurse
from app.models.user    import User, UserRole
from app.models.workflow import WorkflowLog, WorkflowStage, WorkflowStatus
from app.core.dependencies import get_current_user, require_super_admin

router = APIRouter()


# ── Schemas ──────────────────────────────────────────────────────────────────

class PatientCreate(BaseModel):
    name:      str
    age:       Optional[int]  = None
    gender:    Optional[str]  = None
    phone:     Optional[str]  = None
    complaint: Optional[str]  = None
    priority:  Optional[str]  = "NORMAL"    # NORMAL / EMERGENCY


class PatientUpdate(BaseModel):
    diagnosis:       Optional[str] = None
    treatment_notes: Optional[str] = None
    status:          Optional[str] = None


class PatientOut(BaseModel):
    id:                     int
    patient_code:           str
    name:                   str
    age:                    Optional[int]      = None
    gender:                 Optional[str]      = None
    phone:                  Optional[str]      = None
    complaint:              Optional[str]      = None
    specialization_required:Optional[str]      = None
    priority:               Optional[str]      = None
    status:                 Optional[str]      = None
    doctor_id:              Optional[int]      = None
    nurse_id:               Optional[int]      = None
    doctor_name:            Optional[str]      = None
    nurse_name:             Optional[str]      = None
    diagnosis:              Optional[str]      = None
    treatment_notes:        Optional[str]      = None
    created_at:             Optional[datetime] = None

    class Config:
        from_attributes = True


class WorkflowLogOut(BaseModel):
    id:              int
    patient_id:      int
    stage:           str
    status:          str
    assigned_user_id:Optional[int]      = None
    updated_by:      Optional[int]      = None
    notes:           Optional[str]      = None
    is_late:         Optional[bool]     = False
    resolved:        Optional[bool]     = False
    timestamp:       datetime
    updator_name:    Optional[str]      = None

    class Config:
        from_attributes = True


def _enrich(p: Patient) -> PatientOut:
    d = PatientOut.model_validate(p)
    if p.doctor and p.doctor.user:
        d.doctor_name = p.doctor.user.full_name
    if p.nurse and p.nurse.user:
        d.nurse_name = p.nurse.user.full_name
    return d


def _get_doctor(user: User, db: Session) -> Optional[Doctor]:
    return db.query(Doctor).filter(Doctor.user_id == user.id).first()

def _get_nurse(user: User, db: Session) -> Optional[Nurse]:
    return db.query(Nurse).filter(Nurse.user_id == user.id).first()


# ── GET — filtered by role ────────────────────────────────────────────────────

@router.get("/", response_model=List[PatientOut])
def get_patients(
    status:   Optional[str] = None,
    priority: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(Patient)

    if current_user.role == UserRole.DOCTOR:
        doc = _get_doctor(current_user, db)
        if not doc:
            raise HTTPException(403, "Doctor profile not found")
        q = q.filter(Patient.doctor_id == doc.id)

    elif current_user.role == UserRole.NURSE:
        nurse = _get_nurse(current_user, db)
        if not nurse:
            raise HTTPException(403, "Nurse profile not found")
        q = q.filter(Patient.doctor_id == nurse.doctor_id)

    if status:   q = q.filter(Patient.status   == status.upper())
    if priority: q = q.filter(Patient.priority == priority.upper())

    return [_enrich(p) for p in q.order_by(Patient.created_at.desc()).all()]


# ── GET /search ───────────────────────────────────────────────────────────────

@router.get("/search", response_model=List[PatientOut])
def search_patients(
    q: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    results = db.query(Patient).filter(
        (Patient.patient_code.ilike(f"%{q}%")) |
        (Patient.name.ilike(f"%{q}%"))
    ).all()
    return [_enrich(p) for p in results]


# ── GET /{code} ───────────────────────────────────────────────────────────────

@router.get("/{patient_code}", response_model=PatientOut)
def get_patient(
    patient_code: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    p = db.query(Patient).filter(Patient.patient_code == patient_code).first()
    if not p:
        raise HTTPException(404, f"Patient {patient_code} not found")
    return _enrich(p)


# ── POST / — SUPER_ADMIN only — auto-assign doctor and nurse ─────────────────

@router.post("/", response_model=PatientOut, status_code=201)
def create_patient(
    data: PatientCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_super_admin),
):
    priority = (data.priority or "NORMAL").upper()
    if priority not in {"NORMAL", "EMERGENCY"}:
        raise HTTPException(400, "Priority must be NORMAL or EMERGENCY")

    spec = detect_specialization(data.complaint or "")

    # Find best doctor
    doctors = db.query(Doctor).filter(Doctor.specialization == spec).all()
    if not doctors:
        doctors = db.query(Doctor).filter(Doctor.specialization == "GENERAL").all()
    if not doctors:
        doctors = db.query(Doctor).all()

    assigned_doctor = None
    assigned_nurse  = None
    if doctors:
        assigned_doctor = min(doctors, key=lambda d: len(d.patients))
        # Find a nurse assigned to this doctor
        nurses = db.query(Nurse).filter(Nurse.doctor_id == assigned_doctor.id).all()
        if nurses:
            # n.patients is a dynamic relationship — use .count()
            assigned_nurse = min(nurses, key=lambda n: n.patients.count())

    patient_code = generate_patient_code(db)
    patient = Patient(
        patient_code            = patient_code,
        name                    = data.name.strip(),
        age                     = data.age,
        gender                  = data.gender,
        phone                   = data.phone,
        complaint               = data.complaint,
        specialization_required = spec,
        priority                = priority,
        status                  = "PENDING",
        doctor_id               = assigned_doctor.id if assigned_doctor else None,
        nurse_id                = assigned_nurse.id  if assigned_nurse  else None,
        created_by              = current_user.id,
    )
    db.add(patient)
    db.commit()
    db.refresh(patient)

    # REGISTRATION log
    reg_log = WorkflowLog(
        patient_id = patient.id,
        stage      = WorkflowStage.REGISTRATION,
        status     = WorkflowStatus.COMPLETED,
        updated_by = current_user.id,
        notes      = f"Patient registered by {current_user.full_name}. Complaint: {data.complaint}"
    )
    db.add(reg_log)

    # DOCTOR ASSIGNED log
    if assigned_doctor:
        doc_log = WorkflowLog(
            patient_id       = patient.id,
            stage            = WorkflowStage.DOCTOR,
            status           = WorkflowStatus.ASSIGNED,
            assigned_user_id = assigned_doctor.user_id,
            updated_by       = current_user.id,
            notes            = f"Auto-assigned to Dr. {assigned_doctor.user.full_name} ({spec})"
        )
        db.add(doc_log)

    # NURSE ASSIGNED log
    if assigned_nurse:
        nurse_log = WorkflowLog(
            patient_id       = patient.id,
            stage            = WorkflowStage.NURSE_CARE,
            status           = WorkflowStatus.ASSIGNED,
            assigned_user_id = assigned_nurse.user_id,
            updated_by       = current_user.id,
            notes            = f"Auto-assigned to Nurse {assigned_nurse.user.full_name}"
        )
        db.add(nurse_log)

    db.commit()
    return _enrich(patient)


# ── PATCH /{code} — Doctor / Nurse update ────────────────────────────────────

@router.patch("/{patient_code}", response_model=PatientOut)
def update_patient(
    patient_code: str,
    data: PatientUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    p = db.query(Patient).filter(Patient.patient_code == patient_code).first()
    if not p:
        raise HTTPException(404, f"Patient {patient_code} not found")

    if current_user.role == UserRole.DOCTOR:
        doc = _get_doctor(current_user, db)
        if not doc or p.doctor_id != doc.id:
            raise HTTPException(403, "You can only update your own patients")

        old_status = p.status
        if data.diagnosis       is not None: p.diagnosis       = data.diagnosis
        if data.treatment_notes is not None: p.treatment_notes = data.treatment_notes
        if data.status          is not None: p.status          = data.status.upper()

        if data.status and data.status.upper() != old_status:
            log = WorkflowLog(
                patient_id = p.id,
                stage      = WorkflowStage.DOCTOR,
                status     = WorkflowStatus.COMPLETED if data.status.upper() in ["COMPLETED", "IN_PROGRESS"] else WorkflowStatus.IN_PROGRESS,
                updated_by = current_user.id,
                notes      = f"Doctor {current_user.full_name} consulted patient. Diagnosis entered."
            )
            db.add(log)

    elif current_user.role == UserRole.NURSE:
        nurse = _get_nurse(current_user, db)
        if not nurse or p.doctor_id != nurse.doctor_id:
            raise HTTPException(403, "You can only update patients under your assigned doctor")

        old_status = p.status
        if data.status is not None: p.status = data.status.upper()

        if data.status and data.status.upper() != old_status:
            log = WorkflowLog(
                patient_id = p.id,
                stage      = WorkflowStage.NURSE_CARE,
                status     = WorkflowStatus.IN_PROGRESS,
                updated_by = current_user.id,
                notes      = f"Nurse {current_user.full_name} updated status to {p.status}"
            )
            db.add(log)

    elif current_user.role == UserRole.SUPER_ADMIN:
        if data.diagnosis       is not None: p.diagnosis       = data.diagnosis
        if data.treatment_notes is not None: p.treatment_notes = data.treatment_notes
        if data.status          is not None: p.status          = data.status.upper()

    else:
        raise HTTPException(403, "Access denied")

    db.commit()
    db.refresh(p)
    return _enrich(p)


# ── DELETE /{code} — Super Admin only ────────────────────────────────────────

@router.delete("/{patient_code}", status_code=204)
def delete_patient(
    patient_code: str,
    db: Session = Depends(get_db),
    _: User = Depends(require_super_admin),
):
    p = db.query(Patient).filter(Patient.patient_code == patient_code).first()
    if not p:
        raise HTTPException(404, f"Patient {patient_code} not found")
    db.delete(p)
    db.commit()


# ── GET /{code}/workflow ──────────────────────────────────────────────────────

@router.get("/{patient_code}/workflow", response_model=List[WorkflowLogOut])
def get_patient_workflow(
    patient_code: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    p = db.query(Patient).filter(Patient.patient_code == patient_code).first()
    if not p:
        raise HTTPException(404, f"Patient {patient_code} not found")

    logs = db.query(WorkflowLog).filter(WorkflowLog.patient_id == p.id).order_by(WorkflowLog.timestamp.asc()).all()

    result = []
    for log in logs:
        out = WorkflowLogOut(
            id              = log.id,
            patient_id      = log.patient_id,
            stage           = log.stage,
            status          = log.status,
            assigned_user_id= log.assigned_user_id,
            updated_by      = log.updated_by,
            notes           = log.notes,
            is_late         = log.is_late or False,
            resolved        = log.resolved or False,
            timestamp       = log.timestamp,
            updator_name    = log.updator.full_name if log.updator else None
        )
        result.append(out)
    return result
