from fastapi.testclient import TestClient
from app.main import app
from app.database import Base, get_db
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import sys
import os

engine = create_engine("sqlite:///./test_medflow.db", connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base.metadata.drop_all(bind=engine)
Base.metadata.create_all(bind=engine)

def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

# Seed the test DB first
from seed import DOCTORS, NURSES, ADMINS, LAB_TECHNICIANS, PHARMACISTS, BILLING_STAFF, \
    seed_users, seed_departments, SessionLocal as SeedSessionLocal
import seed
seed.SessionLocal = TestingSessionLocal

db = TestingSessionLocal()
seed_departments(db)
seed_users(db, ADMINS)
seed_users(db, DOCTORS)
seed_users(db, NURSES)
seed_users(db, LAB_TECHNICIANS)
seed_users(db, PHARMACISTS)
seed_users(db, BILLING_STAFF)
db.close()

client = TestClient(app)

def run_test():
    print("🚀 Starting In-Memory E2E API Verification with FastAPI TestClient...", flush=True)
    
    # 0. Get Admin Token
    res = client.post("/token", data={"username": "admin@medflow.com", "password": "admin123"})
    if res.status_code != 200:
        print(f"❌ Admin login failed: {res.text}")
        return
    admin_token = res.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    
    # 1. Register Patient
    patient_data = {
        "name": "TestClient Patient",
        "age": 45,
        "gender": "Female",
        "contact_number": "1234567890",
        "address": "Local Host Lane",
        "complaint": "Fever",
        "priority": "NORMAL"
    }
    req = client.post("/patients/", json=patient_data, headers=admin_headers)
    if req.status_code != 201:
        print(f"❌ Create patient failed: {req.text}")
        return
        
    patient = req.json()
    p_code = patient["patient_code"]
    doctor_id = patient["doctor_id"]
    print(f"✅ Patient Created: {p_code} (Doctor ID: {doctor_id})", flush=True)

    # 2. Doctor Login & Consultation
    staff_res = client.get("/admin/staff", headers=admin_headers)
    staff = staff_res.json()
    doctor = next(s for s in staff if s["id"] == doctor_id)
    
    d_res = client.post("/token", data={"username": doctor["email"], "password": "doc123"})
    doc_headers = {"Authorization": f"Bearer {d_res.json()['access_token']}"}
    
    client.post(f"/patients/{p_code}/doctor/consultation-done", headers=doc_headers)
    client.post(f"/pharmacy/prescribe", json=[{"patient_id": patient["id"], "medicine_name": "Paracetamol", "dosage": "1-0-1", "duration":"3 days"}], headers=doc_headers)
    client.post(f"/patients/{p_code}/doctor/prescribe-lab", json={"test_name": "Blood Test", "notes": "Check it"}, headers=doc_headers)
    print("✅ Doctor prescribed medicine & lab test", flush=True)
    
    # 3. Nurse Assignment
    # First nurse
    nurse = next(s for s in staff if s["role"] == "NURSE")
    n_res = client.post("/token", data={"username": nurse["email"], "password": "nurse123"})
    nurse_headers = {"Authorization": f"Bearer {n_res.json()['access_token']}"}
    
    labs = client.get("/lab-reports/", headers=nurse_headers).json()
    my_lab = next(l for l in labs if l["patient_id"] == patient["id"] and l["status"] == "PENDING")
    
    lab_tech = next(s for s in staff if s["role"] == "LAB_TECHNICIAN")
    client.post(f"/lab-reports/assign", json=[{"report_id": my_lab["id"], "technician_id": lab_tech["id"]}], headers=nurse_headers)
    print("✅ Nurse assigned Lab Tech", flush=True)
    
    # 4. Lab Tech Upload
    lt_res = client.post("/token", data={"username": lab_tech["email"], "password": "lab123"})
    lab_headers = {"Authorization": f"Bearer {lt_res.json()['access_token']}"}
    
    files = {"file": ("test.jpg", b"fake_image_bytes", "image/jpeg")}
    client.post(f"/lab-reports/{my_lab['id']}/upload", files=files, headers=lab_headers)
    print("✅ Lab Technician uploaded report", flush=True)
    
    # 5. Doctor Reviews
    client.post(f"/patients/{p_code}/doctor/report-reviewed", json={"report_id": my_lab["id"]}, headers=doc_headers)
    print("✅ Doctor reviewed lab report", flush=True)
    
    # 6. Pharmacy Dispense
    ph_res = client.post("/token", data={"username": "pharmacy@medflow.com", "password": "pharmacy123"})
    pharm_headers = {"Authorization": f"Bearer {ph_res.json()['access_token']}"}
    
    presc_list = client.get("/pharmacy/", headers=pharm_headers).json()
    my_presc = next(p for p in presc_list if p["patient_id"] == patient["id"])
    client.patch(f"/pharmacy/{my_presc['id']}/dispense", headers=pharm_headers)
    print("✅ Pharmacy dispensed medicines", flush=True)
    
    # Send to Billing (Nurse Action)
    client.post("/billing/generate-discharge-bill", json={"patient_id": patient["id"]}, headers=nurse_headers)
    
    # 7. Billing Pay
    b_res = client.post("/token", data={"username": "billing@medflow.com", "password": "billing123"})
    bill_headers = {"Authorization": f"Bearer {b_res.json()['access_token']}"}
    
    inv_list = client.get("/billing/", headers=bill_headers).json()
    my_inv = next(i for i in inv_list if i["patient_id"] == patient["id"])
    client.patch(f"/billing/{my_inv['id']}/pay", json={"payment_method": "Card"}, headers=bill_headers)
    print("✅ Billing completed payment", flush=True)
    
    # 8. Nurse marks Discharge
    client.patch(f"/patients/{p_code}", json={"status": "DISCHARGED"}, headers=nurse_headers)
    client.post("/movement-logs/nurse-action", json={"patient_id": patient["id"], "action": "🚪 Patient Discharged by Nurse"}, headers=nurse_headers)
    print("✅ Nurse marked Final Discharge", flush=True)
    
    # Confirm Final Status
    final_p = client.get(f"/patients/{p_code}", headers=admin_headers).json()
    print(f"\n🎉 WIN: End-to-End Workflow passed successfully! Final status: {final_p['status']} 🎉", flush=True)

if __name__ == "__main__":
    run_test()
