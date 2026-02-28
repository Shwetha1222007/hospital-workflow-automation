from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from app.database import Base


class LabStatus(str, enum.Enum):
    PENDING = "PENDING"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"


class LabReport(Base):
    __tablename__ = "lab_reports"

    id           = Column(Integer, primary_key=True, index=True)
    report_code  = Column(String, unique=True, index=True)  # LAB001, LAB002 ...
    patient_id   = Column(Integer, ForeignKey("patients.id"), nullable=False)
    doctor_id    = Column(Integer, ForeignKey("users.id"),    nullable=False)   # prescribing doctor
    labtech_id   = Column(Integer, ForeignKey("users.id"),    nullable=True)    # assigned labtech
    test_type    = Column(String, nullable=False)   # e.g. Blood Test, X-Ray
    status       = Column(Enum(LabStatus), default=LabStatus.PENDING)
    file_path    = Column(String)                   # stored path on disk (report)
    file_type    = Column(String)                   # pdf / image
    notes        = Column(String)                   # doctor instructions or tech notes
    created_at   = Column(DateTime, default=datetime.utcnow)
    updated_at   = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    patient           = relationship("Patient", back_populates="lab_reports")
    prescribing_doctor = relationship("User", foreign_keys=[doctor_id])
    lab_technician     = relationship("User", foreign_keys=[labtech_id], back_populates="lab_reports_assigned")
