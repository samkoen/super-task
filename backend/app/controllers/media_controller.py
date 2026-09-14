"""Proxy authentifié : /uploads en local, redirect GET présignée R2."""
from __future__ import annotations

import logging

from fastapi import APIRouter, Body, Depends, HTTPException, Query, Request
from fastapi.responses import FileResponse, RedirectResponse, Response
from sqlalchemy.orm import Session

from app.auth.actor import load_actor
from app.controllers.controller_helpers import handle_controller_errors
from app.dependencies import get_db
from app.repositories.user_repository import UserRepository
from app.domain.object_media_url import guess_content_type
from app.services import blob_storage
from app.services.media_access_service import actor_can_access_media_url
from app.services.video_direct_upload_service import create_video_upload_intent

logger = logging.getLogger(__name__)
router = APIRouter()


def _require_stored_src(cleaned: str) -> None:
    if blob_storage.is_stored_media_url(cleaned):
        return
    logger.warning("media proxy rejected url kind")
    raise HTTPException(status_code=400, detail="URL media invalide")


def _serve_media(request: Request, media_url: str, db: Session) -> Response:
    actor = load_actor(request, UserRepository(db))
    cleaned = media_url.strip()
    _require_stored_src(cleaned)
    if not actor_can_access_media_url(db, actor, cleaned):
        logger.warning("media proxy forbidden for user=%s", actor.user_id)
        raise HTTPException(status_code=403, detail="אין הרשאה למדיה זו")
    if cleaned.startswith("/uploads/"):
        return _serve_local(cleaned)
    return _redirect_object(cleaned)


def _serve_local(cleaned: str) -> Response:
    path = blob_storage.local_file_path(cleaned)
    if not path:
        raise HTTPException(status_code=404, detail="Media introuvable")
    return FileResponse(
        path,
        media_type=guess_content_type(path.suffix),
        headers={"Cache-Control": "private, max-age=300"},
    )


def _redirect_object(cleaned: str) -> RedirectResponse:
    signed = blob_storage.presign_get_url(cleaned)
    if not signed:
        raise HTTPException(status_code=404, detail="Media introuvable")
    return RedirectResponse(
        url=signed,
        status_code=302,
        headers={"Cache-Control": "private, max-age=60"},
    )


@router.post("/video-intent")
@handle_controller_errors
def video_upload_intent(
    request: Request,
    db: Session = Depends(get_db),
    payload: dict = Body(...),
):
    load_actor(request, UserRepository(db))
    purpose = str(payload.get("purpose") or "")
    content_type = str(payload.get("content_type") or "video/mp4")
    return create_video_upload_intent(purpose, content_type, payload.get("size"))


@router.get("/ready")
def media_ready(
    request: Request,
    src: str = Query(..., min_length=8),
    db: Session = Depends(get_db),
):
    """L'oved poll après upload : le complete n'a pas encore inscrit l'ACL."""
    load_actor(request, UserRepository(db))
    cleaned = src.strip()
    _require_stored_src(cleaned)
    return {"ready": blob_storage.media_is_ready(cleaned)}


@router.get("/proxy")
def proxy_media(
    request: Request,
    src: str = Query(..., min_length=8, description="URL objet ou /uploads/..."),
    db: Session = Depends(get_db),
):
    return _serve_media(request, src, db)


@router.get("")
def proxy_media_legacy(
    request: Request,
    url: str = Query(..., min_length=8),
    db: Session = Depends(get_db),
):
    return _serve_media(request, url, db)
