from fastapi import APIRouter, Body, Depends, Query, Request
from sqlalchemy.orm import Session

from app.auth.actor import load_actor
from app.controllers.controller_helpers import handle_controller_errors
from app.dependencies import get_db
from app.repositories.branch_repository import BranchRepository
from app.repositories.task_gallery_repository import TaskGalleryRepository
from app.repositories.task_occurrence_repository import TaskOccurrenceRepository
from app.repositories.task_template_repository import TaskTemplateRepository
from app.repositories.user_repository import UserRepository
from app.services.task_gallery_service import TaskGalleryService

router = APIRouter()


def get_gallery_service(db: Session = Depends(get_db)) -> TaskGalleryService:
    return TaskGalleryService(
        TaskGalleryRepository(db),
        BranchRepository(db),
        TaskOccurrenceRepository(db),
        TaskTemplateRepository(db),
    )


@router.get("")
@handle_controller_errors
def list_gallery_items(
    request: Request,
    task_kind: str | None = Query(None),
    db: Session = Depends(get_db),
    service: TaskGalleryService = Depends(get_gallery_service),
):
    actor = load_actor(request, UserRepository(db))
    items = service.list_items(actor, task_kind=task_kind)
    return {"items": items}


@router.post("", status_code=201)
@handle_controller_errors
def create_gallery_item(
    request: Request,
    body: dict = Body(...),
    db: Session = Depends(get_db),
    service: TaskGalleryService = Depends(get_gallery_service),
):
    actor = load_actor(request, UserRepository(db))
    item = service.create_item(actor, body)
    db.commit()
    return {"item": item, "message": "פריט נוסף לגלריה"}


@router.post("/from-occurrence/{occurrence_id}", status_code=201)
@handle_controller_errors
def create_from_occurrence(
    occurrence_id: str,
    request: Request,
    db: Session = Depends(get_db),
    service: TaskGalleryService = Depends(get_gallery_service),
):
    actor = load_actor(request, UserRepository(db))
    item = service.create_from_occurrence(actor, occurrence_id)
    db.commit()
    return {"item": item, "message": "המשימה נוספה לגלריה"}


@router.post("/from-template/{template_id}", status_code=201)
@handle_controller_errors
def create_from_template(
    template_id: str,
    request: Request,
    db: Session = Depends(get_db),
    service: TaskGalleryService = Depends(get_gallery_service),
):
    actor = load_actor(request, UserRepository(db))
    item = service.create_from_template(actor, template_id)
    db.commit()
    return {"item": item, "message": "התבנית נוספה לגלריה"}


@router.patch("/{item_id}")
@handle_controller_errors
def update_gallery_item(
    item_id: str,
    request: Request,
    body: dict = Body(...),
    db: Session = Depends(get_db),
    service: TaskGalleryService = Depends(get_gallery_service),
):
    actor = load_actor(request, UserRepository(db))
    item = service.update_item(actor, item_id, body)
    db.commit()
    return {"item": item, "message": "פריט הגלריה עודכן"}


@router.delete("/{item_id}")
@handle_controller_errors
def delete_gallery_item(
    item_id: str,
    request: Request,
    db: Session = Depends(get_db),
    service: TaskGalleryService = Depends(get_gallery_service),
):
    actor = load_actor(request, UserRepository(db))
    service.delete_item(actor, item_id)
    db.commit()
    return {"ok": True, "message": "פריט הגלריה נמחק"}
