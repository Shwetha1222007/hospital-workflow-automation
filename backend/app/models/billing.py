from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from app.database import Base


class PaymentStatus(str, enum.Enum):
    PENDING   = "PENDING"
    COMPLETED = "COMPLETED"


class Invoice(Base):
    __tablename__ = "invoices"

    id           = Column(Integer, primary_key=True, index=True)
    invoice_code = Column(String, unique=True, index=True, nullable=False)
    patient_id   = Column(Integer, ForeignKey("patients.id"), nullable=False)
    
    # Itemized Breakdown
    consultation_fee = Column(Float, default=0.0)
    medicine_fee     = Column(Float, default=0.0)
    lab_fee          = Column(Float, default=0.0)

    total_amount   = Column(Float, nullable=False)
    payment_status = Column(Enum(PaymentStatus), default=PaymentStatus.PENDING)
    payment_method = Column(String)  # Cash, Card, UPI
    created_at     = Column(DateTime, default=datetime.utcnow)
    updated_at     = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    patient = relationship("Patient", back_populates="invoices")

