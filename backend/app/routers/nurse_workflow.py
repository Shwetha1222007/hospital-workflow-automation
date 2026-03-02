"""
Nurse Workflow Router — Nurses can:
1. Mark doctor visited
2. Add lab test requests
3. Add medication prescriptions
4. Mark patient as discharged
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

from app.database import get_db
from app.models.patient import Patient
from app.models.user import User, UserRole
from app.models.nurse import Nurse
from app.models.doctor import Doctor
from app.models.workflow import WorkflowLog, WorkflowStage, WorkflowStatus
from app.models.lab_report import LabReport, LabStatus
from app.models.billing import Medication, Bill, MedStatus
from app.core.dependencies import get_current_user, require_nurse

router = APIRouter()


class LabTestRequest(BaseModel):
    test_type: str
    notes: Optional[str] = None


class MedicationRequest(BaseModel):
    drug_name:  str
    dosage:     Optional[str] = None
    frequency:  Optional[str] = None
    duration:   Optional[str] = None
    notes:      Optional[str] = None
    price:      Optional[str] = "0"


class PrescribeMedicationBody(BaseModel):
    medications: List[MedicationRequest]


class MedicationOut(BaseModel):
    id:         int
    patient_id: int
    drug_name:  str
    dosage:     Optional[str] = None
    frequency:  Optional[str] = None
    duration:   Optional[str] = None
    notes:      Optional[str] = None
    price:      Optional[str] = None
    status:     str
    created_at: datetime

    class Config:
        from_attributes = True


def _get_nurse(user: User, db: Session) -> Optional[Nurse]:
    return db.query(Nurse).filter(Nurse.user_id == user.id).first()


def _get_patient(patient_code: str, db: Session) -> Patient:
    p = db.query(Patient).filter(Patient.patient_code == patient_code).first()
    if not p:
        raise HTTPException(404, f"Patient {patient_code} not found")
    return p


def _nurse_can_access(nurse: Nurse, patient: Patient) -> bool:
    return patient.doctor_id == nurse.doctor_id


# ── POST /nurse/mark-doctor-visited/{patient_code} ────────────────────────────
@router.post("/{patient_code}/mark-doctor-visited")
def mark_doctor_visited(
    patient_code: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_nurse),
):
    """Nurse marks that the doctor has visited the patient."""
    p = _get_patient(patient_code, db)
    nurse = _get_nurse(current_user, db)
    if nurse and not _nurse_can_access(nurse, p):
        raise HTTPException(403, "Not authorized for this patient")

    log = WorkflowLog(
        patient_id = p.id,
        stage      = WorkflowStage.DOCTOR,
        status     = WorkflowStatus.COMPLETED,
        updated_by = current_user.id,
        notes      = f"Doctor visit marked by Nurse {current_user.full_name}"
    )
    db.add(log)
    p.status = "DOCTOR_VISITED"
    db.commit()
    return {"message": "Doctor visit marked successfully"}


# ── POST /nurse/add-lab-tests/{patient_code} ─────────────────────────────────
@router.post("/{patient_code}/add-lab-tests")
def add_lab_tests(
    patient_code: str,
    tests: List[LabTestRequest],
    db: Session = Depends(get_db),
    current_user: User = Depends(require_nurse),
):
    """Nurse adds lab test requests for a patient."""
    p = _get_patient(patient_code, db)
    nurse = _get_nurse(current_user, db)
    if nurse and not _nurse_can_access(nurse, p):
        raise HTTPException(403, "Not authorized for this patient")

    # Find the doctor user_id
    doctor_user_id = current_user.id  # fallback to nurse
    if p.doctor and p.doctor.user_id:
        doctor_user_id = p.doctor.user_id

    # Auto-assign lab tech
    from app.models.user import UserRole as UR
    techs = db.query(User).filter(User.role == UR.LAB_TECHNICIAN).all()
    labtech_id = None
    if techs:
        labtech_id = min(
            techs,
            key=lambda t: len([lb for lb in t.lab_reports_assigned if lb.status != LabStatus.COMPLETED])
        ).id

    # Generate report codes
    existing_codes = db.query(LabReport.report_code).all()
    max_num = 0
    for (code,) in existing_codes:
        if code and code.startswith("LAB"):
            try:
                num = int(code[3:])
                if num > max_num: max_num = num
            except: pass

    added = []
    for i, t in enumerate(tests):
        max_num += 1
        code = f"LAB{max_num:03d}"
        report = LabReport(
            report_code = code,
            patient_id  = p.id,
            doctor_id   = doctor_user_id,
            labtech_id  = labtech_id,
            test_type   = t.test_type,
            status      = LabStatus.PENDING,
            notes       = t.notes,
        )
        db.add(report)
        added.append(code)

    # Workflow log
    log = WorkflowLog(
        patient_id = p.id,
        stage      = WorkflowStage.LAB,
        status     = WorkflowStatus.ASSIGNED,
        updated_by = current_user.id,
        notes      = f"Nurse added {len(added)} lab test(s): {', '.join([t.test_type for t in tests])}"
    )
    db.add(log)
    p.status = "LAB_PENDING"
    db.commit()
    return {"message": f"Added {len(added)} lab tests", "codes": added}


# ── POST /nurse/prescribe-medication/{patient_code} ──────────────────────────
@router.post("/{patient_code}/prescribe-medication")
def prescribe_medication(
    patient_code: str,
    body: PrescribeMedicationBody,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_nurse),
):
    """Nurse adds medication prescription → triggers pharmacy workflow."""
    p = _get_patient(patient_code, db)
    nurse = _get_nurse(current_user, db)
    if nurse and not _nurse_can_access(nurse, p):
        raise HTTPException(403, "Not authorized for this patient")

    doctor_user_id = current_user.id
    if p.doctor and p.doctor.user_id:
        doctor_user_id = p.doctor.user_id

    total_price = 0
    for m in body.medications:
        try:
            total_price += float(m.price or 0)
        except: pass
        med = Medication(
            patient_id = p.id,
            doctor_id  = doctor_user_id,
            drug_name  = m.drug_name,
            dosage     = m.dosage,
            frequency  = m.frequency,
            duration   = m.duration,
            notes      = m.notes,
            price      = m.price or "0",
            status     = MedStatus.PENDING,
        )
        db.add(med)

    # Pharmacy workflow log
    log = WorkflowLog(
        patient_id = p.id,
        stage      = WorkflowStage.PHARMACY,
        status     = WorkflowStatus.PENDING,
        updated_by = current_user.id,
        notes      = f"Nurse prescribed {len(body.medications)} medication(s). Awaiting pharmacy."
    )
    db.add(log)

    # Billing log too
    bill_log = WorkflowLog(
        patient_id = p.id,
        stage      = WorkflowStage.BILLING,
        status     = WorkflowStatus.PENDING,
        updated_by = current_user.id,
        notes      = f"Medication charges pending billing."
    )
    db.add(bill_log)

    p.status = "PHARMACY_PENDING"
    db.commit()
    return {"message": f"Prescribed {len(body.medications)} medications"}


# ── POST /nurse/discharge/{patient_code} ──────────────────────────────────────
@router.post("/{patient_code}/discharge")
def discharge_patient(
    patient_code: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_nurse),
):
    """Nurse marks patient as discharged."""
    p = _get_patient(patient_code, db)

    log = WorkflowLog(
        patient_id = p.id,
        stage      = WorkflowStage.DISCHARGE,
        status     = WorkflowStatus.COMPLETED,
        updated_by = current_user.id,
        notes      = f"Patient discharged by Nurse {current_user.full_name}. Visit complete."
    )
    db.add(log)
    p.status = "DISCHARGED"
    db.commit()
    return {"message": "Patient discharged successfully"}


# ── GET /nurse/medications/{patient_code} ────────────────────────────────────
@router.get("/{patient_code}/medications", response_model=List[MedicationOut])
def get_patient_medications(
    patient_code: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get medications for a patient — accessible by nurse, doctor, patient."""
    p = _get_patient(patient_code, db)
    meds = db.query(Medication).filter(Medication.patient_id == p.id).all()
    return meds
