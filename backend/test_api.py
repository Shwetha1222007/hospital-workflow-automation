import requests

BASE = "http://localhost:8000"

# Test 1: Login as admin
r = requests.post(f"{BASE}/api/auth/token", data={"username": "admin@medflow.com", "password": "admin123"})
print("Admin login:", r.status_code, r.json().get("role"))
token = r.json().get("access_token")

# Test 2: List patients - verify PAT codes
r2 = requests.get(f"{BASE}/api/patients/", headers={"Authorization": f"Bearer {token}"})
patients = r2.json()
print(f"Patients count: {len(patients)}")
for p in patients:
    print(f"  {p['patient_code']} -> {p['name']}")

# Test 3: Register a new patient and verify unique Patient ID
import time
email = f"test_{int(time.time())}@medflow.com"
r3 = requests.post(f"{BASE}/api/auth/register", json={
    "email": email, "password": "test123", "full_name": "Test Patient",
    "role": "PATIENT", "age": 25, "blood_group": "B+"
})
print(f"\nNew patient registration: {r3.status_code}")
data = r3.json()
if r3.status_code == 200:
    print(f"  Assigned Patient ID: {data.get('patient_code')}")
    print(f"  Name: {data.get('full_name')}")
else:
    print(f"  Error: {data}")

# Test 4: Lab reports route
r4 = requests.get(f"{BASE}/api/lab-reports/", headers={"Authorization": f"Bearer {token}"})
print(f"\nAll lab reports: {r4.status_code}, count: {len(r4.json()) if r4.status_code == 200 else 'error'}")
