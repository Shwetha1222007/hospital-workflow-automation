"""
Tickets router — patient query/complaint ticket system with auto-routing.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

from app.database import get_db
from app.models.user import User, UserRole
from app.models.ticket import Ticket, classify_ticket, generate_ticket_code
from app.models.patient import Patient
from app.models.patient_user import PatientUser
from app.models.doctor import Doctor
from app.models.movement_log import MovementLog, log_movement, LogColor
from app.core.dependencies import get_current_user, require_super_admin

router = APIRouter()


# ── Schemas ──────────────────────────────────────────────────────────────────

class TicketCreate(BaseModel):
    query_text: str


class TicketStatusUpdate(BaseModel):
    status: Optional[str] = None  # Optional for resolve shortcut
    notes:  Optional[str] = None


class TicketOut(BaseModel):
    id:          int
    ticket_code: str
    patient_id:  int
    query_text:  str
    department:  str
    assigned_to: Optional[int] = None
    assignee_name: Optional[str] = None
    status:      str
    notes:       Optional[str] = None
    created_at:  datetime
    resolved_at: Optional[datetime] = None
    resolved_by: Optional[int] = None

    class Config:
        from_attributes = True


def _enrich_ticket(t: Ticket) -> TicketOut:
    out = TicketOut.model_validate(t)
    if t.assignee:
        out.assignee_name = t.assignee.full_name
    return out


def _get_patient_from_user(user: User, db: Session) -> Optional[Patient]:
    """Returns the Patient linked to a PATIENT-role user."""
    if user.role != UserRole.PATIENT:
        return None
    link = db.query(PatientUser).filter(PatientUser.user_id == user.id).first()
    return link.patient if link else None


def _auto_assign(department: str, patient: Patient, db: Session) -> Optional[int]:
    """Pick the best user to assign based on department."""
    if department == "LAB":
        tech = db.query(User).filter(User.role == UserRole.LAB_TECHNICIAN).first()
        return tech.id if tech else None
    if department == "DOCTOR" and patient.doctor_id:
        doc = db.query(Doctor).filter(Doctor.id == patient.doctor_id).first()
        return doc.user_id if doc else None
    if department == "BILLING":
        admin = db.query(User).filter(User.role == UserRole.SUPER_ADMIN).first()
        return admin.id if admin else None
    # GENERAL → admin
    admin = db.query(User).filter(User.role == UserRole.SUPER_ADMIN).first()
    return admin.id if admin else None


# ── POST / — Patient creates a ticket ────────────────────────────────────────

@router.post("/", response_model=TicketOut, status_code=201)
def create_ticket(
    data: TicketCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Patient OR staff creates a ticket/query."""
    # Resolve patient
    if current_user.role == UserRole.PATIENT:
        patient = _get_patient_from_user(current_user, db)
        if not patient:
            raise HTTPException(404, "Patient record not linked to your account")
    else:
        raise HTTPException(403, "Only patients can raise tickets directly. Staff can use admin endpoint.")

    department  = classify_ticket(data.query_text)
    assigned_to = _auto_assign(department, patient, db)

    ticket = Ticket(
        ticket_code = generate_ticket_code(db),
        patient_id  = patient.id,
        query_text  = data.query_text,
        department  = department,
        assigned_to = assigned_to,
        status      = "OPEN",
    )
    db.add(ticket)
    db.flush()

    # Movement log: ticket created (YELLOW=open/in-progress)
    log_movement(
        db,
        patient_id   = patient.id,
        reference_id = ticket.id,
        ref_type     = "TICKET",
        from_dept    = "PATIENT",
        to_dept      = department,
        action       = f"📩 Query created: “{data.query_text[:60]}” → routed to {department}",
        updated_by   = current_user.id,
        status       = "PENDING",
        color_code   = LogColor.YELLOW,
    )
    db.commit()
    db.refresh(ticket)
    return _enrich_ticket(ticket)


# ── POST /admin — Staff/Admin creates a ticket for a patient ─────────────────

