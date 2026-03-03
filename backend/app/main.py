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
    allow_origins=["*"],
    allow_credentials=False,   # must be False when allow_origins="*"
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


from fastapi.responses import FileResponse


# ── SERVE FRONTEND (Production) ──────────────────────────────────────────────
# We assume the frontend/dist folder is located at the project root
frontend_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "frontend", "dist")

if os.path.exists(frontend_dir):
    # Mount assets folder for static files (js, css, images)
    app.mount("/assets", StaticFiles(directory=os.path.join(frontend_dir, "assets")), name="assets")

    @app.get("/{full_path:path}")
    async def serve_react_app(full_path: str):
        # Skip API routes (though they should be caught by routers above)
        if full_path.startswith("api") or full_path.startswith("docs") or full_path.startswith("redoc") or full_path.startswith("openapi.json"):
            return None # Should be handled by router
        
        # Serve index.html for all other routes to support React Router
        index_file = os.path.join(frontend_dir, "index.html")
        return FileResponse(index_file)

@app.get("/api/health") # Keep health check accessible
def health():
    return {"status": "healthy", "version": "5.0.0"}

