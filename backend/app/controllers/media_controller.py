"""Proxy authentifié pour médias Blob privés et /uploads locaux."""
from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.auth.actor import load_actor
from app.dependencies import get_db
from app.repositories.user_repository import UserRepository
from app.services import blob_storage
from app.services.media_access_service import actor_can_access_media_url

logger = logging.getLogger(__name__)
router = APIRouter()


def _serve_media(request: Request, media_url: str, db: Session) -> Response:
    actor = load_actor(request, UserRepository(db))
    cleaned = media_url.strip()
    allowed = blob_storage.is_vercel_blob_url(cleaned) or cleaned.startswith("/uploads/")
    if not allowed:
        logger.warning("media proxy rejected url kind")
        raise HTTPException(status_code=400, detail="URL media invalide")

    if not actor_can_access_media_url(db, actor, cleaned):
        logger.warning("media proxy forbidden for user=%s", actor.user_id)
        raise HTTPException(status_code=403, detail="אין הרשאה למדיה זו")

    payload = blob_storage.fetch_media(cleaned)
    if not payload:
        raise HTTPException(status_code=404, detail="Media introuvable")

    return Response(
        content=payload.content,
        media_type=payload.content_type,
        headers={"Cache-Control": "private, max-age=300"},
    )


@router.get("/proxy")
def proxy_media(
    request: Request,
    src: str = Query(..., min_length=8, description="URL Blob ou /uploads/..."),
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
