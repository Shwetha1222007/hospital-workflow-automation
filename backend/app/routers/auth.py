from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from app.database import get_db
from app.models.user import User, UserRole
from app.core.security import hash_password, verify_password, create_access_token
from app.core.dependencies import get_current_user

router = APIRouter()

STAFF_ROLES = {UserRole.SUPER_ADMIN, UserRole.DOCTOR, UserRole.NURSE, UserRole.LAB_TECHNICIAN}


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


@router.post("/register", response_model=TokenResponse)
def register(data: RegisterRequest, db: Session = Depends(get_db)):
    try:
        role = UserRole(data.role.upper())
    except ValueError:
        raise HTTPException(400, f"Invalid role. Choose from: {[r.value for r in UserRole]}")

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
    user = db.query(User).filter(User.email == form.username).first()
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
        extra["doctor_id"]      = current_user.nurse_profile.doctor_id
        extra["nurse_id"]       = current_user.nurse_profile.id
    return {
        "id": current_user.id, "email": current_user.email,
        "full_name": current_user.full_name, "role": current_user.role.value, **extra
    }
