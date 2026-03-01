"""
Ticket — patient query/complaint ticket with auto-routing.
Supports English AND Tamil keyword classification.
"""
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base


# ── Keyword → Department routing map (English + Tamil) ───────────────────────
TICKET_ROUTING_RULES = {
    "LAB": [
        # English
        "lab", "test", "report", "blood", "xray", "x-ray", "x ray",
        "sample", "urine", "scan", "mri", "ct scan", "culture", "delayed",
        "result", "pathology", "biopsy",
        # Tamil
        "ரத்த", "பரிசோதனை", "அறிக்கை", "ஆய்வு", "ஸ்கேன்",
        "தாமதம்", "தாமதமாகிறது", "மாதிரி", "சோதனை",
    ],
    "DOCTOR": [
        # English
        "doctor", "treatment", "medicine", "diagnosis", "prescription",
        "symptom", "pain", "fever", "check", "consult", "appointment",
        "medication", "drug", "therapy",
        # Tamil
        "மருத்துவர்", "சிகிச்சை", "மருந்து", "நோய்", "வலி",
        "காய்ச்சல்", "ஆலோசனை", "நோய்கண்டறிதல்",
    ],
    "BILLING": [
        # English
        "billing", "payment", "bill", "invoice", "charge", "fee",
        "insurance", "cost", "receipt", "refund",
        # Tamil
        "கட்டணம்", "பணம்", "பில்", "கட்டணரசீது", "காப்பீடு",
    ],
    "NURSE": [
        # English
        "discharge", "nurse", "ward", "bed", "admission", "dressing",
        "injection", "iv", "drip", "wound",
        # Tamil
        "விடுவிப்பு", "செவிலியர்", "படுக்கை",
    ],
}


def classify_ticket(query_text: str) -> str:
    """
    Rule-based department classification from query text.
    Supports both English and Tamil keywords.
    Returns department name: LAB | DOCTOR | BILLING | NURSE | GENERAL
    """
    text = (query_text or "").lower()
    scores = {dept: 0 for dept in TICKET_ROUTING_RULES}
    for dept, keywords in TICKET_ROUTING_RULES.items():
        for kw in keywords:
            if kw in text:
                scores[dept] += 1
    best = max(scores, key=scores.get)
    return best if scores[best] > 0 else "GENERAL"


class TicketStatus(str):
    OPEN        = "OPEN"
    IN_PROGRESS = "IN_PROGRESS"
    RESOLVED    = "RESOLVED"


class Ticket(Base):
    __tablename__ = "tickets"

    id          = Column(Integer, primary_key=True, index=True)
    ticket_code = Column(String, unique=True, index=True, nullable=False)
    patient_id  = Column(Integer, ForeignKey("patients.id"), nullable=False)
    query_text  = Column(Text, nullable=False)
    department  = Column(String, nullable=False)   # LAB / DOCTOR / BILLING / NURSE / GENERAL
    assigned_to = Column(Integer, ForeignKey("users.id"), nullable=True)
    status      = Column(String, default="OPEN")   # OPEN / IN_PROGRESS / RESOLVED
    notes       = Column(Text, nullable=True)
    created_at  = Column(DateTime, default=datetime.utcnow)
    resolved_at = Column(DateTime, nullable=True)
    resolved_by = Column(Integer, ForeignKey("users.id"), nullable=True)

    patient  = relationship("Patient", back_populates="tickets")
    assignee = relationship("User", foreign_keys=[assigned_to])
    resolver = relationship("User", foreign_keys=[resolved_by])


def generate_ticket_code(session) -> str:
    rows = session.query(Ticket.ticket_code).all()
    max_num = 0
    for (code,) in rows:
        if code and code.startswith("TKT"):
            try:
                num = int(code[3:])
                if num > max_num:
                    max_num = num
            except (ValueError, IndexError):
                pass
    return f"TKT{max_num + 1:03d}"
