"""
Run: python seed.py
Seeds the database with Super Admin, 4 Doctors, 8 Nurses, and sample patients.
"""
import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

# Import in dependency order to avoid SQLAlchemy mapper errors
from app.database import SessionLocal, engine, Base
from app.models.user       import User, UserRole
from app.models.doctor     import Doctor
from app.models.nurse      import Nurse
from app.models.lab_report import LabReport
from app.models.patient    import Patient, generate_patient_code, detect_specialization
from app.core.security     import hash_password

Base.metadata.drop_all(bind=engine)
Base.metadata.create_all(bind=engine)
db = SessionLocal()


def create_user(email, password, name, role):
    u = User(email=email, hashed_password=hash_password(password), full_name=name, role=role)
    db.add(u); db.flush(); return u


def seed():
    print("🌱 Seeding MedFlow v3 database...")

    # ── Super Admin ───────────────────────────────────────────────────────────
    admin = create_user("admin@medflow.com", "admin123", "Super Admin", UserRole.SUPER_ADMIN)
    db.flush()

    # ── Doctors ───────────────────────────────────────────────────────────────
    DOCTORS = [
        ("dr.sharma@medflow.com",   "doc123", "Dr. Rajesh Sharma",    "CARDIOLOGIST",    "Cardiology Dept"),
        ("dr.patel@medflow.com",    "doc123", "Dr. Anita Patel",      "ORTHOPEDIC",      "Orthopedic Dept"),
        ("dr.krishna@medflow.com",  "doc123", "Dr. Krishna Iyer",     "NEUROLOGIST",     "Neurology Dept"),
        ("dr.gupta@medflow.com",    "doc123", "Dr. Meena Gupta",      "GENERAL",         "General Medicine"),
    ]
    doctors = []
    for email, pwd, name, spec, dept in DOCTORS:
        u = create_user(email, pwd, name, UserRole.DOCTOR)
        d = Doctor(user_id=u.id, specialization=spec, department=dept)
        db.add(d); db.flush(); doctors.append(d)
        print(f"  👨‍⚕️  {name} — {spec}")

    # ── Nurses (2 per doctor) ─────────────────────────────────────────────────
    NURSES = [
        ("nurse.priya@medflow.com",   "nurse123", "Nurse Priya",   0),
        ("nurse.kavya@medflow.com",   "nurse123", "Nurse Kavya",   0),
        ("nurse.sunita@medflow.com",  "nurse123", "Nurse Sunita",  1),
        ("nurse.rekha@medflow.com",   "nurse123", "Nurse Rekha",   1),
        ("nurse.deepa@medflow.com",   "nurse123", "Nurse Deepa",   2),
        ("nurse.anjali@medflow.com",  "nurse123", "Nurse Anjali",  2),
        ("nurse.pooja@medflow.com",   "nurse123", "Nurse Pooja",   3),
        ("nurse.sneha@medflow.com",   "nurse123", "Nurse Sneha",   3),
    ]
    for email, pwd, name, doc_idx in NURSES:
        u = create_user(email, pwd, name, UserRole.NURSE)
        db.add(Nurse(user_id=u.id, doctor_id=doctors[doc_idx].id))
        print(f"  👩‍⚕️  {name} → {DOCTORS[doc_idx][2]}")

    db.flush()

    # ── Lab Technician ────────────────────────────────────────────────────────
    create_user("lab@medflow.com", "lab123", "Lab Tech Priya", UserRole.LAB_TECHNICIAN)

    # ── Sample Patients ───────────────────────────────────────────────────────
    SAMPLE_PATIENTS = [
        {"name": "Arjun Sharma",  "age": 52, "gender": "Male",   "complaint": "Chest pain and shortness of breath", "priority": "EMERGENCY"},
        {"name": "Priya Mehta",   "age": 34, "gender": "Female", "complaint": "Knee fracture after accident",         "priority": "NORMAL"},
        {"name": "Ravi Nair",     "age": 45, "gender": "Male",   "complaint": "Severe headache and dizziness",       "priority": "NORMAL"},
        {"name": "Latha Iyer",    "age": 28, "gender": "Female", "complaint": "High fever and cough",                "priority": "NORMAL"},
        {"name": "Suresh Kumar",  "age": 60, "gender": "Male",   "complaint": "Cardiac palpitations",                "priority": "EMERGENCY"},
        {"name": "Ananya Rao",    "age": 15, "gender": "Female", "complaint": "Back pain spine issue",               "priority": "NORMAL"},
        {"name": "Mohan Verma",   "age": 38, "gender": "Male",   "complaint": "Migraine and stroke symptoms",        "priority": "EMERGENCY"},
        {"name": "Meena Das",     "age": 42, "gender": "Female", "complaint": "General weakness and fatigue",        "priority": "NORMAL"},
    ]

    statuses = ["PENDING", "IN_PROGRESS", "IN_PROGRESS", "COMPLETED", "PENDING", "IN_PROGRESS", "COMPLETED", "PENDING"]
    for i, p in enumerate(SAMPLE_PATIENTS):
        spec = detect_specialization(p["complaint"])
        matched = [d for d in doctors if d.specialization == spec]
        if not matched:
            matched = [d for d in doctors if d.specialization == "GENERAL"]
        doc = matched[0] if matched else None
        code = generate_patient_code(db)
        pat = Patient(
            patient_code=code, name=p["name"], age=p["age"],
            gender=p["gender"], complaint=p["complaint"],
            specialization_required=spec, priority=p["priority"],
            status=statuses[i], doctor_id=doc.id if doc else None,
            created_by=admin.id,
        )
        db.add(pat); db.flush()
        print(f"  🏥 {code} {p['name']} → {spec} ({doc.user.full_name if doc and doc.user else 'None'})")

    db.commit()

    print("\n✅ Database seeded!")
    print("\n📋 LOGIN CREDENTIALS:")
    print("  Super Admin  : admin@medflow.com       / admin123")
    print("  Cardiologist : dr.sharma@medflow.com   / doc123")
    print("  Orthopedic   : dr.patel@medflow.com    / doc123")
    print("  Neurologist  : dr.krishna@medflow.com  / doc123")
    print("  General Dr   : dr.gupta@medflow.com    / doc123")
    print("  Nurse (Card) : nurse.priya@medflow.com / nurse123")
    print("  Nurse (Card) : nurse.kavya@medflow.com / nurse123")
    print("  (all nurses password: nurse123)")
    print("  Lab Tech     : lab@medflow.com         / lab123")


if __name__ == "__main__":
    seed()
    db.close()
