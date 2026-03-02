const { chromium } = require('playwright');
const path = require('path');

async function runDemo() {
    console.log("🚀 Starting E2E Visual Demo...");
    const browser = await chromium.launch({ headless: false, slowMo: 500 }); // Headed and slow to show the demo
    const context = await browser.newContext();
    const page = await context.newPage();

    page.on('console', msg => console.log('BROWSER LOG:', msg.text()));

    async function login(email, pwd) {
        console.log("Logging in as", email);
        await page.goto("http://localhost:5173");
        await page.waitForSelector('text=👨‍⚕️ Staff Login');
        await page.click('text=👨‍⚕️ Staff Login');
        await page.fill('input[placeholder*="e.g. admin@medflow.com"]', email);
        await page.fill('input[placeholder*="Password"]', pwd);
        await page.click('button:has-text("Sign In →")');
        await page.waitForTimeout(3000); // Wait for dashboard to load
        await page.screenshot({ path: 'C:/Users/sricb/.gemini/antigravity/brain/2054ec95-2931-485f-8a8c-da0368bc689b/debug_login.png' });
    }
    async function patientLogin(code) {
        await page.goto("http://localhost:5173");
        // default is patient login
        await page.waitForSelector('text=🏥 Patient Login');
        await page.click('text=🏥 Patient Login');
        await page.fill('input[placeholder="e.g. PAT001"]', code);
        await page.fill('input[placeholder="Default: your Patient ID"]', code);
        await page.click('button:has-text("Sign In →")');
        await page.waitForTimeout(3000);
    }

    // 1. Admin - Register Fever Patient
    await login('admin@medflow.com', 'admin123');
    await page.click('text=New Patient');
    await page.fill('input[placeholder*="Patient Full Name"]', 'Demo Fever Patient');
    await page.fill('input[placeholder*="Age"]', '30');
    await page.locator('select:has(option:text("Male"))').selectOption('Male');
    await page.fill('textarea[placeholder*="Complaint"]', 'Fever');
    await page.locator('select:has(option:text("Normal Priority"))').selectOption('NORMAL');
    await page.click('button:has-text("Register & Auto-Assign")');
    await page.waitForSelector('text=✅ Patient registered! ID:');
    const successText = await page.textContent('text=✅ Patient registered! ID:');
    const matchID = successText.match(/ID: (PAT\d+)/);
    const patientCode = matchID ? matchID[1] : 'PAT009';

    // Pattern: assigned to Dr. Rajesh Sharma
    const matchDoc = successText.match(/assigned to (.*)/);
    const doctorName = matchDoc ? matchDoc[1] : "General";

    const docMails = {
        "Dr. Rajesh Sharma": "dr.sharma@medflow.com",
        "Dr. Anita Patel": "dr.patel@medflow.com",
        "Dr. Krishna Iyer": "dr.krishna@medflow.com",
        "Dr. Meena Gupta": "dr.gupta@medflow.com",
        "General": "dr.gupta@medflow.com"
    };
    const nurseMails = {
        "Dr. Rajesh Sharma": "nurse.priya@medflow.com",
        "Dr. Anita Patel": "nurse.arathi@medflow.com",
        "Dr. Krishna Iyer": "nurse.deepa@medflow.com",
        "Dr. Meena Gupta": "nurse.pooja@medflow.com",
        "General": "nurse.pooja@medflow.com"
    };

    const doctorEmail = docMails[doctorName] || "dr.gupta@medflow.com";
    const nurseEmail = nurseMails[doctorName] || "nurse.pooja@medflow.com";

    console.log(`✅ Registered Patient: ${patientCode} | Doc: ${doctorEmail} | Nurse: ${nurseEmail}`);
    await page.screenshot({ path: 'C:/Users/sricb/.gemini/antigravity/brain/2054ec95-2931-485f-8a8c-da0368bc689b/demo_1_admin_registered.png' });
    await page.click('text=Sign Out');

    // 2. Doctor - View Waiting List
    await login(doctorEmail, 'doc123');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'C:/Users/sricb/.gemini/antigravity/brain/2054ec95-2931-485f-8a8c-da0368bc689b/demo_2_doctor_views.png' });
    await page.click('text=Sign Out');

    // 3. Nurse - Mark Doctor Visited & Add Blood Test
    await login(nurseEmail, 'nurse123');
    await page.click(`text=${patientCode}`);
    await page.click('button:has-text("Add Workflow Step")');
    await page.click('button:has-text("Mark Consultation Completed")');
    await page.fill('input[placeholder*="e.g. Blood Test, ECG"]', 'Blood Test');
    await page.click('button:has-text("Assign Lab Technician")');
    await page.screenshot({ path: 'C:/Users/sricb/.gemini/antigravity/brain/2054ec95-2931-485f-8a8c-da0368bc689b/demo_3_nurse_adds_lab.png' });
    await page.click('text=Sign Out');

    // 4. Patient - Show timeline
    await patientLogin(patientCode);
    await page.waitForSelector('text=Timeline');
    await page.screenshot({ path: 'C:/Users/sricb/.gemini/antigravity/brain/2054ec95-2931-485f-8a8c-da0368bc689b/demo_4_patient_timeline1.png' });
    await page.click('text=Sign Out');

    // 5. Lab Tech - Upload Report
    await login('lab@medflow.com', 'lab123');
    await page.fill('input[placeholder="PAT001 or patient name..."]', patientCode);
    await page.click('button:has-text("Search")');
    await page.waitForTimeout(1000);
    await page.click(`text=${patientCode}`);
    await page.fill('input[placeholder*="e.g. CBC"]', 'Blood Test');
    const dummyPath = path.resolve('C:/Users/sricb/.gemini/antigravity/brain/2054ec95-2931-485f-8a8c-da0368bc689b/dummy_report_1772385054482.png');
    await page.setInputFiles('input[type="file"]', dummyPath);
    await page.locator('button:has-text("Upload Report")').last().click();
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'C:/Users/sricb/.gemini/antigravity/brain/2054ec95-2931-485f-8a8c-da0368bc689b/demo_5_lab_tech_uploads.png' });
    await page.click('text=Logout');

    // 6. Patient - Show timeline & Report
    await patientLogin(patientCode);
    await page.click('text=Lab Reports');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'C:/Users/sricb/.gemini/antigravity/brain/2054ec95-2931-485f-8a8c-da0368bc689b/demo_6_patient_timeline2.png' });
    await page.click('text=Sign Out');

    // 7. Doctor - View Lab Report
    await login(doctorEmail, 'doc123');
    await page.click(`text=${patientCode}`);
    await page.waitForTimeout(1000);
    await page.click('button:has-text("Mark Report Reviewed")');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'C:/Users/sricb/.gemini/antigravity/brain/2054ec95-2931-485f-8a8c-da0368bc689b/demo_7_doctor_reviews_lab.png' });
    await page.click('text=Sign Out');

    // 8. Nurse - Add Medication Prescription
    await login(nurseEmail, 'nurse123');
    await page.click(`text=${patientCode}`);
    await page.click('button:has-text("Add Workflow Step")');
    await page.fill('input[placeholder*="e.g. Paracetamol"]', 'Paracetamol for Fever');
    await page.click('button:has-text("Add Prescribed Medicines")');
    await page.waitForTimeout(1000);
    await page.click('button:has-text("Send to Billing")');
    await page.screenshot({ path: 'C:/Users/sricb/.gemini/antigravity/brain/2054ec95-2931-485f-8a8c-da0368bc689b/demo_8_nurse_adds_meds.png' });
    await page.click('text=Sign Out');

    // 9. Pharmacy - Make Done
    await login('pharmacy@medflow.com', 'pharmacy123');
    await page.click(`text=${patientCode}`);
    await page.click('button:has-text("Mark Medicines Dispensed")');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'C:/Users/sricb/.gemini/antigravity/brain/2054ec95-2931-485f-8a8c-da0368bc689b/demo_9_pharmacy_dispenses.png' });
    await page.click('text=Sign Out');

    // 10. Billing - Mark Done
    await login('billing@medflow.com', 'billing123');
    await page.click(`text=${patientCode}`);
    await page.click('button:has-text("Mark Payment Completed")');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'C:/Users/sricb/.gemini/antigravity/brain/2054ec95-2931-485f-8a8c-da0368bc689b/demo_10_billing_paid.png' });
    await page.click('text=Sign Out');

    // 11. Nurse - Mark Patient Discharge
    await login(nurseEmail, 'nurse123');
    await page.click(`text=${patientCode}`);
    await page.click('button:has-text("Add Workflow Step")');
    await page.click('button:has-text("Mark Final Discharge")');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'C:/Users/sricb/.gemini/antigravity/brain/2054ec95-2931-485f-8a8c-da0368bc689b/demo_11_nurse_discharges.png' });
    await page.click('text=Sign Out');

    // 12. Patient - Show completed message
    await patientLogin(patientCode);
    await page.waitForSelector('text=Discharged');
    await page.screenshot({ path: 'C:/Users/sricb/.gemini/antigravity/brain/2054ec95-2931-485f-8a8c-da0368bc689b/demo_12_patient_discharged.png' });

    console.log("🎉 Run completed successfully!");
    await browser.close();
}

runDemo().catch(err => {
    console.error("Test failed: ", err);
    process.exit(1);
});
