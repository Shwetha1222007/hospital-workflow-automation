// Playwright end‑to‑end test for MedFlow full workflow
const { test, expect } = require('@playwright/test');
const path = require('path');

test('Complete patient lifecycle', async ({ page }) => {
    const login = async (email, pwd) => {
        await page.goto('http://localhost:5173');
        // Choose Staff login (default)
        await page.click('text=👨‍⚕️ Staff Login');
        await page.fill('input[placeholder*="e.g. admin@medflow.com"]', email);
        await page.fill('input[placeholder*="Password"]', pwd);
        await page.click('button:has-text("Sign In →")');
        await expect(page.locator('text=My Assigned Patients')).toBeVisible();
    };

    // 1️⃣ Admin – Register patient with fever
    await login('admin@medflow.com', 'admin123');
    await page.click('text=Register Patient');
    await page.fill('input[placeholder*="Patient Name"]', 'Fever Patient');
    await page.fill('input[placeholder*="Age"]', '30');
    await page.selectOption('select[name="gender"]', 'Male');
    await page.fill('textarea[placeholder*="Complaint"]', 'Fever');
    await page.selectOption('select[name="priority"]', 'NORMAL');
    await page.click('button:has-text("Register")');
    // capture generated codes
    const patientCode = await page.textContent('div:has-text("Patient Code")');
    const doctorInfo = await page.textContent('div:has-text("Doctor Assigned")');
    const nurseInfo = await page.textContent('div:has-text("Nurse Assigned")');
    const doctorEmail = doctorInfo.match(/\S+@medflow\.com/)[0];
    const nurseEmail = nurseInfo.match(/\S+@medflow\.com/)[0];
    await page.click('text=Logout');

    // 2️⃣ Doctor – consult & prescribe
    await login(doctorEmail, 'doc123');
    await page.fill('input[placeholder*="Search patients"]', patientCode.trim());
    await page.click(`text=${patientCode.trim()}`);
    await page.click('button:has-text("Mark Consultation Done")');
    await page.click('button:has-text("Prescribe Medicine")');
    await page.fill('input[placeholder*="Medicine name"]', 'Paracetamol');
    await page.click('button:has-text("Add Medicine")');
    await page.click('button:has-text("Prescribe Lab Test")');
    await page.fill('input[placeholder*="Lab test name"]', 'Blood Test');
    await page.click('button:has-text("Add Lab Test")');
    await page.click('text=Logout');

    // 3️⃣ Nurse – add workflow steps
    await login(nurseEmail, 'nurse123');
    await page.fill('input[placeholder*="Search patients"]', patientCode.trim());
    await page.click(`text=${patientCode.trim()}`);
    await page.click('button:has-text("Add Workflow Step")');
    await page.click('button:has-text("Add Prescribed Medicines")');
    await page.click('button:has-text("Add Lab Test")');
    await page.fill('input[placeholder*="e.g. Blood Test, ECG"]', 'Blood Test');
    await page.click('button:has-text("Assign Lab Technician")');
    await page.click('text=Logout');

    // 4️⃣ Lab Tech – upload report
    await login('lab@medflow.com', 'lab123');
    await page.fill('input[placeholder*="Search patients"]', patientCode.trim());
    await page.click(`text=${patientCode.trim()}`);
    await page.fill('input[placeholder*="Test name"]', 'Blood Test');
    const dummyPath = path.resolve('C:/Users/sricb/.gemini/antigravity/brain/2054ec95-2931-485f-8a8c-da0368bc689b/dummy_report_1772385054482.png');
    await page.setInputFiles('input[type="file"]', dummyPath);
    await page.click('button:has-text("Upload Report")');
    await page.click('text=Logout');

    // 5️⃣ Doctor – review report
    await login(doctorEmail, 'doc123');
    await page.fill('input[placeholder*="Search patients"]', patientCode.trim());
    await page.click(`text=${patientCode.trim()}`);
    await page.click('button:has-text("View Report")');
    await page.click('button:has-text("Report Reviewed")');
    await page.click('text=Logout');

    // 6️⃣ Pharmacist – dispense medicine
    await login('pharmacy@medflow.com', 'pharmacy123');
    await page.fill('input[placeholder*="Search patients"]', patientCode.trim());
    await page.click(`text=${patientCode.trim()}`);
    await page.click('button:has-text("Mark Medicines Dispensed")');
    await page.click('text=Logout');

    // 7️⃣ Billing – complete payment
    await login('billing@medflow.com', 'billing123');
    await page.fill('input[placeholder*="Search patients"]', patientCode.trim());
    await page.click(`text=${patientCode.trim()}`);
    await page.click('button:has-text("Mark Payment Completed")');
    await page.click('text=Logout');

    // 8️⃣ Nurse – discharge
    await login(nurseEmail, 'nurse123');
    await page.fill('input[placeholder*="Search patients"]', patientCode.trim());
    await page.click(`text=${patientCode.trim()}`);
    await page.click('button:has-text("Mark Final Discharge")');
    await page.click('text=Logout');

    // 9️⃣ Patient – final view
    await login(patientCode.trim(), patientCode.trim());
    await expect(page.locator('text=Discharged')).toBeVisible();
    const finalMsg = await page.textContent('div:has-text("Your treatment is complete")');
    console.log('✅ Final patient message:', finalMsg);
    await page.screenshot({ path: 'C:/Users/sricb/.gemini/antigravity/brain/2054ec95-2931-485f-8a8c-da0368bc689b/final_patient_view.png' });
});
