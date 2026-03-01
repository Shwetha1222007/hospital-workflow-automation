from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship, Session
from datetime import datetime
from app.database import Base

# ── Keyword → specialization auto-assignment map ─────────────────────────────
KEYWORD_MAP = {
    "CARDIOLOGIST":    ["heart", "cardiac", "chest pain", "chest", "palpitation", "blood pressure", "bp", "angina", "coronary"],
    "ORTHOPEDIC":      ["bone", "fracture", "joint", "knee", "spine", "back pain", "shoulder", "hip", "wrist", "ankle", "ligament"],
    "NEUROLOGIST":     ["brain", "neuro", "headache", "migraine", "seizure", "stroke", "paralysis", "memory", "dizziness", "vertigo"],
    "PEDIATRICIAN":    ["child", "baby", "infant", "kid", "toddler", "neonatal", "pediatric"],
    "OPHTHALMOLOGIST": ["eye", "vision", "sight", "blind", "cataract", "glaucoma", "retina"],
    "DERMATOLOGIST":   ["skin", "rash", "acne", "eczema", "allergy", "itching", "psoriasis"],
    "PSYCHIATRIST":    ["mental", "anxiety", "depression", "stress", "schizophrenia", "bipolar", "panic", "insomnia"],
    "GENERAL":         ["fever", "cold", "flu", "cough", "throat", "viral", "infection", "general", "vomit", "nausea", "fatigue", "weakness"],
}


def detect_specialization(complaint: str) -> str:
    """Score each specialization based on keyword matches in the complaint."""
    comp = (complaint or "").lower()
    scores = {spec: 0 for spec in KEYWORD_MAP}
    for spec, keywords in KEYWORD_MAP.items():
        for kw in keywords:
            if kw in comp:
                scores[spec] += 1
    best = max(scores, key=scores.get)
    return best if scores[best] > 0 else "GENERAL"


class Patient(Base):
    __tablename__ = "patients"

    id                      = Column(Integer, primary_key=True, index=True)
    patient_code            = Column(String, unique=True, index=True, nullable=False)
    name                    = Column(String, nullable=False)
    age                     = Column(Integer)
    gender                  = Column(String)
    phone                   = Column(String)
    complaint               = Column(String)
    specialization_required = Column(String)   # auto-detected from complaint
    priority                = Column(String, default="NORMAL")   # NORMAL / EMERGENCY
    status                  = Column(String, default="PENDING")  # PENDING / IN_PROGRESS / COMPLETED
    doctor_id               = Column(Integer, ForeignKey("doctors.id"), nullable=True)
    diagnosis               = Column(String)        # set by Doctor
    treatment_notes         = Column(String)        # set by Doctor
    created_by              = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at              = Column(DateTime, default=datetime.utcnow)
    updated_at              = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    doctor        = relationship("Doctor", back_populates="patients")
    lab_reports   = relationship("LabReport", back_populates="patient")
    workflow_logs = relationship("WorkflowLog", back_populates="patient", cascade="all, delete-orphan")
    tickets       = relationship("Ticket", back_populates="patient", cascade="all, delete-orphan")
    patient_user  = relationship("PatientUser", back_populates="patient", uselist=False, cascade="all, delete-orphan")


def generate_patient_code(session: Session) -> str:
    rows = session.query(Patient.patient_code).all()
    max_num = 0
    for (code,) in rows:
        if code and code.startswith("PAT"):
            try:
                num = int(code[3:])
                if num > max_num:
                    max_num = num
            except (ValueError, IndexError):
                pass
    return f"PAT{max_num + 1:03d}"
