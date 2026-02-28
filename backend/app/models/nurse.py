from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base


class Nurse(Base):
    __tablename__ = "nurses"

    id         = Column(Integer, primary_key=True, index=True)
    user_id    = Column(Integer, ForeignKey("users.id"),   unique=True, nullable=False)
    doctor_id  = Column(Integer, ForeignKey("doctors.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    user   = relationship("User",   back_populates="nurse_profile")
    doctor = relationship("Doctor", back_populates="nurses")
