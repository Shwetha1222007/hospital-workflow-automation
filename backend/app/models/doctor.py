from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base


SPECIALIZATIONS = [
    "CARDIOLOGIST",
    "ORTHOPEDIC",
    "NEUROLOGIST",
    "GENERAL",
    "PEDIATRICIAN",
    "OPHTHALMOLOGIST",
    "DERMATOLOGIST",
    "PSYCHIATRIST",
]


class Doctor(Base):
    __tablename__ = "doctors"

    id             = Column(Integer, primary_key=True, index=True)
    user_id        = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    specialization = Column(String, nullable=False)   # e.g. CARDIOLOGIST
    department     = Column(String)                   # e.g. Cardiology Dept
    bio            = Column(String)
    created_at     = Column(DateTime, default=datetime.utcnow)

    user     = relationship("User",    back_populates="doctor_profile")
    nurses   = relationship("Nurse",   back_populates="doctor")
    patients = relationship("Patient", back_populates="doctor")
