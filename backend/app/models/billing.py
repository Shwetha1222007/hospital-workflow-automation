<<<<<<< HEAD
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum, Boolean
=======
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Enum
>>>>>>> aecf9119b8ddc74c35cc7495da6266856b19c72f
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from app.database import Base


<<<<<<< HEAD
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
=======
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

>>>>>>> aecf9119b8ddc74c35cc7495da6266856b19c72f
