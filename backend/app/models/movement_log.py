"""
MovementLog — rich inter-department movement audit trail with color-coded status.
Records every transition: patient registered, doctor assigned, consultation done,
lab prescribed, lab in-progress, lab uploaded, ticket created, ticket assigned,
ticket resolved — all linked by patient_id for the patient timeline.
"""
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base


# ── Color constants (returned to frontend for dynamic status badges) ──────────
class LogColor:
    RED    = "RED"      # Pending / Waiting — action required
    GREEN  = "GREEN"    # Completed successfully
    YELLOW = "YELLOW"   # In Progress — work underway
    BLUE   = "BLUE"     # Assigned — responsibility handed over


class MovementLog(Base):
    __tablename__ = "movement_logs"

    id              = Column(Integer, primary_key=True, index=True)
    patient_id      = Column(Integer, ForeignKey("patients.id"), nullable=True, index=True)
    reference_id    = Column(Integer, nullable=False)   # patient_id OR ticket_id OR lab_report_id
    ref_type        = Column(String,  nullable=False)   # PATIENT | TICKET | LAB
    from_department = Column(String,  nullable=True)
    to_department   = Column(String,  nullable=False)
    action          = Column(String,  nullable=False)   # human-readable description
    status          = Column(String,  nullable=True, default="PENDING")  # PENDING / IN_PROGRESS / COMPLETED / ASSIGNED
    color_code      = Column(String,  nullable=True, default="YELLOW")   # RED / GREEN / YELLOW / BLUE
    timestamp       = Column(DateTime, default=datetime.utcnow)
    updated_by      = Column(Integer, ForeignKey("users.id"), nullable=False)

    actor   = relationship("User",    foreign_keys=[updated_by])
    patient = relationship("Patient", foreign_keys=[patient_id])


def log_movement(db, *, patient_id=None, reference_id: int, ref_type: str,
                 from_dept: str = None, to_dept: str, action: str,
                 updated_by: int, status: str = "IN_PROGRESS",
                 color_code: str = LogColor.YELLOW):
    """
    Create a movement log entry and flush (does NOT commit — caller must commit).

    Args:
        patient_id:   The patient this event belongs to (for timeline filtering).
        reference_id: The primary entity id (patient, ticket, or lab_report).
        ref_type:     'PATIENT' | 'TICKET' | 'LAB'
        from_dept:    Department/role the event came from.
        to_dept:      Department/role the event goes to.
        action:       Human-readable description shown in timeline.
        updated_by:   User who triggered this event.
        status:       PENDING | IN_PROGRESS | COMPLETED | ASSIGNED
        color_code:   RED | GREEN | YELLOW | BLUE
    """
    entry = MovementLog(
        patient_id      = patient_id,
        reference_id    = reference_id,
        ref_type        = ref_type,
        from_department = from_dept,
        to_department   = to_dept,
        action          = action,
        status          = status,
        color_code      = color_code,
        updated_by      = updated_by,
    )
    db.add(entry)
    db.flush()
    return entry
