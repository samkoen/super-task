from typing import Any

from fastapi import APIRouter, Body, Depends, Request
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from app.auth.actor import load_actor
from app.controllers.controller_helpers import handle_controller_errors
from app.dependencies import get_db
from app.repositories.app_setting_repository import AppSettingRepository
from app.repositories.user_repository import UserRepository
from app.services.media_retention_settings_service import MediaRetentionSettingsService

router = APIRouter()


def get_service(db: Session = Depends(get_db)) -> MediaRetentionSettingsService:
    return MediaRetentionSettingsService(AppSettingRepository(db))


@router.get("/media-retention")
@handle_controller_errors
def read_media_retention(
    request: Request,
    service: MediaRetentionSettingsService = Depends(get_service),
    db: Session = Depends(get_db),
):
    actor = load_actor(request, UserRepository(db))
    return service.read(actor)


@router.put("/media-retention")
@handle_controller_errors
def update_media_retention(
    request: Request,
    data: dict[str, Any] | None = Body(default=None),
    service: MediaRetentionSettingsService = Depends(get_service),
    db: Session = Depends(get_db),
):
    actor = load_actor(request, UserRepository(db))
    if not data or "retention_days" not in data:
        return JSONResponse({"error": "חסרים נתונים"}, status_code=400)
    saved = service.update(actor, data.get("retention_days"))
    return {"message": "ההגדרה נשמרה", **saved}
