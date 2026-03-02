from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from app.database import Base


class MedStatus(str, enum.Enum):
    PENDING   = "PENDING"
    DISPENSED = "DISPENSED"


class MedicinePrescription(Base):
    __tablename__ = "medicine_prescriptions"

    id           = Column(Integer, primary_key=True, index=True)
    patient_id   = Column(Integer, ForeignKey("patients.id"), nullable=False)
    doctor_id    = Column(Integer, ForeignKey("users.id"),    nullable=False)
    medicine_name = Column(String, nullable=False)
    dosage       = Column(String, nullable=False)
    duration     = Column(String, nullable=False)
    instructions = Column(String)
    status       = Column(Enum(MedStatus), default=MedStatus.PENDING)
    created_at   = Column(DateTime, default=datetime.utcnow)
    updated_at   = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    patient           = relationship("Patient", back_populates="medicines")
    prescribing_doctor = relationship("User", foreign_keys=[doctor_id])

