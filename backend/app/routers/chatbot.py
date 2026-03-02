"""
Chatbot router — Groq-powered patient query assistant.
On AI failure: auto-creates a GENERAL support ticket instead of returning a static error.
"""
import os
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

from app.database import get_db
from app.models.user import User, UserRole
from app.models.patient import Patient
from app.models.patient_user import PatientUser
from app.models.ticket import Ticket, classify_ticket, generate_ticket_code
from app.models.movement_log import log_movement, LogColor
from app.core.dependencies import get_current_user

router = APIRouter()

import os

GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")
GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_MODEL   = "llama3-8b-8192"


# ── Schemas ──────────────────────────────────────────────────────────────────

class ChatMessage(BaseModel):
    message: str
    history: Optional[List[dict]] = []


class ChatResponse(BaseModel):
    reply:          str
    unresolved:     bool = False
    suggested_dept: Optional[str] = None
    # Populated when AI fails and auto-creates ticket
    auto_ticket_code: Optional[str] = None


class TicketEscalateRequest(BaseModel):
    query_text: str


class TicketEscalateResponse(BaseModel):
    ticket_code: str
    department:  str
    message:     str


# ── Helpers ──────────────────────────────────────────────────────────────────

def _get_patient_from_user(user: User, db: Session) -> Optional[Patient]:
    if user.role != UserRole.PATIENT:
        return None
    link = db.query(PatientUser).filter(PatientUser.user_id == user.id).first()
    return link.patient if link else None


def _build_system_prompt(patient: Optional[Patient]) -> str:
    if not patient:
        return (
            "You are MedBot, a friendly hospital assistant. "
            "Help patients with general hospital-related queries. "
            "If you cannot answer, reply starting with UNRESOLVED."
        )
    doc_name = "Not yet assigned"
    spec     = patient.specialization_required or "General"
    if patient.doctor and patient.doctor.user:
        doc_name = patient.doctor.user.full_name

    return (
        f"You are MedBot, a friendly hospital assistant for patient {patient.name} (ID: {patient.patient_code}).\n"
        f"Complaint: {patient.complaint or 'Not recorded'}\n"
        f"Department: {spec}\n"
        f"Assigned Doctor: {doc_name}\n"
        f"Treatment status: {patient.status}\n"
        f"Diagnosis: {patient.diagnosis or 'Pending'}\n"
        f"Treatment notes: {patient.treatment_notes or 'None yet'}\n\n"
        "Answer questions about treatment, lab tests, and hospital procedures. "
        "Be concise and empathetic. If you cannot answer the specific query, "
        "start your reply with UNRESOLVED so the system can auto-create a support ticket."
    )


def _auto_create_ticket(patient: Patient, query_text: str,
                        department: str, user: User, db: Session, note_prefix: str = "") -> str:
    """Creates a ticket and movement log. Returns ticket_code."""
    from app.models.doctor import Doctor
    assigned_to = None
    if department == "LAB":
        tech = db.query(User).filter(User.role == UserRole.LAB_TECHNICIAN).first()
        assigned_to = tech.id if tech else None
    elif department == "DOCTOR" and patient.doctor_id:
        doc = db.query(Doctor).filter(Doctor.id == patient.doctor_id).first()
        assigned_to = doc.user_id if doc else None
    elif department == "NURSE" and patient.doctor_id:
        from app.models.nurse import Nurse
        nurse = db.query(Nurse).filter(Nurse.doctor_id == patient.doctor_id).first()
        assigned_to = nurse.user_id if nurse else None
    else:
        admin = db.query(User).filter(User.role == UserRole.SUPER_ADMIN).first()
        assigned_to = admin.id if admin else None

    ticket = Ticket(
        ticket_code = generate_ticket_code(db),
        patient_id  = patient.id,
        query_text  = f"{note_prefix}{query_text}",
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
        from_dept    = "CHATBOT",
        to_dept      = department,
        action       = f"📩 Query auto-routed: \"{query_text[:60]}\" → {department}",
        updated_by   = user.id,
        status       = "PENDING",
        color_code   = LogColor.YELLOW,
    )
    db.commit()
    return ticket.ticket_code


