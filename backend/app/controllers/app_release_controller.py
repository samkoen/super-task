from typing import Any

from fastapi import APIRouter, Body, Depends, File, Request, UploadFile
from sqlalchemy.orm import Session

from app.auth.actor import load_actor, require_admin_actor
from app.controllers.controller_helpers import handle_controller_errors
from app.dependencies import get_db
from app.repositories.app_release_repository import AppReleaseRepository
from app.repositories.user_repository import UserRepository
from app.services.app_release_service import AppReleaseService

router = APIRouter()


def get_service(db: Session = Depends(get_db)) -> AppReleaseService:
    return AppReleaseService(AppReleaseRepository(db))


@router.get("/latest")
@handle_controller_errors
def latest_release(
    request: Request,
    service: AppReleaseService = Depends(get_service),
    db: Session = Depends(get_db),
):
    load_actor(request, UserRepository(db))
    return service.latest_for_client()


@router.get("")
@handle_controller_errors
def list_releases(
    request: Request,
    service: AppReleaseService = Depends(get_service),
    db: Session = Depends(get_db),
):
    actor = require_admin_actor(request, UserRepository(db))
    return service.list_for_admin(actor)


@router.post("/intent")
@handle_controller_errors
def upload_intent(
    request: Request,
    data: dict[str, Any] | None = Body(default=None),
    service: AppReleaseService = Depends(get_service),
    db: Session = Depends(get_db),
):
    actor = require_admin_actor(request, UserRepository(db))
    payload = data or {}
    return service.create_upload_intent(actor, payload.get("size"))


@router.post("/upload")
@handle_controller_errors
async def upload_apk(
    request: Request,
    apk: UploadFile = File(...),
    service: AppReleaseService = Depends(get_service),
    db: Session = Depends(get_db),
):
    actor = require_admin_actor(request, UserRepository(db))
    data = await apk.read()
    return service.upload_proxy(
        actor, data, apk.filename or "", apk.content_type or ""
    )


@router.post("", status_code=201)
@handle_controller_errors
def publish_release(
    request: Request,
    data: dict[str, Any] | None = Body(default=None),
    service: AppReleaseService = Depends(get_service),
    db: Session = Depends(get_db),
):
    actor = require_admin_actor(request, UserRepository(db))
    payload = data or {}
    item = service.publish(
        actor,
        version_name=payload.get("version_name"),
        apk_url=str(payload.get("apk_url") or ""),
    )
    return {"message": "הגרסה פורסמה", "release": item}
