"""Pause employé (הפסקה)."""
from __future__ import annotations

from fastapi import APIRouter, Body, Depends, Request
from sqlalchemy.orm import Session

from app.auth.actor import load_actor
from app.controllers.controller_helpers import handle_controller_errors
from app.dependencies import get_db
from app.repositories.employee_break_repository import EmployeeBreakRepository
from app.repositories.notification_repository import NotificationRepository
from app.repositories.task_occurrence_repository import TaskOccurrenceRepository
from app.repositories.user_repository import UserRepository
from app.services.employee_activity_service import EmployeeActivityService
from app.services.notification_service import NotificationService

router = APIRouter()


def _service(db: Session, *, notifications: bool = False) -> EmployeeActivityService:
    return EmployeeActivityService(
        UserRepository(db),
        TaskOccurrenceRepository(db),
        NotificationRepository(db) if notifications else None,
        EmployeeBreakRepository(db),
    )


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


@router.post("/break/ring")
@handle_controller_errors
def ring_on_break(
    request: Request,
    body: dict = Body(default=None),
    db: Session = Depends(get_db),
):
    actor = load_actor(request, UserRepository(db))
    target_id = str((body or {}).get("user_id") or "")
    result = _service(db, notifications=True).ring_on_break(actor, target_id)
    pending = result.pop("pending", [])
    db.commit()
    NotificationService.push_task_event_sse(pending)
    return result
