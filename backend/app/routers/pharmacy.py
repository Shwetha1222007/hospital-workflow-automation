from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime

from app.database import get_db
from app.models.pharmacy import MedicinePrescription, MedStatus
from app.models.patient import Patient
from app.models.user import User, UserRole
from app.core.dependencies import get_current_user
from app.models.movement_log import log_movement, LogColor

router = APIRouter()

def require_pharmacist(current_user: User = Depends(get_current_user)):
    if current_user.role != UserRole.PHARMACIST:
        raise HTTPException(status_code=403, detail="Pharmacist access required")
    return current_user

# ── Schemas ──────────────────────────────────────────────────────────────────

class PrescriptionCreate(BaseModel):
    patient_id: int
    medicine_name: str
    dosage: str
    duration: str
    instructions: Optional[str] = None

class PrescriptionOut(BaseModel):
    id: int
    patient_id: int
    doctor_id: int
    medicine_name: str
    dosage: str
    duration: str
    instructions: Optional[str]
    status: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# ── Endpoints ────────────────────────────────────────────────────────────────

@router.get("/", response_model=List[PrescriptionOut])
def get_prescriptions(
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Pharmacist sees ALL prescriptions.
    Doctor sees prescriptions they wrote.
    """
    q = db.query(MedicinePrescription)

    if current_user.role in [UserRole.DOCTOR, UserRole.NURSE]:
        q = q.filter(MedicinePrescription.doctor_id == current_user.id)
    # Pharmacist sees all

    if status:
        q = q.filter(MedicinePrescription.status == status.upper())

    return q.order_by(MedicinePrescription.created_at.desc()).all()


@router.post("/prescribe", response_model=List[PrescriptionOut], status_code=201)
def prescribe_medicines(
    requests: List[PrescriptionCreate],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Doctor or Nurse prescribes medicines."""
    if current_user.role not in [UserRole.DOCTOR, UserRole.NURSE]:
        raise HTTPException(403, "Only Doctors and Nurses can prescribe medicine")

    added = []
    patient_id = None
    
    for r in requests:
        patient_id = r.patient_id
        med = MedicinePrescription(
            patient_id    = r.patient_id,
            doctor_id     = current_user.id,
            medicine_name = r.medicine_name,
            dosage        = r.dosage,
            duration      = r.duration,
            instructions  = r.instructions,
            status        = MedStatus.PENDING,
        )
        db.add(med)
        added.append(med)
    
    db.commit()
    for m in added: db.refresh(m)

    # Log workflow transition — PHARMACY PENDING (RED)
    if patient_id and added:
        p = db.query(Patient).filter(Patient.id == patient_id).first()
        if p:
            p.status = "PHARMACY_PENDING"
            med_names = ", ".join(m.medicine_name for m in added)
            log_movement(
                db,
                patient_id   = patient_id,
                reference_id = added[0].id,
                ref_type     = "PHARMACY",
                from_dept    = "DOCTOR",
                to_dept      = "PHARMACY",
                action       = f"💊 Medicine Prescribed: {med_names} — awaiting pharmacy",
                updated_by   = current_user.id,
                status       = "PENDING",
                color_code   = LogColor.RED,
            )
            db.commit()

    return added


@router.patch("/{prescription_id}/dispense", response_model=PrescriptionOut)
def dispense_medicine(
    prescription_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_pharmacist),
):
    """Pharmacist marks a specific medicine as dispensed."""
    med = db.query(MedicinePrescription).filter(MedicinePrescription.id == prescription_id).first()
    if not med:
        raise HTTPException(404, "Prescription not found")

    if med.status == MedStatus.DISPENSED:
        return med

    med.status = MedStatus.DISPENSED
    med.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(med)

    # Check if all meds for this patient are dispensed
    remaining = db.query(MedicinePrescription).filter(
        MedicinePrescription.patient_id == med.patient_id,
        MedicinePrescription.status == MedStatus.PENDING
    ).count()

    p = db.query(Patient).filter(Patient.id == med.patient_id).first()

    if remaining == 0:
        if p: p.status = "BILLING_PENDING"
        
        log_movement(
            db,
            patient_id   = med.patient_id,
            reference_id = med.id,
            ref_type     = "PHARMACY",
            from_dept    = "PHARMACY",
            to_dept      = "BILLING",
            action       = "✅ All Medicines Dispensed. Sent to Billing.",
            updated_by   = current_user.id,
            status       = "COMPLETED",
            color_code   = LogColor.GREEN,
        )

        # Calculate dynamic billing amount
        base_consultation_fee = 50.0  # $50 base doctor fee
        
        # Calculate Medicine cost ($15 per medication)
        med_count = db.query(MedicinePrescription).filter(MedicinePrescription.patient_id == med.patient_id).count()
        med_cost = med_count * 15.0
        
        # Calculate Lab Test cost ($30 per test)
        from app.models.lab_report import LabReport
        lab_count = db.query(LabReport).filter(LabReport.patient_id == med.patient_id).count()
        lab_cost = lab_count * 30.0

        total_amount = base_consultation_fee + med_cost + lab_cost

        # Generate Invoice
        import uuid
        from app.models.billing import Invoice, PaymentStatus
        
        code = f"INV-{uuid.uuid4().hex[:6].upper()}"
        inv = Invoice(
            invoice_code=code,
            patient_id=med.patient_id,
            consultation_fee=base_consultation_fee,
            medicine_fee=med_cost,
            lab_fee=lab_cost,
            total_amount=total_amount,
            payment_status=PaymentStatus.PENDING,
        )
        db.add(inv)

        # Add the pending billing movement immediately so it shows RED awaiting billing
        log_movement(
            db,
            patient_id   = med.patient_id,
            reference_id = inv.id,
            ref_type     = "BILLING",
            from_dept    = "PHARMACY",
            to_dept      = "BILLING",
            action       = f"💳 Payment Pending (Consultation: ${base_consultation_fee}, Meds: ${med_cost}, Labs: ${lab_cost} | Total: ${total_amount})",
            updated_by   = current_user.id,
            status       = "PENDING",
            color_code   = LogColor.RED,
        )
        db.commit()

    return med

