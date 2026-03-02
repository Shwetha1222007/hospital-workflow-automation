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
    
    # Priority Queue ETA
    queue_position: Optional[int] = None
    estimated_wait_mins: Optional[int] = None

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
    Patient: View their own requests (and ETA logic).
    Admin: View all.
    """
    q = db.query(LabReport)

    if current_user.role == UserRole.DOCTOR:
        q = q.filter(LabReport.doctor_id == current_user.id)
    elif current_user.role == UserRole.PATIENT:
        from app.models.patient_user import PatientUser
        link = db.query(PatientUser).filter(PatientUser.user_id == current_user.id).first()
        if link:
            q = q.filter(LabReport.patient_id == link.patient_id)

    if status:
        q = q.filter(LabReport.status == status.upper())

    reports = q.order_by(LabReport.created_at.desc()).all()
    
    # Pre-calculate queue for PENDING reports
    out = []
    
    # Priority Mapping for line-jumping logic
    priority_map = {"EMERGENCY": 3, "URGENT": 2, "NORMAL": 1}

    for r in reports:
        report_data = LabReportOut.model_validate(r)
        
        # Calculate ETA only if PENDING
        if r.status == LabStatus.PENDING:
            # How many patients are ahead of *this* report's patient?
            current_patient = r.patient
            if current_patient:
                # Get all pending lab tests assigned to the same Lab Tech
                # that have higher priority, OR same priority but older timestamp
                curr_pri = priority_map.get(current_patient.priority, 1)
                
                ahead = db.query(LabReport).join(Patient).filter(
                    LabReport.status == LabStatus.PENDING,
                    LabReport.labtech_id == r.labtech_id,
                    LabReport.id != r.id
                ).all()

                queue_pos = 0
                for a in ahead:
                    a_pri = priority_map.get(a.patient.priority, 1)
                    if a_pri > curr_pri:
                        queue_pos += 1
                    elif a_pri == curr_pri and a.created_at < r.created_at:
                        queue_pos += 1

                report_data.queue_position = queue_pos
                report_data.estimated_wait_mins = (queue_pos + 1) * 30  # Assume 30 mins per test

        out.append(report_data)

    return out


# ── POST /assign — Nurse only ─────────────────────────────────────────────

@router.post("/assign", response_model=List[LabReportOut], status_code=201)
def assign_tests(
    requests: List[LabRequestCreate],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Nurse assigns specific lab tests to Lab Technicians."""
    if current_user.role != UserRole.NURSE:
        raise HTTPException(403, "Only nurses can assign specific lab tests")

    added = []
    patient_id = None
    
    for r in requests:
        patient_id = r.patient_id
        code = generate_report_code(db)
        
        # Auto-assign labtech if not provided
        l_id = r.labtech_id
        if not l_id:
            techs = db.query(User).filter(User.role == UserRole.LAB_TECHNICIAN).all()
            if techs:
                l_id = min(techs, key=lambda t: len([lb for lb in t.lab_reports_assigned if lb.status != LabStatus.COMPLETED])).id

        report = LabReport(
            report_code = code,
            patient_id  = r.patient_id,
            doctor_id   = 1, # Placeholder, real doctor ID can be fetched from patient if needed
            labtech_id  = l_id,
            test_type   = r.test_type,
            status      = LabStatus.PENDING,
        )
        db.add(report)
        added.append(report)
        db.commit()
        db.refresh(report)

    # Log workflow transition — LAB ASSIGNED (RED: waiting for lab)
    if patient_id:
        p = db.query(Patient).filter(Patient.id == patient_id).first()
        test_names = ", ".join(r.test_type for r in added)
        if p:
            p.status = "LAB_IN_PROGRESS"
            log_movement(
                db,
                patient_id   = patient_id,
                reference_id = added[0].id,
                ref_type     = "LAB",
                from_dept    = "NURSE",
                to_dept      = "LAB",
                action       = f"🧪 Lab Test Assigned: {test_names} — Awaiting Lab Tech",
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

    # Log movement — lab report uploaded (GREEN)
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
    
    # Auto-trigger Doctor Review Pending (RED)
    patient.status = "DOCTOR_REVIEW_PENDING"
    log_movement(
        db,
        patient_id   = patient.id,
        reference_id = report.id,
        ref_type     = "DOCTOR",
        from_dept    = "LAB",
        to_dept      = "DOCTOR",
        action       = f"📋 Doctor Review Pending for {test_name}",
        updated_by   = current_user.id,
        status       = "PENDING",
        color_code   = LogColor.RED,
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
            p.status = "DOCTOR_REVIEW_PENDING"

        # GREEN log for Lab Completed
        log_movement(
            db,
            patient_id   = report.patient_id,
            reference_id = report.id,
            ref_type     = "LAB",
            from_dept    = "LAB",
            to_dept      = "DOCTOR",
            action       = f"✅ All Lab reports uploaded",
            updated_by   = current_user.id,
            status       = "COMPLETED",
            color_code   = LogColor.GREEN,
        )

        # RED log for Doctor Review Pending
        log_movement(
            db,
            patient_id   = report.patient_id,
            reference_id = report.id,
            ref_type     = "DOCTOR",
            from_dept    = "LAB",
            to_dept      = "DOCTOR",
            action       = f"📋 Doctor Review Pending for Lab Results",
            updated_by   = current_user.id,
            status       = "PENDING",
            color_code   = LogColor.RED,
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
