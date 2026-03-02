"""
Seed script — run once to create all demo staff accounts.
Usage from backend folder: python seed_demo.py
"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))

from app.database import SessionLocal
from app.models.user import User, UserRole
from app.models.doctor import Doctor
from app.models.nurse import Nurse
from app.core.security import hash_password

db = SessionLocal()

def ensure_user(email, password, full_name, role):
    u = db.query(User).filter(User.email == email).first()
    if not u:
        u = User(email=email, hashed_password=hash_password(password),
                 full_name=full_name, role=role)
        db.add(u)
        db.flush()
        print(f"  Created {role.value}: {email}")
    else:
        print(f"  Already exists: {email}")
    return u

print("\n🌱 Seeding demo accounts...")

# Admin
admin = ensure_user("admin@medflow.com", "admin123", "Admin MedFlow", UserRole.SUPER_ADMIN)

# Doctor
doc_user = ensure_user("dr.sharma@medflow.com", "doc123", "Dr. Arun Sharma", UserRole.DOCTOR)
doc = db.query(Doctor).filter(Doctor.user_id == doc_user.id).first()
if not doc:
    doc = Doctor(user_id=doc_user.id, specialization="GENERAL", department="General Medicine")
    db.add(doc)
    db.flush()
    print(f"  Created Doctor profile for Dr. Arun Sharma (GENERAL)")

# Nurse
nurse_user = ensure_user("nurse.priya@medflow.com", "nurse123", "Nurse Priya Patel", UserRole.NURSE)
nurse = db.query(Nurse).filter(Nurse.user_id == nurse_user.id).first()
if not nurse and doc:
    nurse = Nurse(user_id=nurse_user.id, doctor_id=doc.id)
    db.add(nurse)
    db.flush()
    print(f"  Created Nurse profile for Nurse Priya Patel (assigned to Dr. Sharma)")

# Lab Tech
ensure_user("lab@medflow.com", "lab123", "Lab Tech Ravi", UserRole.LAB_TECHNICIAN)

# Pharmacist
ensure_user("pharmacy@medflow.com", "pharmacy123", "Pharmacist Meera", UserRole.PHARMACIST)

# Billing
ensure_user("billing@medflow.com", "billing123", "Billing Officer Sanjay", UserRole.BILLING)

db.commit()
db.close()
print("\n✅ Seeding complete!\n")
print("Demo Credentials:")
print("  Admin:     admin@medflow.com / admin123")
print("  Doctor:    dr.sharma@medflow.com / doc123")
print("  Nurse:     nurse.priya@medflow.com / nurse123")
print("  Lab Tech:  lab@medflow.com / lab123")
print("  Pharmacy:  pharmacy@medflow.com / pharmacy123")
print("  Billing:   billing@medflow.com / billing123")
