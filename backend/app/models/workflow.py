from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum as SQLEnum, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from app.database import Base

class WorkflowStage(str, enum.Enum):
    REGISTRATION = "REGISTRATION"
    DOCTOR       = "DOCTOR"
    NURSE_CARE   = "NURSE_CARE"
    LAB          = "LAB"
    PHARMACY     = "PHARMACY"
    BILLING      = "BILLING"
    DISCHARGE    = "DISCHARGE"

class WorkflowStatus(str, enum.Enum):
    CREATED     = "CREATED"
    ASSIGNED    = "ASSIGNED"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED   = "COMPLETED"
    PENDING     = "PENDING"

class WorkflowLog(Base):
    __tablename__ = "workflow_logs"

    id               = Column(Integer, primary_key=True, index=True)
    patient_id       = Column(Integer, ForeignKey("patients.id"), nullable=False)
    stage            = Column(SQLEnum(WorkflowStage), nullable=False)
    status           = Column(SQLEnum(WorkflowStatus), nullable=False)
    assigned_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    updated_by       = Column(Integer, ForeignKey("users.id"), nullable=True)
    notes            = Column(String)
    is_late          = Column(Boolean, default=False)
    resolved         = Column(Boolean, default=False)
    timestamp        = Column(DateTime, default=datetime.utcnow)

    patient  = relationship("Patient", back_populates="workflow_logs")
    assigned = relationship("User", foreign_keys=[assigned_user_id])
    updator  = relationship("User", foreign_keys=[updated_by])
