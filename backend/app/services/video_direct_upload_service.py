"""Crée une intention d'upload vidéo (PUT Blob ou proxy multipart)."""
from __future__ import annotations

import uuid

from app.core import config
from app.domain.blob_client_token import generate_blob_client_token
from app.domain.video_upload_intent import video_extension, video_folder_for_purpose
from app.services.media_upload_service import VIDEO_MAX_BYTES

BLOB_API_URL = "https://vercel.com/api/blob"
BLOB_API_VERSION = "11"
ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"]


def create_video_upload_intent(purpose: str, content_type: str) -> dict:
    folder = video_folder_for_purpose(purpose)
    if not config.blob_storage_enabled():
        return {"mode": "proxy"}
    pathname = f"{folder}/{uuid.uuid4().hex}{video_extension(content_type)}"
    token = generate_blob_client_token(
        read_write_token=config.BLOB_READ_WRITE_TOKEN,
        pathname=pathname,
        allowed_content_types=ALLOWED_VIDEO_TYPES,
        maximum_size_in_bytes=VIDEO_MAX_BYTES,
    )
    return {
        "mode": "direct",
        "pathname": pathname,
        "token": token,
        "access": config.BLOB_ACCESS,
        "apiUrl": BLOB_API_URL,
        "apiVersion": BLOB_API_VERSION,
        "kind": "video",
    }
