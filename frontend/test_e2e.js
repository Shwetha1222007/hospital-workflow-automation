const fs = require('fs');

const BASE_URL = "http://127.0.0.1:8001";

async function runTest() {
    try {
        console.log("Starting E2E Node API Test against " + BASE_URL);

        // 1. Super Admin creates patient
        const adminLoginRes = await fetch(`${BASE_URL}/token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({ username: "admin@medflow.com", password: "admin123" })
        });
        if (!adminLoginRes.ok) throw new Error("Admin login failed");
        const adminData = await adminLoginRes.json();
        const adminToken = adminData.access_token;
        const adminHeaders = { 'Authorization': `Bearer ${adminToken}`, 'Content-Type': 'application/json' };

        const patientData = {
            name: "Api Test Patient Node",
            age: 30,
            gender: "Male",
            contact_number: "9999999999",
            address: "Test Avenue",
            complaint: "Fever",
            priority: "NORMAL"
        };
        const createRes = await fetch(`${BASE_URL}/patients/`, {
            method: 'POST',
            body: JSON.stringify(patientData),
            headers: adminHeaders
        });
        if (!createRes.ok) throw new Error(await createRes.text());
        const patient = await createRes.json();
        console.log(`✅ Patient Created: ${patient.patient_code} assigned to Doctor ID ${patient.doctor_id}`);

        // 2. Doctor logs in and prescribes
        const staffRes = await fetch(`${BASE_URL}/admin/staff`, { headers: adminHeaders });
        const staffList = await staffRes.json();
        const doctor = staffList.find(s => s.id === patient.doctor_id);

        const docLogin = await fetch(`${BASE_URL}/token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({ username: doctor.email, password: "doc123" })
        });
        const docToken = (await docLogin.json()).access_token;
        const docHeaders = { 'Authorization': `Bearer ${docToken}`, 'Content-Type': 'application/json' };

        await fetch(`${BASE_URL}/patients/${patient.id}/consultation-done`, { method: 'POST', headers: docHeaders });
        await fetch(`${BASE_URL}/pharmacy/prescribe`, {
            method: 'POST',
            body: JSON.stringify({ patient_id: patient.id, medicine_name: "Paracetamol", dosage_instructions: "1-0-1" }),
            headers: docHeaders
        });
        await fetch(`${BASE_URL}/lab-reports/prescribe`, {
            method: 'POST',
            body: JSON.stringify({ patient_id: patient.id, test_name: "Blood Test", notes: "Fever" }),
            headers: docHeaders
        });
        console.log("✅ Doctor prescribed medicine & lab test");

        // 3. Nurse
        const nurse = staffList.find(s => s.role === "NURSE"); // just using first nurse
        const nurseLogin = await fetch(`${BASE_URL}/token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({ username: nurse.email, password: "nurse123" })
        });
        const nurseToken = (await nurseLogin.json()).access_token;
        const nurseHeaders = { 'Authorization': `Bearer ${nurseToken}`, 'Content-Type': 'application/json' };

        const pendingTestsRes = await fetch(`${BASE_URL}/lab-reports/?status=PENDING`, { headers: nurseHeaders });
        const ptTest = (await pendingTestsRes.json()).find(t => t.patient_id === patient.id);

        const labTech = staffList.find(s => s.role === "LAB_TECHNICIAN");
        await fetch(`${BASE_URL}/lab-reports/${ptTest.id}/assign`, {
            method: 'PUT',
            body: JSON.stringify({ technician_id: labTech.id }),
            headers: nurseHeaders
        });
        console.log("✅ Nurse assigned Lab Tech");

        // 4. Lab Tech uploads
        const labLogin = await fetch(`${BASE_URL}/token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({ username: labTech.email, password: "lab123" })
        });
        const labToken = (await labLogin.json()).access_token;

        // Fake multipart upload
        const boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW';
        let body = `--${boundary}\r\n`;
        body += `Content-Disposition: form-data; name="file"; filename="dummy.txt"\r\n`;
        body += `Content-Type: text/plain\r\n\r\n`;
        body += `dummy content\r\n`;
        body += `--${boundary}--\r\n`;

        await fetch(`${BASE_URL}/lab-reports/${ptTest.id}/upload`, {
            method: 'POST',
            body: body,
            headers: {
                'Authorization': `Bearer ${labToken}`,
                'Content-Type': `multipart/form-data; boundary=${boundary}`
            }
        });
        console.log("✅ Lab uploaded report");

        // 5. Doctor Reviews
        await fetch(`${BASE_URL}/lab-reports/${ptTest.id}/review`, { method: 'PUT', headers: docHeaders });
        console.log("✅ Doctor reviewed report");

        // 6. Pharmacy
        const pharmLogin = await fetch(`${BASE_URL}/token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({ username: "pharmacy@medflow.com", password: "pharmacy123" })
        });
        const pharmHeaders = { 'Authorization': `Bearer ${(await pharmLogin.json()).access_token}`, 'Content-Type': 'application/json' };

        const prescRes = await fetch(`${BASE_URL}/pharmacy/?status=PENDING`, { headers: pharmHeaders });
        const presc = (await prescRes.json()).find(p => p.patient_id === patient.id);
        await fetch(`${BASE_URL}/pharmacy/${presc.id}/dispense`, { method: 'PUT', headers: pharmHeaders });
        console.log("✅ Pharmacy dispensed 100%");

        // 7. Billing
        const billLogin = await fetch(`${BASE_URL}/token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({ username: "billing@medflow.com", password: "billing123" })
        });
        const billHeaders = { 'Authorization': `Bearer ${(await billLogin.json()).access_token}`, 'Content-Type': 'application/json' };

        const billRes = await fetch(`${BASE_URL}/billing/?status=PENDING`, { headers: billHeaders });
        const billList = await billRes.json();
        const bill = billList.find(b => b.patient_id === patient.id);
        if (bill) {
            const payRes = await fetch(`${BASE_URL}/billing/${bill.id}/pay`, { method: 'PUT', headers: billHeaders });
            if (!payRes.ok) console.log("Billing error", await payRes.text());
        }
        console.log("✅ Billing paid");

        // 8. Discharge
        await fetch(`${BASE_URL}/patients/${patient.id}/discharge`, { method: 'POST', headers: nurseHeaders });

        // Fetch Final Patient
        const finalPatient = await fetch(`${BASE_URL}/patients/${patient.id}`, { headers: adminHeaders }).then(r => r.json());
        console.log(`🏆 TEST COMPLETE. Final status: ${finalPatient.status}`);

    } catch (e) {
        console.error("Test failed: ", e.message);
    }
}

runTest();
