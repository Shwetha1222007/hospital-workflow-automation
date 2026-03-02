from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.database import get_db
from app.core.security import decode_token
from app.models.user import User, UserRole

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/token")


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    payload = decode_token(token)
    if not payload:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid or expired token")
    try:
        user_id = int(payload.get("sub"))
    except (TypeError, ValueError):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid token payload")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(404, "User not found")
    return user


def require_role(*roles: UserRole):
    def checker(current_user: User = Depends(get_current_user)):
        if current_user.role not in roles:
            raise HTTPException(
                status.HTTP_403_FORBIDDEN,
                f"Access denied. Required: {[r.value for r in roles]}"
            )
        return current_user
    return checker


# Shorthand dependencies
def require_super_admin(u: User = Depends(get_current_user)):
    if u.role != UserRole.SUPER_ADMIN:
        raise HTTPException(403, "Super Admin access required")
    return u

def require_doctor(u: User = Depends(get_current_user)):
    if u.role not in [UserRole.DOCTOR, UserRole.SUPER_ADMIN]:
        raise HTTPException(403, "Doctor access required")
    return u

def require_nurse(u: User = Depends(get_current_user)):
    if u.role not in [UserRole.NURSE, UserRole.SUPER_ADMIN]:
        raise HTTPException(403, "Nurse access required")
    return u

def require_lab_tech(u: User = Depends(get_current_user)):
    if u.role not in [UserRole.LAB_TECHNICIAN, UserRole.SUPER_ADMIN]:
        raise HTTPException(403, "Lab Technician access required")
    return u

<<<<<<< HEAD
def require_pharmacist(u: User = Depends(get_current_user)):
    if u.role not in [UserRole.PHARMACIST, UserRole.SUPER_ADMIN]:
        raise HTTPException(403, "Pharmacist access required")
    return u

def require_billing(u: User = Depends(get_current_user)):
    if u.role not in [UserRole.BILLING, UserRole.SUPER_ADMIN]:
        raise HTTPException(403, "Billing access required")
=======
def require_patient(u: User = Depends(get_current_user)):
    if u.role not in [UserRole.PATIENT, UserRole.SUPER_ADMIN]:
        raise HTTPException(403, "Patient access required")
>>>>>>> aecf9119b8ddc74c35cc7495da6266856b19c72f
    return u
