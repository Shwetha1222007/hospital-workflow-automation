from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from app.database import Base


class MedStatus(str, enum.Enum):
    PENDING   = "PENDING"
    DISPENSED = "DISPENSED"


class Medication(Base):
    """Medications prescribed by a doctor for a patient — fulfilled by Pharmacy."""
    __tablename__ = "medications"

    id          = Column(Integer, primary_key=True, index=True)
    patient_id  = Column(Integer, ForeignKey("patients.id"), nullable=False)
    doctor_id   = Column(Integer, ForeignKey("users.id"),    nullable=False)  # prescribing doctor user id
    drug_name   = Column(String, nullable=False)
    dosage      = Column(String)          # e.g. "500mg"
    frequency   = Column(String)          # e.g. "Twice daily"
    duration    = Column(String)          # e.g. "5 days"
    notes       = Column(String)
    status      = Column(Enum(MedStatus), default=MedStatus.PENDING)
    price       = Column(String, default="0")
    created_at  = Column(DateTime, default=datetime.utcnow)
    updated_at  = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    patient = relationship("Patient", back_populates="medications")
    doctor  = relationship("User", foreign_keys=[doctor_id])


class Bill(Base):
    """Consolidated billing record for a patient's hospital visit."""
    __tablename__ = "bills"

    id              = Column(Integer, primary_key=True, index=True)
    patient_id      = Column(Integer, ForeignKey("patients.id"), nullable=False, unique=True)
    doctor_fee      = Column(String, default="500")
    lab_fee         = Column(String, default="0")
    medicine_fee    = Column(String, default="0")
    total_fee       = Column(String, default="0")
    status          = Column(String, default="PENDING")   # PENDING / PAID
    created_at      = Column(DateTime, default=datetime.utcnow)
    updated_at      = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    patient = relationship("Patient", back_populates="bill")
