from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel, Field
from typing import Optional
from app.database import get_db
from app.models.department import Department, Workflow
from app.core.dependencies import get_current_user

dept_router = APIRouter()
wf_router = APIRouter()


class DeptOut(BaseModel):
    id: int
    dept_key: str
    name: str
    icon: Optional[str]
    color: Optional[str]
    staff_count: int

    class Config:
        from_attributes = True


class WorkflowOut(BaseModel):
    id: int
    workflow_key: str
    name: str
    steps: list
    color: Optional[str]

    class Config:
        from_attributes = True


@dept_router.get("/", response_model=List[DeptOut])
def get_depts(db: Session = Depends(get_db)):
    return db.query(Department).all()


@wf_router.get("/", response_model=List[WorkflowOut])
def get_workflows(db: Session = Depends(get_db)):
    return db.query(Workflow).all()
