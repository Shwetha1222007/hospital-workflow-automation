import sys, traceback
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
try:
    from app.database import SessionLocal, engine, Base
    print("DB OK")
    from app.models.user import User, UserRole
    print("User OK")
    from app.models.doctor import Doctor
    print("Doctor OK")
    from app.models.nurse import Nurse
    print("Nurse OK")
    from app.models.lab_report import LabReport
    print("LabReport OK")
    from app.models.department import Department, Workflow
    print("Department OK")
    from app.models.patient import Patient, generate_patient_code, detect_specialization
    print("Patient OK")
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    print("Schema OK")
    from app.core.security import hash_password
    db = SessionLocal()
    # Try creating super admin
    u = User(email="test@test.com", hashed_password=hash_password("test"), full_name="Test", role=UserRole.SUPER_ADMIN)
    db.add(u); db.flush()
    print(f"User created: {u.id}")
    d = Doctor(user_id=u.id, specialization="GENERAL", department="General")
    db.add(d); db.flush()
    print(f"Doctor created: {d.id}")
    db.rollback()
    print("All OK!")
except Exception:
    traceback.print_exc()
