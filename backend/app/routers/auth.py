from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from app.database import get_db
from app.models.user import User, UserRole
from app.models.patient_user import PatientUser
from app.core.security import hash_password, verify_password, create_access_token
from app.core.dependencies import get_current_user

router = APIRouter()


class RegisterRequest(BaseModel):
    email:     str
    password:  str
    full_name: str
    role:      str = "DOCTOR"


class TokenResponse(BaseModel):
    access_token: str
    token_type:   str
    role:         str
    full_name:    str
    user_id:      int
    email:        Optional[str] = None
    patient_code: Optional[str] = None


@router.post("/register", response_model=TokenResponse)
def register(data: RegisterRequest, db: Session = Depends(get_db)):
    try:
        role = UserRole(data.role.upper())
    except ValueError:
        raise HTTPException(400, f"Invalid role. Choose from: {[r.value for r in UserRole]}")

    # Patients cannot self-register; only SUPER_ADMIN creates them
    if role == UserRole.PATIENT:
        raise HTTPException(400, "Patient accounts are created by Admin only")

    if db.query(User).filter(User.email == data.email).first():
        raise HTTPException(400, "Email already registered")

    user = User(
        email=data.email,
        hashed_password=hash_password(data.password),
        full_name=data.full_name,
        role=role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token({"sub": str(user.id), "role": role.value, "email": user.email})
    return TokenResponse(access_token=token, token_type="bearer", role=role.value,
                         full_name=user.full_name, user_id=user.id, email=user.email)


@router.post("/token", response_model=TokenResponse)
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """
    Supports both:
    - Staff login: username = email
    - Patient login: username = patient_code (e.g. PAT001)
    """
    username = form.username.strip()

    # Try patient login first (username looks like a patient code)
    if username.upper().startswith("PAT"):
        pat_user_link = (
            db.query(PatientUser)
            .join(PatientUser.user)
            .filter(User.email == username.upper())
            .first()
        )
        # Also try via patient_code on the patient side
        if not pat_user_link:
            from app.models.patient import Patient
            patient = db.query(Patient).filter(Patient.patient_code == username.upper()).first()
            if patient and patient.patient_user:
                pat_user_link = patient.patient_user

        if pat_user_link:
            user = pat_user_link.user
            if not verify_password(form.password, user.hashed_password):
                raise HTTPException(401, "Invalid Patient ID or password")
            token = create_access_token({
                "sub": str(user.id), "role": user.role.value,
                "patient_code": username.upper()
            })
            patient_code = pat_user_link.patient.patient_code if pat_user_link.patient else None
            return TokenResponse(
                access_token=token, token_type="bearer",
                role=user.role.value, full_name=user.full_name,
                user_id=user.id, patient_code=patient_code
            )

    # Staff login: use email
    user = db.query(User).filter(User.email == username).first()
    if not user or not verify_password(form.password, user.hashed_password):
        raise HTTPException(401, "Invalid email or password")

    token = create_access_token({"sub": str(user.id), "role": user.role.value, "email": user.email})
    return TokenResponse(access_token=token, token_type="bearer", role=user.role.value,
                         full_name=user.full_name, user_id=user.id, email=user.email)


@router.get("/me")
def get_me(current_user: User = Depends(get_current_user)):
    extra = {}
    if current_user.doctor_profile:
        extra["specialization"] = current_user.doctor_profile.specialization
        extra["doctor_id"]      = current_user.doctor_profile.id
    if current_user.nurse_profile:
        extra["doctor_id"] = current_user.nurse_profile.doctor_id
        extra["nurse_id"]  = current_user.nurse_profile.id
    if current_user.patient_profile:
        extra["patient_id"]   = current_user.patient_profile.patient_id
        extra["patient_code"] = current_user.patient_profile.patient.patient_code if current_user.patient_profile.patient else None
    return {
        "id": current_user.id, "email": current_user.email,
        "full_name": current_user.full_name, "role": current_user.role.value, **extra
    }
