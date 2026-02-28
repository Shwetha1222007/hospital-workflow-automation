from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime
from app.database import get_db
from app.models.request import PatientRequest, RequestStatus, Priority, AuditLog
from app.models.workflow import Workflow
from app.models.user import User, UserRole
from app.core.dependencies import get_current_user
import random, string

router = APIRouter()


def make_code():
    s = "".join(random.choices(string.digits, k=4))
    return f"REQ-{s}"


class RequestCreate(BaseModel):
    patient_id: int
    workflow_id: int
    query: str
    priority: str = "MEDIUM"


class RequestOut(BaseModel):
    id: int
    request_code: str
    patient_id: int
    workflow_id: int
    query: str
    status: str
    priority: str
    current_dept_idx: int
    created_at: datetime

    class Config:
        from_attributes = True


class AdvanceBody(BaseModel):
    note: Optional[str] = None


class EscalateBody(BaseModel):
    reason: str


@router.get("/", response_model=List[RequestOut])
def get_requests(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role == UserRole.PATIENT and current_user.patient_profile:
        return db.query(PatientRequest).filter(PatientRequest.patient_id == current_user.patient_profile.id).all()
    return db.query(PatientRequest).all()


@router.post("/", response_model=RequestOut, status_code=201)
def create_request(data: RequestCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    wf = db.query(Workflow).filter(Workflow.id == data.workflow_id).first()
    if not wf:
        raise HTTPException(404, "Workflow not found")
    req = PatientRequest(
        request_code=make_code(),
        patient_id=data.patient_id,
        workflow_id=data.workflow_id,
        query=data.query,
        priority=Priority(data.priority.upper()),
        status=RequestStatus.ASSIGNED,
        current_dept_idx=0,
    )
    db.add(req)
    db.flush()
    log = AuditLog(request_id=req.id, dept_key=wf.steps[0] if wf.steps else "", action="ASSIGNED", note="Request created")
    db.add(log)
    db.commit()
    db.refresh(req)
    return req


@router.patch("/{req_id}/advance", response_model=RequestOut)
def advance(req_id: int, body: AdvanceBody, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    req = db.query(PatientRequest).filter(PatientRequest.id == req_id).first()
    if not req:
        raise HTTPException(404, "Not found")
    wf = req.workflow
    next_idx = req.current_dept_idx + 1
    if next_idx >= len(wf.steps):
        raise HTTPException(400, "Already at last step")
    req.current_dept_idx = next_idx
    req.status = RequestStatus.COMPLETED if next_idx >= len(wf.steps) - 1 else RequestStatus.TRANSFERRED
    log = AuditLog(request_id=req.id, dept_key=wf.steps[next_idx], action=req.status.value, note=body.note or "Advanced")
    db.add(log)
    db.commit()
    db.refresh(req)
    return req


@router.patch("/{req_id}/escalate", response_model=RequestOut)
def escalate(req_id: int, body: EscalateBody, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    req = db.query(PatientRequest).filter(PatientRequest.id == req_id).first()
    if not req:
        raise HTTPException(404, "Not found")
    req.status = RequestStatus.ESCALATED
    log = AuditLog(request_id=req.id, dept_key="", action="ESCALATED", note=body.reason)
    db.add(log)
    db.commit()
    db.refresh(req)
    return req
