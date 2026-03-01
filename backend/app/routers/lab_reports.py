import os
import shutil
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime
from app.database import get_db
from app.models.lab_report import LabReport, LabStatus
from app.models.patient import Patient
from app.models.user import User, UserRole
from app.models.workflow import WorkflowLog, WorkflowStage, WorkflowStatus
from app.core.dependencies import get_current_user, require_lab_tech, require_doctor
from app.config import settings
from app.models.movement_log import log_movement, LogColor

router = APIRouter()

# Ensure upload directory exists
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)


class LabRequestCreate(BaseModel):
    patient_id: int
    test_type: str
    labtech_id: Optional[int] = None   # can be auto-assigned or manually set


class LabReportOut(BaseModel):
    id: int
    report_code: str
    patient_id: int
    doctor_id: int
    labtech_id: Optional[int] = None
    test_type: str
    test_name: Optional[str] = None    # alias of test_type for frontend
    file_name: Optional[str] = None    # derived from file_path
    status: str
    file_path: Optional[str] = None
    file_type: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

    @classmethod
    def model_validate(cls, obj, **kwargs):
        instance = super().model_validate(obj, **kwargs)
        # Populate alias fields from actual DB columns
        if instance.test_name is None:
            instance.test_name = instance.test_type
        if instance.file_name is None and instance.file_path:
            import os as _os
            instance.file_name = _os.path.basename(instance.file_path)
        return instance


class StatusUpdate(BaseModel):
    status: str
    notes: Optional[str] = None


def generate_report_code(db: Session) -> str:
    rows = db.query(LabReport.report_code).all()
    max_num = 0
    for (code,) in rows:
        if code and code.startswith("LAB"):
            try:
                num = int(code[3:])
                if num > max_num:
                    max_num = num
            except (ValueError, IndexError):
                pass
    return f"LAB{max_num + 1:03d}"


# ── GET — filtered by role ────────────────────────────────────────────────────

