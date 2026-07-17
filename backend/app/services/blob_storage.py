"""Stockage objet Vercel Blob avec repli filesystem local."""
from __future__ import annotations

import logging
import uuid
from dataclasses import dataclass
from pathlib import Path
from urllib.parse import urlparse

from app.core import config
from app.core.config import UPLOADS_DIR

logger = logging.getLogger(__name__)

_BLOB_HOST_SUFFIXES = (
    ".blob.vercel-storage.com",
    ".public.blob.vercel-storage.com",
    ".private.blob.vercel-storage.com",
)


@dataclass(frozen=True)
class MediaPayload:
    content: bytes
    content_type: str
    suffix: str


def is_remote_media_url(url: str | None) -> bool:
    if not url:
        return False
    return url.startswith("http://") or url.startswith("https://")


def is_vercel_blob_url(url: str | None) -> bool:
    if not is_remote_media_url(url):
        return False
    host = (urlparse(url).hostname or "").lower()
    return any(host.endswith(suffix) for suffix in _BLOB_HOST_SUFFIXES)


def is_private_blob_url(url: str | None) -> bool:
    if not is_remote_media_url(url):
        return False
    host = (urlparse(url).hostname or "").lower()
    return ".private.blob.vercel-storage.com" in host


def put_bytes(
    *,
    folder: str,
    data: bytes,
    ext: str,
    content_type: str,
) -> str:
    """Upload bytes → URL Blob (ou chemin /uploads/... en local)."""
    name = f"{uuid.uuid4().hex}{ext}"
    pathname = f"{folder.strip('/')}/{name}"
    if config.blob_storage_enabled():
        return _put_blob(pathname, data, content_type)
    if config.IS_PRODUCTION:
        raise RuntimeError("BLOB_READ_WRITE_TOKEN required for uploads in production")
    return _put_local(folder, name, data)


def copy_media_url(source_url: str | None, *, folder: str) -> str | None:
    """Duplique un média pour isoler occurrence / template. No-op si vide."""
    if not source_url or not source_url.strip():
        return None
    url = source_url.strip()
    if config.blob_storage_enabled() and is_remote_media_url(url):
        return _copy_blob(url, folder)
    if url.startswith("/uploads/"):
        return _copy_local(url, folder)
    if config.blob_storage_enabled():
        return _copy_blob(url, folder)
    return url


def delete_media_url(url: str | None) -> None:
    if not url or not url.strip():
        return
    cleaned = url.strip()
    try:
        if is_remote_media_url(cleaned):
            if config.blob_storage_enabled():
                _delete_blob(cleaned)
            return
        if cleaned.startswith("/uploads/"):
            _delete_local(cleaned)
    except Exception:
        logger.exception("Failed to delete media %s", cleaned)


def read_media_bytes(url: str | None) -> tuple[bytes, str] | None:
    """Lit le contenu d'un média (Blob ou local). Retourne (bytes, suffixe)."""
    payload = fetch_media(url)
    if not payload:
        return None
    return payload.content, payload.suffix


def fetch_media(url: str | None) -> MediaPayload | None:
    if not url or not url.strip():
        return None
    cleaned = url.strip()
    if is_remote_media_url(cleaned):
        return _fetch_remote(cleaned)
    local = _read_local(cleaned)
    if not local:
        return None
    data, suffix = local
    return MediaPayload(content=data, content_type=_guess_content_type(suffix), suffix=suffix)


def _blob_access() -> str:
    return config.BLOB_ACCESS


def _client():
    from vercel.blob import BlobClient

    return BlobClient(token=config.BLOB_READ_WRITE_TOKEN)


def _put_blob(pathname: str, data: bytes, content_type: str) -> str:
    result = _client().put(
        pathname,
        data,
        access=_blob_access(),
        content_type=content_type,
        add_random_suffix=False,
    )
    return result.url


def _copy_blob(source_url: str, folder: str) -> str:
    ext = Path(source_url.split("?", 1)[0]).suffix or ".bin"
    dst = f"{folder.strip('/')}/{uuid.uuid4().hex}{ext}"
    result = _client().copy(
        source_url, dst, access=_blob_access(), add_random_suffix=False
    )
    return result.url


def _delete_blob(url: str) -> None:
    _client().delete(url)


def _fetch_remote(url: str) -> MediaPayload | None:
    """Lit uniquement les URLs Vercel Blob — pas de HTTP générique (anti-SSRF)."""
    if not is_vercel_blob_url(url):
        logger.warning("Rejected remote media fetch (not vercel blob): %s", url[:120])
        return None
    if not config.blob_storage_enabled():
        logger.warning("Blob token missing; cannot fetch private/remote media")
        return None
    try:
        result = _client().get(url, access=_blob_access())
        suffix = Path(result.pathname).suffix or Path(url.split("?", 1)[0]).suffix
        content_type = result.content_type or _guess_content_type(suffix)
        return MediaPayload(
            content=result.content, content_type=content_type, suffix=suffix
        )
    except Exception:
        logger.exception("Blob get failed for %s", url)
        return None


def _put_local(folder: str, name: str, data: bytes) -> str:
    target_dir = UPLOADS_DIR / folder.strip("/")
    target_dir.mkdir(parents=True, exist_ok=True)
    (target_dir / name).write_bytes(data)
    return f"/uploads/{folder.strip('/')}/{name}"


def _copy_local(source_url: str, folder: str) -> str | None:
    relative = source_url.lstrip("/").removeprefix("uploads/")
    if not relative or ".." in relative.replace("\\", "/"):
        return source_url
    source = UPLOADS_DIR / relative
    if not source.is_file():
        return source_url
    ext = source.suffix or ".bin"
    name = f"{uuid.uuid4().hex}{ext}"
    return _put_local(folder, name, source.read_bytes())


def _delete_local(url: str) -> None:
    relative = url.lstrip("/").removeprefix("uploads/")
    if not relative or ".." in relative.replace("\\", "/"):
        return
    path = UPLOADS_DIR / relative
    if path.is_file():
        path.unlink()


def _read_local(url: str) -> tuple[bytes, str] | None:
    relative = url.lstrip("/").removeprefix("uploads/")
    if relative.startswith("uploads/"):
        relative = relative[len("uploads/") :]
    if not relative or ".." in relative.replace("\\", "/"):
        return None
    path = UPLOADS_DIR / relative
    if not path.is_file():
        return None
    return path.read_bytes(), path.suffix


def _guess_content_type(suffix: str) -> str:
    mapping = {
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
    return mapping.get(suffix.lower(), "application/octet-stream")
