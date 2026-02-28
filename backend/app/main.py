from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from app.database import engine, Base
from app.routers.auth       import router as auth_router
from app.routers.patients   import router as patients_router
from app.routers.lab_reports import router as lab_router
from app.routers.staff      import router as staff_router

# Import all models so SQLAlchemy creates the tables
from app.models.user       import User
from app.models.doctor     import Doctor
from app.models.nurse      import Nurse
from app.models.patient    import Patient
from app.models.lab_report import LabReport
from app.models.workflow   import WorkflowLog

Base.metadata.create_all(bind=engine)
os.makedirs("uploads", exist_ok=True)

app = FastAPI(
    title="MedFlow — Hospital Workflow Automation",
    description="Role-based: Super Admin · Doctor · Nurse · Lab Technician",
    version="3.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

app.include_router(auth_router,     prefix="/api/auth",        tags=["Auth"])
app.include_router(patients_router, prefix="/api/patients",    tags=["Patients"])
app.include_router(lab_router,      prefix="/api/lab-reports", tags=["Lab Reports"])
app.include_router(staff_router,    prefix="/api/staff",       tags=["Staff Management"])


@app.get("/")
def root():
    return {"message": "MedFlow v3.0 API — see /docs"}

@app.get("/health")
def health():
    return {"status": "healthy", "version": "3.0.0"}
