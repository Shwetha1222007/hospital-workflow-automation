"""
Staff management router — Super Admin only.
Create / list doctors and nurses.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from app.database import get_db
from app.models.user import User, UserRole
from app.models.doctor import Doctor
from app.models.nurse import Nurse
from app.core.security import hash_password
from app.core.dependencies import require_super_admin

router = APIRouter()


# ── Schemas ──────────────────────────────────────────────────────────────────

class CreateDoctorRequest(BaseModel):
    email:          str
    password:       str
    full_name:      str
    specialization: str   # CARDIOLOGIST, ORTHOPEDIC, NEUROLOGIST, GENERAL, etc.
    department:     Optional[str] = None
    bio:            Optional[str] = None


class CreateNurseRequest(BaseModel):
    email:     str
    password:  str
    full_name: str
    doctor_id: int         # which doctor this nurse is assigned to


class DoctorOut(BaseModel):
    id:             int
    user_id:        int
    full_name:      str
    email:          str
    specialization: str
    department:     Optional[str] = None
    nurse_count:    int = 0
    patient_count:  int = 0

    class Config:
        from_attributes = True


class NurseOut(BaseModel):
    id:            int
    user_id:       int
    full_name:     str
    email:         str
    doctor_id:     int
    doctor_name:   Optional[str] = None
    doctor_spec:   Optional[str] = None

    class Config:
        from_attributes = True


# ── Doctors ───────────────────────────────────────────────────────────────────

@router.post("/doctors", response_model=DoctorOut)
def create_doctor(
    data: CreateDoctorRequest,
    db: Session = Depends(get_db),
    _: User = Depends(require_super_admin),
):
    if db.query(User).filter(User.email == data.email).first():
        raise HTTPException(400, "Email already registered")

    user = User(
        email=data.email,
        hashed_password=hash_password(data.password),
        full_name=data.full_name,
        role=UserRole.DOCTOR,
    )
    db.add(user)
    db.flush()

    doctor = Doctor(
        user_id=user.id,
        specialization=data.specialization.upper(),
        department=data.department or f"{data.specialization.title()} Department",
        bio=data.bio,
    )
    db.add(doctor)
    db.commit()
    db.refresh(doctor)

    return DoctorOut(
        id=doctor.id, user_id=user.id, full_name=user.full_name,
        email=user.email, specialization=doctor.specialization,
        department=doctor.department, nurse_count=0, patient_count=0
    )


@router.get("/doctors", response_model=List[DoctorOut])
def list_doctors(
    db: Session = Depends(get_db),
    _: User = Depends(require_super_admin),
):
    doctors = db.query(Doctor).all()
    result = []
    for d in doctors:
        result.append(DoctorOut(
            id=d.id, user_id=d.user_id,
            full_name=d.user.full_name if d.user else "",
            email=d.user.email if d.user else "",
            specialization=d.specialization,
            department=d.department,
            nurse_count=len(d.nurses),
            patient_count=len(d.patients),
        ))
    return result


# ── Nurses ────────────────────────────────────────────────────────────────────

@router.post("/nurses", response_model=NurseOut)
def create_nurse(
    data: CreateNurseRequest,
    db: Session = Depends(get_db),
    _: User = Depends(require_super_admin),
):
    doctor = db.query(Doctor).filter(Doctor.id == data.doctor_id).first()
    if not doctor:
        raise HTTPException(404, f"Doctor with id {data.doctor_id} not found")

    if db.query(User).filter(User.email == data.email).first():
        raise HTTPException(400, "Email already registered")

    user = User(
        email=data.email,
        hashed_password=hash_password(data.password),
        full_name=data.full_name,
        role=UserRole.NURSE,
    )
    db.add(user)
    db.flush()

    nurse = Nurse(user_id=user.id, doctor_id=data.doctor_id)
    db.add(nurse)
    db.commit()
    db.refresh(nurse)

    return NurseOut(
        id=nurse.id, user_id=user.id,
        full_name=user.full_name, email=user.email,
        doctor_id=nurse.doctor_id,
        doctor_name=doctor.user.full_name if doctor.user else "",
        doctor_spec=doctor.specialization,
    )


@router.get("/nurses", response_model=List[NurseOut])
def list_nurses(
    db: Session = Depends(get_db),
    _: User = Depends(require_super_admin),
):
    nurses = db.query(Nurse).all()
    result = []
    for n in nurses:
        result.append(NurseOut(
            id=n.id, user_id=n.user_id,
            full_name=n.user.full_name if n.user else "",
            email=n.user.email if n.user else "",
            doctor_id=n.doctor_id,
            doctor_name=n.doctor.user.full_name if n.doctor and n.doctor.user else "",
            doctor_spec=n.doctor.specialization if n.doctor else "",
        ))
    return result