async def _call_groq(system_prompt: str, history: List[dict], user_message: str) -> tuple[str, bool]:
    """
    Returns (reply_text, ai_failed).
    ai_failed=True means the Groq API was unreachable — caller should auto-create ticket.
    """
    try:
        import httpx
        messages = [{"role": "system", "content": system_prompt}]
        for turn in (history or []):
            if turn.get("role") in ("user", "assistant"):
                messages.append({"role": turn["role"], "content": turn["content"]})
        messages.append({"role": "user", "content": user_message})

        async with httpx.AsyncClient(timeout=25.0) as client:
            resp = await client.post(
                GROQ_API_URL,
                headers={
                    "Authorization": f"Bearer {GROQ_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": GROQ_MODEL,
                    "messages": messages,
                    "max_tokens": 512,
                    "temperature": 0.7,
                },
            )
            if resp.status_code != 200:
                return "", True   # AI failed
            data = resp.json()
            return data["choices"][0]["message"]["content"], False
    except Exception:
        return "", True           # AI failed


# ── POST /chat ────────────────────────────────────────────────────────────────

@router.post("/chat", response_model=ChatResponse)
async def chat(
    data: ChatMessage,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Patient sends a message → Groq AI responds.
    If AI is unavailable → auto-create ticket and return structured response.
    If AI replies UNRESOLVED → flag for manual ticket creation by patient.
    """
    patient = _get_patient_from_user(current_user, db)
    system_prompt = _build_system_prompt(patient)

    reply, ai_failed = await _call_groq(system_prompt, data.history or [], data.message)

    # ── AI failure: auto-create ticket silently ──────────────────────────────
    if ai_failed and patient:
        dept       = classify_ticket(data.message)
        ticket_code = _auto_create_ticket(
            patient, data.message, dept, current_user, db,
            note_prefix="[AI Unavailable — Auto-routed] "
        )
        return ChatResponse(
            reply=(
                f"⚠️ Our AI assistant is temporarily unavailable. "
                f"Your query has been automatically converted to ticket **{ticket_code}** "
                f"and routed to the **{dept}** department. "
                f"Our team will respond shortly."
            ),
            unresolved=False,
            suggested_dept=dept,
            auto_ticket_code=ticket_code,
        )

    if ai_failed and not patient:
        return ChatResponse(
            reply="⚠️ AI service is temporarily unavailable. Please try again in a moment.",
            unresolved=True,
            suggested_dept="GENERAL",
        )

    # ── Normal AI response ───────────────────────────────────────────────────
    unresolved = reply.strip().upper().startswith("UNRESOLVED")
    suggested  = classify_ticket(data.message) if unresolved else None

    return ChatResponse(
        reply=reply,
        unresolved=unresolved,
        suggested_dept=suggested,
    )


# ── POST /create-ticket — Manual escalation of unresolved chat ───────────────

@router.post("/create-ticket", response_model=TicketEscalateResponse, status_code=201)
def escalate_to_ticket(
    data: TicketEscalateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Patient manually escalates an UNRESOLVED chatbot reply to a support ticket."""
    if current_user.role != UserRole.PATIENT:
        raise HTTPException(403, "Only patients can use this endpoint")

    patient = _get_patient_from_user(current_user, db)
    if not patient:
        raise HTTPException(404, "Patient record not found")

    department  = classify_ticket(data.query_text)
    ticket_code = _auto_create_ticket(
        patient, data.query_text, department, current_user, db,
        note_prefix="[Via Chatbot] "
    )

    return TicketEscalateResponse(
        ticket_code = ticket_code,
        department  = department,
        message     = (
            f"Your query has been escalated as ticket {ticket_code} "
            f"and routed to the {department} department. Our team will respond shortly."
        ),
    )
