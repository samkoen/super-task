"""In-app notifications API."""

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session

from app.auth.actor import load_actor
from app.controllers.controller_helpers import handle_controller_errors
from app.dependencies import get_db
from app.repositories.notification_repository import NotificationRepository
from app.repositories.user_repository import UserRepository
from app.services.notification_service import NotificationService

router = APIRouter()


def get_service(db: Session = Depends(get_db)) -> NotificationService:
    return NotificationService(NotificationRepository(db), UserRepository(db))


@router.get("")
@handle_controller_errors
def list_notifications(
    request: Request,
    unread_only: bool = Query(False),
    service: NotificationService = Depends(get_service),
    db: Session = Depends(get_db),
):
    actor = load_actor(request, UserRepository(db))
    return {
        "items": service.list_for_user(actor.user_id, unread_only=unread_only),
        "unread_count": service.unread_count(actor.user_id),
    }


@router.post("/{notification_id}/read")
@handle_controller_errors
def mark_notification_read(
    notification_id: str,
    request: Request,
    service: NotificationService = Depends(get_service),
    db: Session = Depends(get_db),
):
    actor = load_actor(request, UserRepository(db))
    item = service.mark_read(actor.user_id, notification_id)
    if not item:
        raise HTTPException(status_code=404, detail="התראה לא נמצאה")
    return {"notification": item}


@router.post("/read-all")
@handle_controller_errors
def mark_all_notifications_read(
    request: Request,
    service: NotificationService = Depends(get_service),
    db: Session = Depends(get_db),
):
    actor = load_actor(request, UserRepository(db))
    count = service.mark_all_read(actor.user_id)
    return {"marked": count}
