"""Intention d'upload vidéo — proxy local ou PUT présigné R2."""
from __future__ import annotations

import logging
import uuid

from app.core import config
from app.domain.video_upload_intent import video_extension, video_folder_for_purpose
from app.services import blob_storage
from app.services.media_upload_service import VIDEO_MAX_BYTES

logger = logging.getLogger(__name__)


def should_use_direct_put_intent() -> bool:
    """PUT navigateur → R2 en prod. En local : proxy (pas de bucket)."""
    return config.object_storage_enabled() and config.IS_PRODUCTION


def create_video_upload_intent(purpose: str, content_type: str) -> dict:
    folder = video_folder_for_purpose(purpose)
    mime = (content_type or "").split(";")[0].strip().lower() or "video/mp4"
    if not should_use_direct_put_intent():
        logger.info("video-intent purpose=%s mode=proxy", purpose)
        return {"mode": "proxy"}
    key = f"{folder}/{uuid.uuid4().hex}{video_extension(mime)}"
    put_url = blob_storage.presign_put_url(key, mime)
    logger.info("video-intent purpose=%s mode=direct", purpose)
    return {
        "mode": "direct",
        "putUrl": put_url,
        "headers": {"Content-Type": mime},
        "url": blob_storage.object_url_for_key(key),
        "pathname": key,
        "kind": "video",
        "maxBytes": VIDEO_MAX_BYTES,
    }
