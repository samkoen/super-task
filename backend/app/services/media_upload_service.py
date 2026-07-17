"""Upload média tâche / issue — compression photo + Blob ou disque local."""
from __future__ import annotations

from pathlib import Path

from fastapi import HTTPException, UploadFile

from app.domain.media_compression import compress_photo_bytes
from app.services import blob_storage

PHOTO_MAX_BYTES = 10 * 1024 * 1024
VIDEO_MAX_BYTES = 50 * 1024 * 1024
AUDIO_MAX_BYTES = 20 * 1024 * 1024

PHOTO_ALLOWED_EXT = {".jpg", ".jpeg", ".png", ".gif", ".webp"}
VIDEO_ALLOWED_EXT = {".mp4", ".webm", ".mov", ".mpeg", ".mpg"}
AUDIO_ALLOWED_EXT = {".mp3", ".wav", ".ogg", ".webm", ".m4a", ".aac"}

_CONTENT_TYPES = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".mp4": "video/mp4",
    ".webm": "video/webm",
    ".mov": "video/quicktime",
    ".mpeg": "video/mpeg",
    ".mpg": "video/mpeg",
    ".mp3": "audio/mpeg",
    ".wav": "audio/wav",
    ".ogg": "audio/ogg",
    ".m4a": "audio/mp4",
    ".aac": "audio/aac",
}

_KIND_CONFIG = {
    "photo": (PHOTO_ALLOWED_EXT, PHOTO_MAX_BYTES),
    "video": (VIDEO_ALLOWED_EXT, VIDEO_MAX_BYTES),
    "audio": (AUDIO_ALLOWED_EXT, AUDIO_MAX_BYTES),
}


async def upload_attachment(*, kind: str, folder: str, file: UploadFile) -> dict:
    allowed_ext, max_bytes = _kind_config_for(kind)
    ext = Path(file.filename or "").suffix.lower()
    if ext not in allowed_ext:
        raise HTTPException(status_code=400, detail="סוג קובץ לא נתמך")
    data = await file.read()
    if len(data) > max_bytes:
        limit_mb = max_bytes // (1024 * 1024)
        raise HTTPException(status_code=400, detail=f"הקובץ גדול מדי (מקסימום {limit_mb}MB)")
    data, ext, content_type = _prepare_payload(kind, data, ext)
    url = blob_storage.put_bytes(
        folder=folder,
        data=data,
        ext=ext,
        content_type=content_type,
    )
    return {"url": url, "kind": kind}


def _kind_config_for(kind: str) -> tuple[set[str], int]:
    config = _KIND_CONFIG.get(kind)
    if not config:
        raise HTTPException(status_code=400, detail="סוג קובץ לא נתמך")
    return config


def _prepare_payload(kind: str, data: bytes, ext: str) -> tuple[bytes, str, str]:
    if kind == "photo":
        try:
            return compress_photo_bytes(data)
        except Exception as exc:
            raise HTTPException(status_code=400, detail="תמונה לא תקינה") from exc
    content_type = _CONTENT_TYPES.get(ext, "application/octet-stream")
    return data, ext, content_type
