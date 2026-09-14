"""Intention d'upload vidéo — proxy local ou PUT présigné objet."""
from __future__ import annotations

VIDEO_PURPOSES = {
    "task": "task_videos",
    "chat": "direct_chat_videos",
    "issue": "issue_videos",
}

VIDEO_CONTENT_TYPES = {
    "video/mp4": ".mp4",
    "video/webm": ".webm",
    "video/quicktime": ".mov",
}


def video_folder_for_purpose(purpose: str) -> str:
    folder = VIDEO_PURPOSES.get(purpose)
    if not folder:
        raise ValueError("סוג העלאה לא נתמך")
    return folder


def video_extension(content_type: str) -> str:
    mime = (content_type or "").split(";")[0].strip().lower()
    return VIDEO_CONTENT_TYPES.get(mime, ".mp4")


def require_video_byte_size(size_bytes: object, max_bytes: int) -> int:
    try:
        size = int(size_bytes)
    except (TypeError, ValueError):
        raise ValueError("חסר גודל קובץ") from None
    if size < 1 or size > max_bytes:
        limit_mb = max_bytes // (1024 * 1024)
        raise ValueError(f"הקובץ גדול מדי (מקסימום {limit_mb}MB)")
    return size
