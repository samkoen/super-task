"""Stockage objet R2 avec repli filesystem local."""
from __future__ import annotations

import logging
import time
import uuid
from pathlib import Path

from app.core import config
from app.core.config import UPLOADS_DIR
from app.domain.object_media_url import (
    MediaPayload,
    guess_content_type,
    is_local_upload_path,
    is_private_object_url,
    is_r2_media_url,
    is_remote_http_url,
    is_vercel_blob_url,
)

logger = logging.getLogger(__name__)

_REMOTE_RETRY_PAUSES = (0.2, 0.6)


def is_remote_media_url(url: str | None) -> bool:
    return is_remote_http_url(url)


def is_private_blob_url(url: str | None) -> bool:
    return is_private_object_url(url, endpoint_host=config.r2_endpoint_host())


def is_object_store_url(url: str | None) -> bool:
    return is_r2_media_url(url, endpoint_host=config.r2_endpoint_host())


def is_stored_media_url(url: str | None) -> bool:
    cleaned = (url or "").strip()
    if is_local_upload_path(cleaned):
        return True
    return is_object_store_url(cleaned) or is_vercel_blob_url(cleaned)


def put_bytes(*, folder: str, data: bytes, ext: str, content_type: str) -> str:
    """Upload bytes → URL R2 (ou chemin /uploads/... en local)."""
    name = f"{uuid.uuid4().hex}{ext}"
    key = f"{folder.strip('/')}/{name}"
    if config.object_storage_enabled():
        from app.services import object_store

        return object_store.put_bytes(key, data, content_type)
    if config.IS_PRODUCTION:
        raise RuntimeError("R2 object storage is required for uploads in production")
    return _put_local(folder, name, data)


def copy_media_url(source_url: str | None, *, folder: str) -> str | None:
    if not source_url or not source_url.strip():
        return None
    url = source_url.strip()
    dest_key = f"{folder.strip('/')}/{uuid.uuid4().hex}{_suffix_of(url)}"
    if config.object_storage_enabled() and is_object_store_url(url):
        from app.services import object_store

        copied = object_store.copy_key(url, dest_key)
        return copied or url
    if is_local_upload_path(url):
        return _copy_local(url, folder)
    return url


def delete_media_url(url: str | None) -> None:
    if not url or not url.strip():
        return
    cleaned = url.strip()
    try:
        if is_object_store_url(cleaned) and config.object_storage_enabled():
            from app.services import object_store

            object_store.delete_key_url(cleaned)
            return
        if is_local_upload_path(cleaned):
            _delete_local(cleaned)
    except Exception:
        logger.exception("Failed to delete media %s", cleaned)


def read_media_bytes(url: str | None) -> tuple[bytes, str] | None:
    payload = fetch_media(url)
    if not payload:
        return None
    return payload.content, payload.suffix


def media_is_ready(url: str | None) -> bool:
    return media_is_readable(url)


def media_is_readable(url: str | None) -> bool:
    cleaned = (url or "").strip()
    if not cleaned:
        return False
    if is_local_upload_path(cleaned):
        return local_file_path(cleaned) is not None
    if is_object_store_url(cleaned) and config.object_storage_enabled():
        from app.services import object_store

        return object_store.object_is_readable(cleaned)
    return False


def presign_put_url(key: str, content_type: str, content_length: int) -> str:
    from app.services import object_store

    return object_store.presign_put(key, content_type, content_length)


def presign_get_url(url: str) -> str | None:
    if not is_object_store_url(url) or not config.object_storage_enabled():
        return None
    from app.services import object_store

    return object_store.presign_get(url)


def object_url_for_key(key: str) -> str:
    from app.services import object_store

    return object_store.object_public_url(key)


def fetch_media(url: str | None) -> MediaPayload | None:
    if not url or not url.strip():
        return None
    cleaned = url.strip()
    if is_remote_http_url(cleaned):
        return _fetch_remote(cleaned)
    local = _read_local(cleaned)
    if not local:
        return None
    data, suffix = local
    return MediaPayload(content=data, content_type=guess_content_type(suffix), suffix=suffix)


def _fetch_remote(url: str) -> MediaPayload | None:
    payload = _fetch_remote_once(url)
    if payload or not _can_retry_remote(url):
        return payload
    for pause in _REMOTE_RETRY_PAUSES:
        time.sleep(pause)
        payload = _fetch_remote_once(url)
        if payload:
            return payload
    return None


def _can_retry_remote(url: str) -> bool:
    return is_object_store_url(url) and config.object_storage_enabled()


def _fetch_remote_once(url: str) -> MediaPayload | None:
    if not is_object_store_url(url):
        logger.warning("Rejected remote media fetch: %s", url[:120])
        return None
    if not config.object_storage_enabled():
        return None
    from app.services import object_store

    return object_store.get_payload(url)


def _suffix_of(url: str) -> str:
    return Path(url.split("?", 1)[0]).suffix or ".bin"


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
    name = f"{uuid.uuid4().hex}{source.suffix or '.bin'}"
    return _put_local(folder, name, source.read_bytes())


def _delete_local(url: str) -> None:
    relative = url.lstrip("/").removeprefix("uploads/")
    if not relative or ".." in relative.replace("\\", "/"):
        return
    path = UPLOADS_DIR / relative
    if path.is_file():
        path.unlink()


def local_file_path(url: str) -> Path | None:
    relative = url.lstrip("/").removeprefix("uploads/")
    if relative.startswith("uploads/"):
        relative = relative[len("uploads/") :]
    if not relative or ".." in relative.replace("\\", "/"):
        return None
    path = UPLOADS_DIR / relative
    if not path.is_file():
        return None
    return path


def _read_local(url: str) -> tuple[bytes, str] | None:
    path = local_file_path(url)
    if not path:
        return None
    return path.read_bytes(), path.suffix
