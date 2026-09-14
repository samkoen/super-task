"""Client S3-compatible (Cloudflare R2) : put, copy, delete, get, URLs présignées."""
from __future__ import annotations

import logging
import os
from functools import lru_cache
from typing import Any

from app.core import config
from app.domain.object_media_url import (
    MediaPayload,
    guess_content_type,
    key_from_stored_url,
    stored_object_url,
)

logger = logging.getLogger(__name__)

PUT_EXPIRES_S = 15 * 60
GET_EXPIRES_S = 5 * 60

# Render n'est pas EC2 : sans ça boto3 peut attendre l'IMDS (169.254.169.254).
os.environ.setdefault("AWS_EC2_METADATA_DISABLED", "true")


@lru_cache(maxsize=1)
def s3_client() -> Any:
    import boto3
    from botocore.config import Config

    if not config.object_storage_enabled():
        raise RuntimeError("R2 object storage is not configured")
    return boto3.client(
        "s3",
        endpoint_url=config.R2_ENDPOINT,
        aws_access_key_id=config.R2_ACCESS_KEY_ID,
        aws_secret_access_key=config.R2_SECRET_ACCESS_KEY,
        region_name="auto",
        config=Config(
            signature_version="s3v4",
            connect_timeout=5,
            read_timeout=60,
            retries={"max_attempts": 2, "mode": "standard"},
        ),
    )


def reset_s3_client() -> None:
    s3_client.cache_clear()


def object_public_url(key: str) -> str:
    return stored_object_url(config.R2_ENDPOINT, config.R2_BUCKET, key)


def key_of(url: str) -> str | None:
    return key_from_stored_url(url, config.R2_BUCKET)


def put_bytes(key: str, data: bytes, content_type: str) -> str:
    s3_client().put_object(
        Bucket=config.R2_BUCKET,
        Key=key,
        Body=data,
        ContentType=content_type,
    )
    return object_public_url(key)


def copy_key(source_url: str, dest_key: str) -> str | None:
    src = key_of(source_url)
    if not src:
        return None
    s3_client().copy_object(
        Bucket=config.R2_BUCKET,
        Key=dest_key,
        CopySource={"Bucket": config.R2_BUCKET, "Key": src},
    )
    return object_public_url(dest_key)


def delete_key_url(url: str) -> None:
    key = key_of(url)
    if not key:
        return
    s3_client().delete_object(Bucket=config.R2_BUCKET, Key=key)


def get_payload(url: str) -> MediaPayload | None:
    key = key_of(url)
    if not key:
        return None
    try:
        result = s3_client().get_object(Bucket=config.R2_BUCKET, Key=key)
    except Exception:
        logger.exception("R2 get failed for %s", url[:120])
        return None
    suffix = f".{key.rsplit('.', 1)[-1]}" if "." in key else ".bin"
    content_type = result.get("ContentType") or guess_content_type(suffix)
    return MediaPayload(content=result["Body"].read(), content_type=content_type, suffix=suffix)


def object_is_readable(url: str) -> bool:
    key = key_of(url)
    if not key:
        return False
    try:
        s3_client().head_object(Bucket=config.R2_BUCKET, Key=key)
        return True
    except Exception:
        logger.info("R2 object not ready for %s", url[:120])
        return False


def presign_put(key: str, content_type: str, content_length: int) -> str:
    return s3_client().generate_presigned_url(
        "put_object",
        Params={
            "Bucket": config.R2_BUCKET,
            "Key": key,
            "ContentType": content_type,
            "ContentLength": content_length,
        },
        ExpiresIn=PUT_EXPIRES_S,
    )


def presign_get(url: str) -> str | None:
    if not config.object_storage_enabled():
        return None
    key = key_of(url)
    if not key:
        return None
    return s3_client().generate_presigned_url(
        "get_object",
        Params={"Bucket": config.R2_BUCKET, "Key": key},
        ExpiresIn=GET_EXPIRES_S,
    )
