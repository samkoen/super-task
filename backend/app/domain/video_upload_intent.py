"""Intention d'upload vidéo — proxy local ou PUT direct Blob."""
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