@router.get("/", response_model=List[LabReportOut])
def get_reports(
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Lab Technician: View only assigned requests.
    Doctor: View requests they prescribed.
    Admin: View all.
    """
    q = db.query(LabReport)

    # Doctors only see their own prescriptions
    if current_user.role == UserRole.DOCTOR:
        q = q.filter(LabReport.doctor_id == current_user.id)
    # Lab tech sees ALL reports (so they can act on any incoming test)
    # elif current_user.role == UserRole.LAB_TECHNICIAN: (no filter - see all)

    if status:
        q = q.filter(LabReport.status == status.upper())

    return q.order_by(LabReport.created_at.desc()).all()


# ── POST /prescribe — Doctor only ─────────────────────────────────────────────

@router.post("/prescribe", response_model=List[LabReportOut], status_code=201)
def prescribe_tests(
    requests: List[LabRequestCreate],
    db: Session = Depends(get_db),
    current_user: User = Depends(require_doctor),
):
    """Doctor prescribes lab tests for a patient."""
    added = []
    patient_id = None
    
    for r in requests:
        patient_id = r.patient_id
        code = generate_report_code(db)
        
        # Auto-assign labtech if not provided (find one with role LAB_TECHNICIAN and fewest current jobs)
        l_id = r.labtech_id
        if not l_id:
            techs = db.query(User).filter(User.role == UserRole.LAB_TECHNICIAN).all()
            if techs:
                l_id = min(techs, key=lambda t: len([lb for lb in t.lab_reports_assigned if lb.status != LabStatus.COMPLETED])).id

        report = LabReport(
            report_code = code,
            patient_id  = r.patient_id,
            doctor_id   = current_user.id,
            labtech_id  = l_id,
            test_type   = r.test_type,
            status      = LabStatus.PENDING,
        )
        db.add(report)
        added.append(report)
        db.commit() # commit each to get unique codes if generator is based on DB count
        db.refresh(report)

    # Log workflow transition — LAB PRESCRIBED (RED: waiting for lab)
    if patient_id:
        log = WorkflowLog(
            patient_id = patient_id,
            stage      = WorkflowStage.LAB,
            status     = WorkflowStatus.ASSIGNED,
            updated_by = current_user.id,
            notes      = f"Prescribed {len(added)} tests. Stage moved to LAB."
        )
        db.add(log)

        p = db.query(Patient).filter(Patient.id == patient_id).first()
        test_names = ", ".join(r.test_type for r in added)
        if p:
            p.status = "LAB_IN_PROGRESS"
            log_movement(
                db,
                patient_id   = patient_id,
                reference_id = patient_id,
                ref_type     = "LAB",
                from_dept    = "DOCTOR",
                to_dept      = "LAB",
                action       = f"🔬 Test(s) prescribed: {test_names} — awaiting lab",
                updated_by   = current_user.id,
                status       = "PENDING",
                color_code   = LogColor.RED,
            )
        db.commit()

    return added



# ── POST /upload — Lab Tech: create + upload in one step ─────────────────────

@router.post("/upload", response_model=LabReportOut, status_code=201)
async def upload_new_lab_report(
    patient_code: str          = Form(...),
    test_name:    str          = Form(...),
    notes:        Optional[str] = Form(None),
    file:         UploadFile   = File(...),
    db:           Session      = Depends(get_db),
    current_user: User         = Depends(require_lab_tech),
):
    """
    Lab Technician: Create a new lab report and upload the file in a single request.
    Accepts patient_code + test_name + file.
    """
    # Find patient by code
    patient = db.query(Patient).filter(Patient.patient_code == patient_code).first()
    if not patient:
        raise HTTPException(404, f"Patient '{patient_code}' not found")

    # Validate file type
    allowed = ["application/pdf", "image/jpeg", "image/png", "image/jpg"]
    content_type = file.content_type or ""
    if content_type not in allowed:
        raise HTTPException(400, "Only PDF and image files (JPG, PNG) are allowed")

    # Save file
    code = generate_report_code(db)
    ext  = os.path.splitext(file.filename)[1] if file.filename else ".pdf"
    safe_filename = f"{code}_report{ext}"
    file_path = os.path.join(settings.UPLOAD_DIR, safe_filename)
    with open(file_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    file_type = "pdf" if "pdf" in content_type else "image"

    # Create LabReport record
    report = LabReport(
        report_code = code,
        patient_id  = patient.id,
        doctor_id   = patient.doctor_id or 1,   # fallback to admin if no doctor
        labtech_id  = current_user.id,
        test_type   = test_name,
        status      = LabStatus.COMPLETED,
        file_path   = file_path,
        file_type   = file_type,
        notes       = notes,
    )
    db.add(report)
    db.commit()
    db.refresh(report)

    # Log movement — lab report uploaded
    log_movement(
        db,
        patient_id   = patient.id,
        reference_id = report.id,
        ref_type     = "LAB",
        from_dept    = "LAB",
        to_dept      = "DOCTOR",
        action       = f"🔬 Lab Report Uploaded: {test_name} ({code}) — by {current_user.full_name}",
        updated_by   = current_user.id,
        status       = "COMPLETED",
        color_code   = LogColor.GREEN,
    )
    db.commit()

    return report


# ── POST /{id}/upload — Lab Technician only ──────────────────────────────────

@router.post("/{report_id}/upload", response_model=LabReportOut)
async def upload_lab_report(
    report_id: int,
    notes: Optional[str] = Form(None),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_lab_tech),
):
    """Lab Technician uploads a report for a specific request."""
    report = db.query(LabReport).filter(LabReport.id == report_id).first()
    if not report:
        raise HTTPException(404, "Lab request not found")

    if current_user.role == UserRole.LAB_TECHNICIAN and report.labtech_id != current_user.id:
        raise HTTPException(403, "You can only upload reports for tests assigned to you")

    # Validate file type
    allowed = ["application/pdf", "image/jpeg", "image/png", "image/jpg"]
    content_type = file.content_type or ""
    if content_type not in allowed:
        raise HTTPException(400, "Only PDF and image files (JPG, PNG) are allowed")

    # Save file
    ext = os.path.splitext(file.filename)[1] if file.filename else ".pdf"
    safe_filename = f"{report.report_code}_final{ext}"
    file_path = os.path.join(settings.UPLOAD_DIR, safe_filename)

    with open(file_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    file_type = "pdf" if "pdf" in content_type else "image"

    report.file_path = file_path
    report.file_type = file_type
    report.status    = LabStatus.COMPLETED
    if notes: report.notes = notes
    report.updated_at = datetime.utcnow()
    
    # Check if all tests for this patient are done
    all_done = db.query(LabReport).filter(
        LabReport.patient_id == report.patient_id, 
        LabReport.status != LabStatus.COMPLETED
    ).count() == 1 # 1 because current one is about to be committed? No, count first then update.
    # Actually, let's just count after committing.

    # Check if all tests for patient done
    db.commit()
    db.refresh(report)

    remaining = db.query(LabReport).filter(
        LabReport.patient_id == report.patient_id,
        LabReport.status     != LabStatus.COMPLETED
    ).count()

    p = db.query(Patient).filter(Patient.id == report.patient_id).first()

    if remaining == 0:
        wlog = WorkflowLog(
            patient_id = report.patient_id,
            stage      = WorkflowStage.DOCTOR,
            status     = WorkflowStatus.COMPLETED,
            updated_by = current_user.id,
            notes      = "All lab tests completed. Returned to Doctor."
        )
        db.add(wlog)
        if p:
            p.status = "LAB_COMPLETED"

        log_movement(
            db,
            patient_id   = report.patient_id,
            reference_id = report.id,
            ref_type     = "LAB",
            from_dept    = "LAB",
            to_dept      = "DOCTOR",
            action       = f"✅ Lab report uploaded: {report.test_type} ({report.report_code})",
            updated_by   = current_user.id,
            status       = "COMPLETED",
            color_code   = LogColor.GREEN,
        )
    else:
        # Partial upload — still in progress
        log_movement(
            db,
            patient_id   = report.patient_id,
            reference_id = report.id,
            ref_type     = "LAB",
            from_dept    = "LAB",
            to_dept      = "LAB",
            action       = f"📄 Report uploaded: {report.test_type} ({report.report_code}) — {remaining} test(s) remaining",
            updated_by   = current_user.id,
            status       = "IN_PROGRESS",
            color_code   = LogColor.YELLOW,
        )

    db.commit()
    return report


@router.patch("/{report_id}/status", response_model=LabReportOut)
def update_status(
    report_id: int,
    data: StatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_lab_tech),
):
    """Lab Technician updates test status (e.g. IN_PROGRESS)."""
    report = db.query(LabReport).filter(LabReport.id == report_id).first()
    if not report:
        raise HTTPException(404, "Report not found")

    if current_user.role == UserRole.LAB_TECHNICIAN and report.labtech_id != current_user.id:
        raise HTTPException(403, "You can only update status for tests assigned to you")

    try:
        new_status = LabStatus(data.status.upper())
        report.status = new_status
    except ValueError:
        raise HTTPException(400, "Invalid status. Use: PENDING, IN_PROGRESS, COMPLETED")

    if data.notes:
        report.notes = data.notes
    report.updated_at = datetime.utcnow()

    if new_status == LabStatus.IN_PROGRESS:
        wlog = WorkflowLog(
            patient_id       = report.patient_id,
            stage            = WorkflowStage.LAB,
            status           = WorkflowStatus.IN_PROGRESS,
            assigned_user_id = current_user.id,
            updated_by       = current_user.id,
            notes            = f"Test {report.test_type} is now in progress."
        )
        db.add(wlog)
        log_movement(
            db,
            patient_id   = report.patient_id,
            reference_id = report.id,
            ref_type     = "LAB",
            from_dept    = "LAB",
            to_dept      = "LAB",
            action       = f"⏳ Lab test in progress: {report.test_type} ({report.report_code})",
            updated_by   = current_user.id,
            status       = "IN_PROGRESS",
            color_code   = LogColor.YELLOW,
        )

    db.commit()
    db.refresh(report)
    return report


@router.get("/{report_id}/download")
def download_report(
    report_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Download/view the actual file."""
    report = db.query(LabReport).filter(LabReport.id == report_id).first()
    if not report:
        raise HTTPException(404, "Report not found")

    if not report.file_path or not os.path.exists(report.file_path):
        raise HTTPException(404, "File not found on server")

    return FileResponse(report.file_path, filename=os.path.basename(report.file_path))
