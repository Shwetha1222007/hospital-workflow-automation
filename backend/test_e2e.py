import requests
import time
import json
import os

BASE_URL = "http://127.0.0.1:8001"

def run_test():
    print("Starting E2E API Test...")
    
    # 1. Super Admin creates patient
    admin_login = requests.post(f"{BASE_URL}/token", data={"username": "admin@medflow.com", "password": "admin123"})
    admin_token = admin_login.json().get("access_token")
    headers = {"Authorization": f"Bearer {admin_token}"}
    
    patient_data = {
        "name": "Api Test Patient",
        "age": 30,
        "gender": "Male",
        "contact_number": "9999999999",
        "address": "Test Avenue",
        "complaint": "Fever",
        "priority": "NORMAL"
    }
    create_res = requests.post(f"{BASE_URL}/patients/", json=patient_data, headers=headers)
    patient = create_res.json()
    patient_id = patient["id"]
    patient_code = patient["patient_code"]
    doctor_id = patient["doctor_id"]
    print(f"✅ Patient Created: {patient_code} assigned to Doctor ID {doctor_id}")
    
    # 2. Doctor logs in and prescribes
    staff_res = requests.get(f"{BASE_URL}/admin/staff", headers=headers)
    staff_list = staff_res.json()
    doctor = next(s for s in staff_list if s["id"] == doctor_id)
    doc_email = doctor["email"]
    
    doc_login = requests.post(f"{BASE_URL}/token", data={"username": doc_email, "password": "doc123"})
    doc_token = doc_login.json()["access_token"]
    doc_headers = {"Authorization": f"Bearer {doc_token}"}
    
    # Consult done
    requests.post(f"{BASE_URL}/patients/{patient_id}/consultation-done", headers=doc_headers)
    # Prescribe Medicine
    requests.post(f"{BASE_URL}/pharmacy/prescribe", json={"patient_id": patient_id, "medicine_name": "Paracetamol", "dosage_instructions": "1-0-1"}, headers=doc_headers)
    # Prescribe Lab Test
    requests.post(f"{BASE_URL}/lab-reports/prescribe", json={"patient_id": patient_id, "test_name": "Blood Test", "notes": "Fever profile"}, headers=doc_headers)
    print("✅ Doctor marked consultation done and prescribed medicine & lab test")
    
    # 3. Nurse assigns lab tech & adds meds (if applicable)
    nurse_res = requests.get(f"{BASE_URL}/staff/my-nurses", headers=doc_headers) # actually doc gets their assigned nurse? Let's just use admin to find a nurse
    nurse = next(s for s in staff_list if s["role"] == "NURSE" and s.get("assigned_doctor_id") == doctor_id)
    nurse_email = nurse["email"]
    
    nurse_login = requests.post(f"{BASE_URL}/token", data={"username": nurse_email, "password": "nurse123"})
    nurse_token = nurse_login.json()["access_token"]
    nurse_headers = {"Authorization": f"Bearer {nurse_token}"}
    
    # Find pending lab test and assign
    pending_tests_res = requests.get(f"{BASE_URL}/lab-reports/?status=PENDING", headers=nurse_headers)
    pending_tests = pending_tests_res.json()
    pt_test = next(t for t in pending_tests if t["patient_id"] == patient_id and t["test_name"] == "Blood Test")
    
    lab_tech = next(s for s in staff_list if s["role"] == "LAB_TECHNICIAN")
    requests.put(f"{BASE_URL}/lab-reports/{pt_test['id']}/assign", json={"technician_id": lab_tech["id"]}, headers=nurse_headers)
    print("✅ Nurse assigned Lab Tech")
    
    # 4. Lab Tech uploads report
    lab_login = requests.post(f"{BASE_URL}/token", data={"username": lab_tech["email"], "password": "lab123"})
    lab_headers = {"Authorization": f"Bearer {lab_login.json()['access_token']}"}
    
    # fake file upload
    with open("dummy.txt", "w") as f: f.write("dummy content")
    with open("dummy.txt", "rb") as f:
        files = {"file": ("dummy.txt", f, "text/plain")}
        requests.post(f"{BASE_URL}/lab-reports/{pt_test['id']}/upload", files=files, headers=lab_headers)
    print("✅ Lab uploaded report")
    
    # 5. Doctor reviews report
    requests.put(f"{BASE_URL}/lab-reports/{pt_test['id']}/review", headers=doc_headers)
    print("✅ Doctor reviewed report")
    
    # 6. Pharmacy dispenses
    pharm_login = requests.post(f"{BASE_URL}/token", data={"username": "pharmacy@medflow.com", "password": "pharmacy123"})
    pharm_headers = {"Authorization": f"Bearer {pharm_login.json()['access_token']}"}
    
    prescriptions_res = requests.get(f"{BASE_URL}/pharmacy/?status=PENDING", headers=pharm_headers)
    presc = next(p for p in prescriptions_res.json() if p["patient_id"] == patient_id)
    requests.put(f"{BASE_URL}/pharmacy/{presc['id']}/dispense", headers=pharm_headers)
    print("✅ Pharmacy dispensed medicine")
    
    # 7. Billing completes payment
    bill_login = requests.post(f"{BASE_URL}/token", data={"username": "billing@medflow.com", "password": "billing123"})
    bill_headers = {"Authorization": f"Bearer {bill_login.json()['access_token']}"}
    
    bills_res = requests.get(f"{BASE_URL}/billing/?status=PENDING", headers=bill_headers)
    bill = next(b for b in bills_res.json() if b["patient_id"] == patient_id)
    requests.put(f"{BASE_URL}/billing/{bill['id']}/pay", headers=bill_headers)
    print("✅ Billing marked payment complete")
    
    # 8. Nurse marks final discharge
    requests.post(f"{BASE_URL}/patients/{patient_id}/discharge", headers=nurse_headers)
    print("✅ Nurse discharged patient")
    
    # Check final patient status
    patient_final = requests.get(f"{BASE_URL}/patients/{patient_id}", headers=admin_headers).json()
    print(f"🏆 TEST COMPLETE. Final Patient Status: {patient_final['status']}")

if __name__ == "__main__":
    try:
        run_test()
    except Exception as e:
        print(f"❌ Error during test: {str(e)}")
