# MedFlow: Hospital Inter-Department Workflow Automation

MedFlow is a state-of-the-art Hospital Management System (HMS) transformed into a real-time **Inter-Department Workflow Automation System**. It streamlines the journey from patient registration to diagnostic reporting and query resolution using a robust, color-coded engine.

---

## 🚀 Key Features

### 1. Unified Timeline Engine
Experience a visual, flowchart-style tracking of every patient's journey.
- **Color-Coded Statuses**:
  - 🔴 **Red (Pending)**: Scan/Test requested or unresolved query.
  - 🔵 **Blue (Assigned)**: Doctor or Lab Technician assigned to the task.
  - 🟡 **Yellow (In Progress)**: Treatment or lab analysis actively underway.
  - 🟢 **Green (Completed)**: Consultation finished, reports uploaded, or ticket resolved.

### 2. Multilingual Query Routing (Tamil & English)
A sophisticated rule-based routing system with full **Tamil language support**.
- Automatically detects department intent (Lab, Doctor, Billing, Nurse).
- Routes queries like *"ரத்த பரிசோதனை அறிக்கை தாமதமாகிறது"* directly to the Lab department.

### 3. AI-Powered Chatbot (MedBot)
Integrates a "Fail-Safe" AI assistant using Groq.
- **Auto-Ticket Fallback**: If the AI service is unavailable, it automatically classifies the user's query and creates a support ticket.
- **Instant Escalation**: Newly created tickets are routed to the relevant staff dashboard in real-time.

### 4. Role-Based Access Control (RBAC)
Dedicated dashboards and permissions for:
- **Super Admin**: System-wide oversight and staff management.
- **Doctor**: Treatment plans and specialized consultations.
- **Nurse**: Patient care and consultation management.
- **Lab Technician**: Diagnostic test tracking and report fulfillment.
- **Patient**: Personal timeline tracking and query management.

---

## 🛠️ Tech Stack

- **Backend**: Python (FastAPI), SQLAlchemy (SQLite), Passlib (Bcrypt).
- **Frontend**: React (Vite), Axios, Context API for Auth.
- **AI Engine**: Groq (Llama3-8b) for chatbot and routing assistance.
- **Database**: SQLite (Zero-configuration needed).

---

## 🔧 Installation & Setup

### 1. Prerequisites
- Python 3.10+
- Node.js (v18+)
- Groq API Key (for MedBot)

### 2. Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
python seed.py        # Initializes medflow_new.db with sample data
uvicorn app.main:app --reload
```

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

---

## 🔐 Credentials for Testing

| Role | Username / Email | Password |
| :--- | :--- | :--- |
| **Super Admin** | `admin@medflow.com` | `admin123` |
| **Cardiologist** | `dr.sharma@medflow.com` | `doc123` |
| **Nurse** | `nurse.priya@medflow.com` | `nurse123` |
| **Lab Tech** | `lab@medflow.com` | `lab123` |
| **Patient** | `PAT001` (Patient ID) | `PAT001` |

---

## 📂 Project Structure

```text
├── backend/
│   ├── app/
│   │   ├── models/       # SQLAlchemy DB schemas (Patient, Ticket, Logs)
│   │   ├── routers/      # API Endpoints (Auth, Patients, Chatbot)
│   │   └── core/         # Security & Dependencies
│   └── seed.py           # Database seeder
├── frontend/
│   ├── src/
│   │   ├── components/   # Reusable UI (Chatbot, Navbar)
│   │   ├── pages/        # Role-specific Dashboards
│   │   └── context/      # Authentication State
```

---

## 📄 API Documentation
Once the backend is running, access the interactive docs at:
- Swagger UI: `http://localhost:8000/docs`
- Redoc: `http://localhost:8000/redoc`

---

*Built with ❤️ for advanced hospital workflow optimization.*
