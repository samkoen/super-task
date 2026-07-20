"""Pause employé (הפסקה)."""
from __future__ import annotations

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.auth.actor import load_actor
from app.controllers.controller_helpers import handle_controller_errors
from app.dependencies import get_db
from app.repositories.task_occurrence_repository import TaskOccurrenceRepository
from app.repositories.user_repository import UserRepository
from app.services.employee_activity_service import EmployeeActivityService

router = APIRouter()


def _service(db: Session) -> EmployeeActivityService:
    return EmployeeActivityService(UserRepository(db), TaskOccurrenceRepository(db))


@router.get("/break")
@handle_controller_errors
def get_break(request: Request, db: Session = Depends(get_db)):
    actor = load_actor(request, UserRepository(db))
    return _service(db).get_break_state(actor.user_id)


@router.post("/break/start")
@handle_controller_errors
def start_break(request: Request, db: Session = Depends(get_db)):
    actor = load_actor(request, UserRepository(db))
    result = _service(db).set_break(actor.user_id, on_break=True)
    db.commit()
    return {"message": "הפסקה התחילה", **result}


@router.post("/break/end")
@handle_controller_errors
def end_break(request: Request, db: Session = Depends(get_db)):
    actor = load_actor(request, UserRepository(db))
    result = _service(db).set_break(actor.user_id, on_break=False)
    db.commit()
    return {"message": "ההפסקה הסתיימה", **result}
