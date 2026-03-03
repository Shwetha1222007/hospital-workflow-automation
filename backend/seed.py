"""
Run: python seed.py
Seeds the database with Super Admin, 4 Doctors, 8 Nurses, Lab Tech,
8 Sample Patients (each with a Patient login account), and sample tickets.
"""
import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

# Import in dependency order to avoid SQLAlchemy mapper errors
from app.database import SessionLocal, engine, Base
from app.models.user         import User, UserRole
from app.models.doctor       import Doctor
from app.models.nurse        import Nurse
from app.models.lab_report   import LabReport
from app.models.patient      import Patient, generate_patient_code, detect_specialization
from app.models.patient_user import PatientUser
from app.models.ticket       import Ticket, classify_ticket
from app.models.workflow     import WorkflowLog
from app.models.movement_log import MovementLog
from app.models.pharmacy     import MedicinePrescription
from app.models.billing      import Invoice
from app.core.security       import hash_password

Base.metadata.drop_all(bind=engine)
Base.metadata.create_all(bind=engine)
db = SessionLocal()


def create_user(email, password, name, role):
    u = User(email=email, hashed_password=hash_password(password), full_name=name, role=role)
    db.add(u); db.flush(); return u


def seed():
    print("Seeding MedFlow v4 database...")


    # ── Super Admin ───────────────────────────────────────────────────────────
    admin = create_user("admin@medflow.com", "admin123", "Super Admin", UserRole.SUPER_ADMIN)
    db.flush()

    # ── Doctors ───────────────────────────────────────────────────────────────
    DOCTORS = [
        ("dr.sharma@medflow.com",  "doc123", "Dr. Rajesh Sharma",  "CARDIOLOGIST",    "Cardiology Dept"),
        ("dr.patel@medflow.com",   "doc123", "Dr. Anita Patel",    "ORTHOPEDIC",      "Orthopedic Dept"),
        ("dr.krishna@medflow.com", "doc123", "Dr. Krishna Iyer",   "NEUROLOGIST",     "Neurology Dept"),
        ("dr.gupta@medflow.com",   "doc123", "Dr. Meena Gupta",    "GENERAL",         "General Medicine"),
    ]
    doctors = []
    for email, pwd, name, spec, dept in DOCTORS:
        u = create_user(email, pwd, name, UserRole.DOCTOR)
        d = Doctor(user_id=u.id, specialization=spec, department=dept)
        db.add(d); db.flush(); doctors.append(d)
        print(f"  Doctor: {name} -- {spec}")


    # ── Nurses (2 per doctor) ─────────────────────────────────────────────────
    NURSES = [
        ("nurse.priya@medflow.com",  "nurse123", "Nurse Priya",  0),
        ("nurse.kavya@medflow.com",  "nurse123", "Nurse Kavya",  0),
        ("nurse.sunita@medflow.com", "nurse123", "Nurse Sunita", 1),
        ("nurse.rekha@medflow.com",  "nurse123", "Nurse Rekha",  1),
        ("nurse.deepa@medflow.com",  "nurse123", "Nurse Deepa",  2),
        ("nurse.anjali@medflow.com", "nurse123", "Nurse Anjali", 2),
        ("nurse.pooja@medflow.com",  "nurse123", "Nurse Pooja",  3),
        ("nurse.sneha@medflow.com",  "nurse123", "Nurse Sneha",  3),
    ]
    for email, pwd, name, doc_idx in NURSES:
        u = create_user(email, pwd, name, UserRole.NURSE)
        db.add(Nurse(user_id=u.id, doctor_id=doctors[doc_idx].id))
        print(f"  Nurse: {name} -> {DOCTORS[doc_idx][2]}")

    db.flush()

    # ── Lab Technician ────────────────────────────────────────────────────────
    lab_user = create_user("lab@medflow.com", "lab123", "Lab Tech Priya", UserRole.LAB_TECHNICIAN)
    print(f"  Lab Tech: Lab Tech Priya")

    # ── Pharmacist & Billing ──────────────────────────────────────────────────
    pharmacy_user = create_user("pharmacy@medflow.com", "pharmacy123", "Pharmacist Ravi", UserRole.PHARMACIST)
    print(f"  Pharmacist: Pharmacist Ravi")
    
    billing_user = create_user("billing@medflow.com", "billing123", "Billing Staff Anu", UserRole.BILLING)
    print(f"  Billing: Billing Staff Anu")

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

    statuses  = ["PENDING", "IN_PROGRESS", "IN_PROGRESS", "COMPLETED", "PENDING", "IN_PROGRESS", "COMPLETED", "PENDING"]
    patients  = []

    for i, p in enumerate(SAMPLE_PATIENTS):
        spec    = detect_specialization(p["complaint"])
        matched = [d for d in doctors if d.specialization == spec]
        if not matched:
            matched = [d for d in doctors if d.specialization == "GENERAL"]
        doc  = matched[0] if matched else None
        code = generate_patient_code(db)
        pat  = Patient(
            patient_code            = code,
            name                    = p["name"],
            age                     = p["age"],
            gender                  = p["gender"],
            complaint               = p["complaint"],
            specialization_required = spec,
            priority                = p["priority"],
            status                  = statuses[i],
            doctor_id               = doc.id if doc else None,
            created_by              = admin.id,
        )
        db.add(pat); db.flush()
        patients.append(pat)

        # Create Patient login account (username = patient_code, password = patient_code)
        pat_account = create_user(
            email    = code,                # patient_code acts as username (stored as email for simplicity)
            password = code,               # default password = patient_code
            name     = p["name"],
            role     = UserRole.PATIENT,
        )
        db.add(PatientUser(user_id=pat_account.id, patient_id=pat.id))
        db.flush()

        doc_name = doc.user.full_name if doc and doc.user else "Unassigned"
        print(f"  Patient: {code} {p['name']} -> {spec} ({doc_name})")

    db.flush()

    # ── Sample Tickets ────────────────────────────────────────────────────────
    ticket_max = 0
    def next_ticket_code():
        nonlocal ticket_max
        ticket_max += 1
        return f"TKT{ticket_max:03d}"

    SAMPLE_TICKETS = [
        (patients[0], "I need my blood test report urgently",           lab_user.id),
        (patients[1], "When will my doctor be available for checkup?",  doctors[1].user_id),
        (patients[2], "I have a billing issue with my last invoice",    admin.id),
        (patients[3], "My fever is not going away, need doctor advice", doctors[3].user_id),
        (patients[4], "Can I get my ECG lab test report?",              lab_user.id),
    ]

    statues_t = ["RESOLVED", "OPEN", "OPEN", "IN_PROGRESS", "OPEN"]
    for idx, (patient, query, assignee_id) in enumerate(SAMPLE_TICKETS):
        dept   = classify_ticket(query)
        status = statues_t[idx]
        t = Ticket(
            ticket_code = next_ticket_code(),
            patient_id  = patient.id,
            query_text  = query,
            department  = dept,
            assigned_to = assignee_id,
            status      = status,
            resolved_at = __import__("datetime").datetime.utcnow() if status == "RESOLVED" else None,
            resolved_by = assignee_id if status == "RESOLVED" else None,
        )
        db.add(t)
        print(f"  Ticket: {t.ticket_code} [{dept}] [{status}] - '{query[:40]}...'")

    db.commit()

    print("\nDatabase seeded successfully!")

    print("\nLOGIN CREDENTIALS:")
    print("  Super Admin  : admin@medflow.com       / admin123")
    print("  Cardiologist : dr.sharma@medflow.com   / doc123")
    print("  Orthopedic   : dr.patel@medflow.com    / doc123")
    print("  Neurologist  : dr.krishna@medflow.com  / doc123")
    print("  General Dr   : dr.gupta@medflow.com    / doc123")
    print("  Nurse (Card) : nurse.priya@medflow.com / nurse123")
    print("  Lab Tech     : lab@medflow.com         / lab123")
    print("\n  PATIENT LOGINS (username = patient_code, password = patient_code):")
    for pat in patients:
        print(f"    {pat.patient_code:8s}  /  {pat.patient_code}  ({pat.name})")


if __name__ == "__main__":
    seed()
    db.close()
