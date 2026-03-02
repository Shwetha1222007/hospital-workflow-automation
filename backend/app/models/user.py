from sqlalchemy import Column, Integer, String, DateTime, Enum
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from app.database import Base


class UserRole(str, enum.Enum):
    SUPER_ADMIN     = "SUPER_ADMIN"
    DOCTOR          = "DOCTOR"
    NURSE           = "NURSE"
    LAB_TECHNICIAN  = "LAB_TECHNICIAN"
    PHARMACIST      = "PHARMACIST"
    BILLING         = "BILLING"
    PATIENT         = "PATIENT"


class User(Base):
    __tablename__ = "users"

    id              = Column(Integer, primary_key=True, index=True)
    email           = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name       = Column(String, nullable=False)
    role            = Column(Enum(UserRole), nullable=False)
    is_active       = Column(String, default="true")
    created_at      = Column(DateTime, default=datetime.utcnow)

    doctor_profile          = relationship("Doctor", back_populates="user", uselist=False)
    nurse_profile           = relationship("Nurse",  back_populates="user", uselist=False)
    patient_profile         = relationship("PatientUser", back_populates="user", uselist=False)
    lab_reports_assigned    = relationship("LabReport", foreign_keys="LabReport.labtech_id", back_populates="lab_technician")
    lab_reports_prescribed  = relationship("LabReport", foreign_keys="LabReport.doctor_id",  back_populates="prescribing_doctor")
