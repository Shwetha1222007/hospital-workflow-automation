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

router = APIRouter()

os.makedirs(settings.UPLOAD_DIR, exist_ok=True)


class LabRequestCreate(BaseModel):
    patient_id: int
    test_type: str
    labtech_id: Optional[int] = None


class LabReportOut(BaseModel):
    id: int
    report_code: str
    patient_id: int
    patient_code: Optional[str] = None
    patient_name: Optional[str] = None
    patient_priority: Optional[str] = None
    doctor_id: int
    labtech_id: Optional[int] = None
    test_type: str
    status: str
    file_path: Optional[str] = None
    file_type: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


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


def _enrich_report(r: LabReport) -> LabReportOut:
    out = LabReportOut.model_validate(r)
    if r.patient:
        out.patient_code     = r.patient.patient_code
        out.patient_name     = r.patient.name
        out.patient_priority = r.patient.priority
    return out


# ── GET — filtered by role ────────────────────────────────────────────────────

@router.get("/", response_model=List[LabReportOut])
def get_reports(
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(LabReport)

    if current_user.role == UserRole.LAB_TECHNICIAN:
        q = q.filter(LabReport.labtech_id == current_user.id)
    elif current_user.role == UserRole.DOCTOR:
        q = q.filter(LabReport.doctor_id == current_user.id)

    if status:
        q = q.filter(LabReport.status == status.upper())

    reports = q.order_by(LabReport.created_at.desc()).all()
    return [_enrich_report(r) for r in reports]


# ── POST /prescribe — Doctor only ─────────────────────────────────────────────

@router.post("/prescribe", response_model=List[LabReportOut], status_code=201)
def prescribe_tests(
    requests: List[LabRequestCreate],
    db: Session = Depends(get_db),
    current_user: User = Depends(require_doctor),
):
    added = []
    patient_id = None

    for r in requests:
        patient_id = r.patient_id
        code = generate_report_code(db)

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
        db.commit()
        db.refresh(report)

    if patient_id:
        log = WorkflowLog(
            patient_id = patient_id,
            stage      = WorkflowStage.LAB,
            status     = WorkflowStatus.ASSIGNED,
            updated_by = current_user.id,
            notes      = f"Doctor prescribed {len(added)} lab test(s). Stage moved to LAB."
        )
        db.add(log)

        p = db.query(Patient).filter(Patient.id == patient_id).first()
        if p:
            p.status = "LAB_PENDING"

        db.commit()

    return [_enrich_report(r) for r in added]


# ── POST /{id}/upload — Lab Technician only ──────────────────────────────────

@router.post("/{report_id}/upload", response_model=LabReportOut)
async def upload_lab_report(
    report_id: int,
    notes: Optional[str] = Form(None),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_lab_tech),
):
    report = db.query(LabReport).filter(LabReport.id == report_id).first()
    if not report:
        raise HTTPException(404, "Lab request not found")

    if current_user.role == UserRole.LAB_TECHNICIAN and report.labtech_id != current_user.id:
        raise HTTPException(403, "You can only upload reports for tests assigned to you")

    allowed = ["application/pdf", "image/jpeg", "image/png", "image/jpg"]
    content_type = file.content_type or ""
    if content_type not in allowed:
        raise HTTPException(400, "Only PDF and image files (JPG, PNG) are allowed")

    ext = os.path.splitext(file.filename)[1] if file.filename else ".pdf"
    safe_filename = f"{report.report_code}_final{ext}"
    file_path = os.path.join(settings.UPLOAD_DIR, safe_filename)

    with open(file_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    file_type = "pdf" if "pdf" in content_type else "image"

    report.file_path  = file_path
    report.file_type  = file_type
    report.status     = LabStatus.COMPLETED
    if notes: report.notes = notes
    report.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(report)

    # Check if all lab tests for this patient are done
    remaining = db.query(LabReport).filter(
        LabReport.patient_id == report.patient_id,
        LabReport.status != LabStatus.COMPLETED
    ).count()

    if remaining == 0:
        # All tests done — log LAB COMPLETED
        lab_done_log = WorkflowLog(
            patient_id = report.patient_id,
            stage      = WorkflowStage.LAB,
            status     = WorkflowStatus.COMPLETED,
            updated_by = current_user.id,
            notes      = f"All lab tests completed. Reports available."
        )
        db.add(lab_done_log)

        # Auto re-add Doctor Visit (PENDING)
        doc_revisit_log = WorkflowLog(
            patient_id = report.patient_id,
            stage      = WorkflowStage.DOCTOR,
            status     = WorkflowStatus.PENDING,
            updated_by = current_user.id,
            notes      = "Lab reports ready. Doctor re-visit automatically scheduled."
        )
        db.add(doc_revisit_log)

        p = db.query(Patient).filter(Patient.id == report.patient_id).first()
        if p:
            p.status = "LAB_COMPLETED"
        db.commit()

    return _enrich_report(report)


@router.patch("/{report_id}/status", response_model=LabReportOut)
def update_status(
    report_id: int,
    data: StatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_lab_tech),
):
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
        log = WorkflowLog(
            patient_id       = report.patient_id,
            stage            = WorkflowStage.LAB,
            status           = WorkflowStatus.IN_PROGRESS,
            assigned_user_id = current_user.id,
            updated_by       = current_user.id,
            notes            = f"Test {report.test_type} is now in progress by {current_user.full_name}."
        )
        db.add(log)

    db.commit()
    db.refresh(report)
    return _enrich_report(report)


@router.get("/{report_id}/download")
def download_report(
    report_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    report = db.query(LabReport).filter(LabReport.id == report_id).first()
    if not report:
        raise HTTPException(404, "Report not found")

    if not report.file_path or not os.path.exists(report.file_path):
        raise HTTPException(404, "File not found on server")

    return FileResponse(report.file_path, filename=os.path.basename(report.file_path))
