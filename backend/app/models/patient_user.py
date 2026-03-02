"""
PatientUser — links a User (role=PATIENT) to a Patient record.
Patients log in with patient_code as username / patient_code as default password.
"""
from sqlalchemy import Column, Integer, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base


class PatientUser(Base):
    __tablename__ = "patient_users"

    id         = Column(Integer, primary_key=True, index=True)
    user_id    = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    patient_id = Column(Integer, ForeignKey("patients.id"), unique=True, nullable=False)

    user    = relationship("User",    back_populates="patient_profile")
    patient = relationship("Patient", back_populates="patient_user")
