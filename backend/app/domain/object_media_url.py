"""URLs média : R2, Blob Vercel héritage, /uploads local."""
from __future__ import annotations

from dataclasses import dataclass
from urllib.parse import urlparse


@dataclass(frozen=True)
class MediaPayload:
    content: bytes
    content_type: str
    suffix: str


_CONTENT_TYPES = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".mp4": "video/mp4",
    ".webm": "video/webm",
    ".mov": "video/quicktime",
    ".mp3": "audio/mpeg",
    ".wav": "audio/wav",
    ".ogg": "audio/ogg",
    ".m4a": "audio/mp4",
    ".aac": "audio/aac",
}


def guess_content_type(suffix: str) -> str:
    return _CONTENT_TYPES.get(suffix.lower(), "application/octet-stream")

VERCEL_BLOB_HOST_MARKERS = (
    ".blob.vercel-storage.com",
    ".public.blob.vercel-storage.com",
    ".private.blob.vercel-storage.com",
)
R2_HOST_SUFFIXES = (
    ".r2.cloudflarestorage.com",
    ".r2.dev",
)


def is_remote_http_url(url: str | None) -> bool:
    if not url:
        return False
    return url.startswith("http://") or url.startswith("https://")


def hostname_of(url: str) -> str:
    return (urlparse(url).hostname or "").lower()


def is_vercel_blob_url(url: str | None) -> bool:
    if not is_remote_http_url(url):
        return False
    host = hostname_of(url or "")
    return any(host.endswith(marker) for marker in VERCEL_BLOB_HOST_MARKERS)


def is_r2_media_url(url: str | None, *, endpoint_host: str = "") -> bool:
    if not is_remote_http_url(url):
        return False
    host = hostname_of(url or "")
    if any(host.endswith(suffix) for suffix in R2_HOST_SUFFIXES):
        return True
    expected = (endpoint_host or "").lower().strip()
    return bool(expected) and host == expected


def is_private_object_url(url: str | None, *, endpoint_host: str = "") -> bool:
    return is_r2_media_url(url, endpoint_host=endpoint_host)


def is_local_upload_path(url: str | None) -> bool:
    return bool(url) and url.startswith("/uploads/")


def stored_object_url(endpoint: str, bucket: str, key: str) -> str:
    return f"{endpoint.rstrip('/')}/{bucket.strip('/')}/{key.lstrip('/')}"


def key_from_stored_url(url: str, bucket: str) -> str | None:
    path = urlparse(url).path.lstrip("/")
    prefix = f"{bucket.strip('/')}/"
    if not path.startswith(prefix):
        return None
    key = path[len(prefix) :]
    return key or None
