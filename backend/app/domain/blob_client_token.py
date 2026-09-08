"""Token client Vercel Blob — même format que generateClientTokenFromReadWriteToken."""
from __future__ import annotations

import base64
import hashlib
import hmac
import json
import time

DEFAULT_TTL_MS = 15 * 60 * 1000


def store_id_from_rw_token(token: str) -> str:
    parts = token.split("_")
    return parts[3] if len(parts) > 3 else ""


def generate_blob_client_token(
    *,
    read_write_token: str,
    pathname: str,
    valid_until_ms: int | None = None,
    allowed_content_types: list[str] | None = None,
    maximum_size_in_bytes: int | None = None,
) -> str:
    store_id = store_id_from_rw_token(read_write_token)
    if not store_id:
        raise ValueError("invalid blob token")
    payload = _token_payload(
        pathname=pathname,
        valid_until_ms=valid_until_ms or int(time.time() * 1000) + DEFAULT_TTL_MS,
        allowed_content_types=allowed_content_types,
        maximum_size_in_bytes=maximum_size_in_bytes,
    )
    encoded_payload = base64.b64encode(payload.encode("utf-8")).decode("ascii")
    signature = hmac.new(
        read_write_token.encode("utf-8"),
        encoded_payload.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()
    inner = base64.b64encode(f"{signature}.{encoded_payload}".encode("utf-8")).decode("ascii")
    return f"vercel_blob_client_{store_id}_{inner}"


def _token_payload(
    *,
    pathname: str,
    valid_until_ms: int,
    allowed_content_types: list[str] | None,
    maximum_size_in_bytes: int | None,
) -> str:
    data: dict[str, object] = {
        "pathname": pathname,
        "validUntil": valid_until_ms,
        "addRandomSuffix": False,
    }
    if allowed_content_types:
        data["allowedContentTypes"] = allowed_content_types
    if maximum_size_in_bytes is not None:
        data["maximumSizeInBytes"] = maximum_size_in_bytes
    return json.dumps(data, separators=(",", ":"))
