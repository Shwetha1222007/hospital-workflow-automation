from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime
import uuid

from app.database import get_db
from app.models.billing import Invoice, PaymentStatus
from app.models.patient import Patient
from app.models.user import User, UserRole
from app.core.dependencies import get_current_user
from app.models.movement_log import log_movement, LogColor

router = APIRouter()

def require_billing(current_user: User = Depends(get_current_user)):
    if current_user.role != UserRole.BILLING:
        raise HTTPException(status_code=403, detail="Billing access required")
    return current_user

# ── Schemas ──────────────────────────────────────────────────────────────────

class InvoiceCreate(BaseModel):
    patient_id: int
    total_amount: float

class PaymentComplete(BaseModel):
    payment_method: str

class InvoiceOut(BaseModel):
    id: int
    invoice_code: str
    patient_id: int
    
    # Breakdown
    consultation_fee: float
    medicine_fee: float
    lab_fee: float
    
    total_amount: float
    payment_status: str
    payment_method: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# ── Endpoints ────────────────────────────────────────────────────────────────

@router.get("/", response_model=List[InvoiceOut])
def get_invoices(
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """View all invoices (Admin & Billing)"""
    q = db.query(Invoice)
    if status:
        q = q.filter(Invoice.payment_status == status.upper())
    return q.order_by(Invoice.created_at.desc()).all()


@router.post("/generate", response_model=InvoiceOut, status_code=201)
def generate_invoice(
    data: InvoiceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """System or Admin can generate an invoice for a patient."""
    code = f"INV-{uuid.uuid4().hex[:6].upper()}"
    inv = Invoice(
        invoice_code=code,
        patient_id=data.patient_id,
        total_amount=data.total_amount,
        payment_status=PaymentStatus.PENDING,
    )
    db.add(inv)
    db.commit()
    db.refresh(inv)
    return inv


class DischargeBillIn(BaseModel):
    patient_id: int

@router.post("/generate-discharge-bill", response_model=InvoiceOut)
def generate_discharge_bill(
    data: DischargeBillIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Nurse generates the final bill (Consultation + Labs) before sending to billing."""
    if current_user.role not in [UserRole.NURSE, UserRole.SUPER_ADMIN]:
        raise HTTPException(403, "Only nurses can send patients to billing")

    base_consultation_fee = 50.0  # $50 base doctor fee
    
    # Calculate Medicine cost ($15 per medication)
    from app.models.pharmacy import MedicinePrescription
    med_count = db.query(MedicinePrescription).filter(MedicinePrescription.patient_id == data.patient_id).count()
    med_cost = med_count * 15.0
    
    # Calculate Lab Test cost ($30 per test)
    from app.models.lab_report import LabReport
    lab_count = db.query(LabReport).filter(LabReport.patient_id == data.patient_id).count()
    lab_cost = lab_count * 30.0

    total_amount = base_consultation_fee + med_cost + lab_cost

    code = f"INV-{uuid.uuid4().hex[:6].upper()}"
    inv = Invoice(
        invoice_code=code,
        patient_id=data.patient_id,
        consultation_fee=base_consultation_fee,
        medicine_fee=med_cost,
        lab_fee=lab_cost,
        total_amount=total_amount,
        payment_status=PaymentStatus.PENDING,
    )
    db.add(inv)

    p = db.query(Patient).filter(Patient.id == data.patient_id).first()
    if p: p.status = "BILLING_PENDING"

    log_movement(
        db,
        patient_id   = data.patient_id,
        reference_id = inv.id,
        ref_type     = "BILLING",
        from_dept    = "NURSE",
        to_dept      = "BILLING",
        action       = f"💳 Sent to Billing (Consultation: ${base_consultation_fee}, Meds: ${med_cost}, Labs: ${lab_cost} | Total: ${total_amount})",
        updated_by   = current_user.id,
        status       = "PENDING",
        color_code   = LogColor.RED,
    )
    db.commit()
    db.refresh(inv)
    return inv


@router.patch("/{invoice_id}/pay", response_model=InvoiceOut)
def complete_payment(
    invoice_id: int,
    data: PaymentComplete,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_billing),
):
    """Billing Staff marks a bill as paid."""
    inv = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not inv:
        raise HTTPException(404, "Invoice not found")

    if inv.payment_status == PaymentStatus.COMPLETED:
        return inv

    inv.payment_status = PaymentStatus.COMPLETED
    inv.payment_method = data.payment_method
    inv.updated_at = datetime.utcnow()

    p = db.query(Patient).filter(Patient.id == inv.patient_id).first()
    if p: p.status = "DISCHARGE_PENDING"

    log_movement(
        db,
        patient_id   = inv.patient_id,
        reference_id = inv.id,
        ref_type     = "BILLING",
        from_dept    = "BILLING",
        to_dept      = "OUT",
        action       = f"✅ Payment of ₹{inv.total_amount} Received via {data.payment_method} — Awaiting Final Discharge",
        updated_by   = current_user.id,
        status       = "COMPLETED",
        color_code   = LogColor.GREEN,
    )
    
    # Final step: Treatment complete
    log_movement(
        db,
        patient_id   = inv.patient_id,
        reference_id = inv.patient_id,
        ref_type     = "PATIENT",
        from_dept    = "BILLING",
        to_dept      = "HOME",
        action       = "🏥 Patient Discharged. Treatment Complete.",
        updated_by   = current_user.id,
        status       = "COMPLETED",
        color_code   = LogColor.GREEN,
    )
    
    db.commit()
    db.refresh(inv)
    return inv

