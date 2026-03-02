"""
Pharmacy & Billing Router
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

from app.database import get_db
from app.models.patient import Patient
from app.models.billing import Medication, Bill, MedStatus
from app.models.user import User, UserRole
from app.models.workflow import WorkflowLog, WorkflowStage, WorkflowStatus
from app.models.lab_report import LabReport
from app.core.dependencies import get_current_user

router = APIRouter()


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


class PatientMedSummary(BaseModel):
    patient_id:   int
    patient_code: str
    patient_name: str
    priority:     str
    medications:  List[MedicationOut]
    all_dispensed: bool


class BillOut(BaseModel):
    id:           int
    patient_id:   int
    patient_code: str
    patient_name: str
    doctor_fee:   str
    lab_fee:      str
    medicine_fee: str
    total_fee:    str
    status:       str
    created_at:   datetime


# ── PHARMACY ──────────────────────────────────────────────────────────────────

@router.get("/pharmacy/patients", response_model=List[PatientMedSummary])
def get_pharmacy_patients(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Pharmacist sees all patients with pending/dispensed medications."""
    if current_user.role not in [UserRole.PHARMACIST, UserRole.SUPER_ADMIN, UserRole.NURSE]:
        raise HTTPException(403, "Pharmacist access required")

    meds = db.query(Medication).all()
    patient_map = {}
    for m in meds:
        pid = m.patient_id
        if pid not in patient_map:
            patient_map[pid] = []
        patient_map[pid].append(m)

    result = []
    for pid, med_list in patient_map.items():
        p = db.query(Patient).filter(Patient.id == pid).first()
        if not p: continue
        all_dispensed = all(m.status == MedStatus.DISPENSED for m in med_list)
        result.append(PatientMedSummary(
            patient_id=p.id,
            patient_code=p.patient_code,
            patient_name=p.name,
            priority=p.priority,
            medications=[MedicationOut.model_validate(m) for m in med_list],
            all_dispensed=all_dispensed,
        ))

    # Sort by priority: EMERGENCY first
    result.sort(key=lambda x: (0 if x.priority == "EMERGENCY" else 1))
    return result


@router.post("/pharmacy/dispense/{patient_code}")
def dispense_medications(
    patient_code: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Mark all medications for a patient as dispensed."""
    if current_user.role not in [UserRole.PHARMACIST, UserRole.SUPER_ADMIN]:
        raise HTTPException(403, "Pharmacist access required")

    p = db.query(Patient).filter(Patient.patient_code == patient_code).first()
    if not p: raise HTTPException(404, "Patient not found")

    meds = db.query(Medication).filter(Medication.patient_id == p.id).all()
    total_med_price = 0
    for m in meds:
        m.status = MedStatus.DISPENSED
        try: total_med_price += float(m.price or 0)
        except: pass

    # Update workflow
    log = WorkflowLog(
        patient_id = p.id,
        stage      = WorkflowStage.PHARMACY,
        status     = WorkflowStatus.COMPLETED,
        updated_by = current_user.id,
        notes      = f"Medications dispensed by Pharmacist. Total: ₹{total_med_price:.0f}"
    )
    db.add(log)

    # Create/update billing
    _create_or_update_bill(p, db, medicine_fee=str(int(total_med_price)))

    p.status = "BILLING_PENDING"
    db.commit()
    return {"message": "Medications dispensed. Bill created."}


# ── BILLING ───────────────────────────────────────────────────────────────────

@router.get("/billing/patients", response_model=List[BillOut])
def get_billing_patients(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Billing staff sees all patient bills."""
    if current_user.role not in [UserRole.BILLING, UserRole.SUPER_ADMIN]:
        raise HTTPException(403, "Billing access required")

    bills = db.query(Bill).all()
    result = []
    for b in bills:
        p = db.query(Patient).filter(Patient.id == b.patient_id).first()
        if not p: continue
        result.append(BillOut(
            id=b.id,
            patient_id=b.patient_id,
            patient_code=p.patient_code,
            patient_name=p.name,
            doctor_fee=b.doctor_fee,
            lab_fee=b.lab_fee,
            medicine_fee=b.medicine_fee,
            total_fee=b.total_fee,
            status=b.status,
            created_at=b.created_at,
        ))

    result.sort(key=lambda x: x.status)
    return result


@router.post("/billing/mark-paid/{patient_code}")
def mark_bill_paid(
    patient_code: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Billing marks a patient bill as PAID."""
    if current_user.role not in [UserRole.BILLING, UserRole.SUPER_ADMIN]:
        raise HTTPException(403, "Billing access required")

    p = db.query(Patient).filter(Patient.patient_code == patient_code).first()
    if not p: raise HTTPException(404, "Patient not found")

    bill = db.query(Bill).filter(Bill.patient_id == p.id).first()
    if not bill:
        raise HTTPException(404, "No bill found for this patient")

    bill.status = "PAID"
    bill.updated_at = datetime.utcnow()

    log = WorkflowLog(
        patient_id = p.id,
        stage      = WorkflowStage.BILLING,
        status     = WorkflowStatus.COMPLETED,
        updated_by = current_user.id,
        notes      = f"Bill of ₹{bill.total_fee} paid. Patient cleared for discharge."
    )
    db.add(log)
    p.status = "BILL_PAID"
    db.commit()
    return {"message": "Bill marked as paid"}


@router.get("/billing/patient/{patient_code}", response_model=BillOut)
def get_patient_bill(
    patient_code: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    p = db.query(Patient).filter(Patient.patient_code == patient_code).first()
    if not p: raise HTTPException(404, "Patient not found")

    bill = db.query(Bill).filter(Bill.patient_id == p.id).first()
    if not bill: raise HTTPException(404, "No bill found")

    return BillOut(
        id=bill.id,
        patient_id=bill.patient_id,
        patient_code=p.patient_code,
        patient_name=p.name,
        doctor_fee=bill.doctor_fee,
        lab_fee=bill.lab_fee,
        medicine_fee=bill.medicine_fee,
        total_fee=bill.total_fee,
        status=bill.status,
        created_at=bill.created_at,
    )


# ── helpers ───────────────────────────────────────────────────────────────────

def _create_or_update_bill(patient: Patient, db: Session, medicine_fee: str = "0"):
    """Create or update the patient's bill."""
    # Count lab tests
    lab_reports = db.query(LabReport).filter(LabReport.patient_id == patient.id).all()
    lab_fee = len(lab_reports) * 300  # ₹300 per test

    bill = db.query(Bill).filter(Bill.patient_id == patient.id).first()
    doctor_fee = 500
    med_fee = int(medicine_fee) if medicine_fee.isdigit() else 0
    total = doctor_fee + lab_fee + med_fee

    if bill:
        bill.lab_fee      = str(lab_fee)
        bill.medicine_fee = str(med_fee)
        bill.total_fee    = str(total)
        bill.updated_at   = datetime.utcnow()
    else:
        bill = Bill(
            patient_id   = patient.id,
            doctor_fee   = str(doctor_fee),
            lab_fee      = str(lab_fee),
            medicine_fee = str(med_fee),
            total_fee    = str(total),
            status       = "PENDING",
        )
        db.add(bill)

    return bill
