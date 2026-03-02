from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from app.database import engine, Base
from app.routers.auth          import router as auth_router
from app.routers.patients      import router as patients_router
from app.routers.lab_reports   import router as lab_router
from app.routers.staff         import router as staff_router
from app.routers.tickets       import router as tickets_router
from app.routers.movement_logs import router as movement_logs_router
from app.routers.chatbot       import router as chatbot_router
from app.routers.pharmacy      import router as pharmacy_router
from app.routers.billing       import router as billing_router

# Import all models so SQLAlchemy creates the tables
from app.models.user         import User
from app.models.doctor       import Doctor
from app.models.nurse        import Nurse
from app.models.patient      import Patient
from app.models.lab_report   import LabReport
from app.models.workflow     import WorkflowLog
from app.models.patient_user import PatientUser
from app.models.ticket       import Ticket
from app.models.movement_log import MovementLog
from app.models.pharmacy     import MedicinePrescription
from app.models.billing      import Invoice

Base.metadata.create_all(bind=engine)
os.makedirs("uploads", exist_ok=True)

app = FastAPI(
    title="MedFlow — Hospital Workflow Automation",
    description="Role-based: Super Admin · Doctor · Nurse · Lab Technician · Pharmacist · Billing · Patient",
    version="5.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

app.include_router(auth_router,          prefix="/api/auth",          tags=["Auth"])
app.include_router(patients_router,      prefix="/api/patients",      tags=["Patients"])
app.include_router(lab_router,           prefix="/api/lab-reports",   tags=["Lab Reports"])
app.include_router(pharmacy_router,      prefix="/api/pharmacy",      tags=["Pharmacy"])
app.include_router(billing_router,       prefix="/api/billing",       tags=["Billing"])
app.include_router(staff_router,         prefix="/api/staff",         tags=["Staff Management"])
app.include_router(tickets_router,       prefix="/api/tickets",       tags=["Tickets"])
app.include_router(movement_logs_router, prefix="/api/movement-logs", tags=["Movement Logs"])
app.include_router(chatbot_router,       prefix="/api/chatbot",       tags=["Chatbot"])


@app.get("/")
def root():
    return {"message": "MedFlow v4.0 API — see /docs"}

@app.get("/health")
def health():
    return {"status": "healthy", "version": "4.0.0"}