@router.post("/admin", response_model=TicketOut, status_code=201)
def admin_create_ticket(
    patient_id: int,
    data: TicketCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Admin or doctor creates a ticket on behalf of a patient."""
    if current_user.role not in [UserRole.SUPER_ADMIN, UserRole.DOCTOR, UserRole.NURSE]:
        raise HTTPException(403, "Only staff can use this endpoint")

    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(404, f"Patient id {patient_id} not found")

    department  = classify_ticket(data.query_text)
    assigned_to = _auto_assign(department, patient, db)

    ticket = Ticket(
        ticket_code = generate_ticket_code(db),
        patient_id  = patient.id,
        query_text  = data.query_text,
        department  = department,
        assigned_to = assigned_to,
        status      = "OPEN",
    )
    db.add(ticket)
    db.flush()

    log_movement(
        db,
        patient_id   = patient.id,
        reference_id = ticket.id,
        ref_type     = "TICKET",
        from_dept    = "STAFF",
        to_dept      = department,
        action       = f"📩 Ticket {ticket.ticket_code} created by staff → routed to {department}",
        updated_by   = current_user.id,
        status       = "PENDING",
        color_code   = LogColor.YELLOW,
    )
    db.commit()
    db.refresh(ticket)
    return _enrich_ticket(ticket)


# ── GET / — Filtered by role ──────────────────────────────────────────────────

@router.get("/", response_model=List[TicketOut])
def get_tickets(
    status:     Optional[str] = None,
    department: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(Ticket)

    if current_user.role == UserRole.PATIENT:
        patient = _get_patient_from_user(current_user, db)
        if not patient:
            return []
        q = q.filter(Ticket.patient_id == patient.id)

    elif current_user.role in [UserRole.DOCTOR, UserRole.LAB_TECHNICIAN, UserRole.NURSE]:
        # Show tickets assigned to current user
        q = q.filter(Ticket.assigned_to == current_user.id)

    # Admin sees all
    if status:
        q = q.filter(Ticket.status == status.upper())
    if department:
        q = q.filter(Ticket.department == department.upper())

    return [_enrich_ticket(t) for t in q.order_by(Ticket.created_at.desc()).all()]


# ── GET /my — Patient's own tickets ──────────────────────────────────────────

@router.get("/my", response_model=List[TicketOut])
def get_my_tickets(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != UserRole.PATIENT:
        raise HTTPException(403, "Patient access only")
    patient = _get_patient_from_user(current_user, db)
    if not patient:
        return []
    tickets = (
        db.query(Ticket)
        .filter(Ticket.patient_id == patient.id)
        .order_by(Ticket.created_at.desc())
        .all()
    )
    return [_enrich_ticket(t) for t in tickets]


# ── PATCH /{id}/status — Doctor/LabTech updates status ───────────────────────

@router.patch("/{ticket_id}/status", response_model=TicketOut)
def update_ticket_status(
    ticket_id: int,
    data: TicketStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(404, "Ticket not found")

    allowed_roles = [UserRole.SUPER_ADMIN, UserRole.DOCTOR, UserRole.LAB_TECHNICIAN, UserRole.NURSE]
    if current_user.role not in allowed_roles:
        raise HTTPException(403, "Not authorized to update ticket status")

    if not data.status:
        raise HTTPException(400, "Status is required for this endpoint")
    new_status = data.status.upper()
    if new_status not in ["OPEN", "IN_PROGRESS", "RESOLVED"]:
        raise HTTPException(400, "Invalid status. Use: OPEN, IN_PROGRESS, RESOLVED")

    old_status  = ticket.status
    ticket.status = new_status
    if data.notes:
        ticket.notes = data.notes

    if new_status == "RESOLVED":
        ticket.resolved_at = datetime.utcnow()
        ticket.resolved_by = current_user.id

    log_movement(
        db,
        patient_id   = ticket.patient_id,
        reference_id = ticket.id,
        ref_type     = "TICKET",
        from_dept    = ticket.department,
        to_dept      = ticket.department,
        action       = f"🔄 Ticket {ticket.ticket_code}: {old_status} → {new_status}",
        updated_by   = current_user.id,
        status       = new_status,
        color_code   = LogColor.GREEN if new_status == "RESOLVED" else LogColor.BLUE,
    )
    db.commit()
    db.refresh(ticket)
    return _enrich_ticket(ticket)


# ── PATCH /{id}/resolve — Shortcut resolve ────────────────────────────────────

@router.patch("/{ticket_id}/resolve", response_model=TicketOut)
def resolve_ticket(
    ticket_id: int,
    data: TicketStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(404, "Ticket not found")

    allowed_roles = [UserRole.SUPER_ADMIN, UserRole.DOCTOR, UserRole.LAB_TECHNICIAN, UserRole.NURSE]
    if current_user.role not in allowed_roles:
        raise HTTPException(403, "Not authorized")

    ticket.status      = "RESOLVED"
    ticket.resolved_at = datetime.utcnow()
    ticket.resolved_by = current_user.id
    if data.notes:
        ticket.notes   = data.notes

    log_movement(
        db,
        patient_id   = ticket.patient_id,
        reference_id = ticket.id,
        ref_type     = "TICKET",
        from_dept    = ticket.department,
        to_dept      = "RESOLVED",
        action       = f"✅ Query resolved: {ticket.ticket_code} — {current_user.full_name}",
        updated_by   = current_user.id,
        status       = "RESOLVED",
        color_code   = LogColor.GREEN,
    )
    db.commit()
    db.refresh(ticket)
    return _enrich_ticket(ticket)
