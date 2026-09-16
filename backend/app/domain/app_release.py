"""Règles pures — versions APK in-app (sans I/O)."""
from __future__ import annotations

import re

APK_FOLDER = "app_apks"
APK_MAX_BYTES = 150 * 1024 * 1024
APK_CONTENT_TYPE = "application/vnd.android.package-archive"
APK_ALLOWED_TYPES = frozenset(
    {
        APK_CONTENT_TYPE,
        "application/octet-stream",
        "application/java-archive",
    }
)
_VERSION_NAME = re.compile(r"^(\d+)\.(\d+)$")
_MINOR_MAX = 99


def parse_version_name(value: object) -> str:
    name = str(value or "").strip()
    match = _VERSION_NAME.fullmatch(name)
    if not match:
        raise ValueError("גרסה לא תקינה — השתמשו ב-1.0, 1.1 וכו'")
    major, minor = int(match.group(1)), int(match.group(2))
    if minor > _MINOR_MAX:
        raise ValueError("גרסה לא תקינה — השתמשו ב-1.0, 1.1 וכו'")
    return f"{major}.{minor}"


def version_code_from_name(name: str) -> int:
    major, minor = _parts(parse_version_name(name))
    return major * 100 + minor


def next_version_name(name: str) -> str:
    major, minor = _parts(parse_version_name(name))
    if minor >= _MINOR_MAX:
        return f"{major + 1}.0"
    return f"{major}.{minor + 1}"


def is_newer_release(installed_code: int, latest_code: int) -> bool:
    return latest_code > installed_code


def _parts(name: str) -> tuple[int, int]:
    major, minor = name.split(".", 1)
    return int(major), int(minor)


def require_apk_size(size_bytes: object, max_bytes: int = APK_MAX_BYTES) -> int:
    try:
        size = int(size_bytes)
    except (TypeError, ValueError):
        raise ValueError("חסר גודל קובץ") from None
    if size < 1 or size > max_bytes:
        limit_mb = max_bytes // (1024 * 1024)
        raise ValueError(f"הקובץ גדול מדי (מקסימום {limit_mb}MB)")
    return size


def require_apk_filename(filename: str) -> str:
    name = (filename or "").strip().lower()
    if not name.endswith(".apk"):
        raise ValueError("יש להעלות קובץ APK")
    return name


def normalize_apk_content_type(content_type: str) -> str:
    mime = (content_type or "").split(";")[0].strip().lower()
    if mime and mime not in APK_ALLOWED_TYPES:
        raise ValueError("סוג קובץ לא נתמך")
    return APK_CONTENT_TYPE


def require_apk_url(url: str) -> str:
    cleaned = (url or "").strip()
    if not cleaned or ".." in cleaned.replace("\\", "/"):
        raise ValueError("כתובת APK לא תקינה")
    if cleaned.startswith("/uploads/") or cleaned.startswith("https://"):
        return cleaned
    if cleaned.startswith("http://"):
        return cleaned
    raise ValueError("כתובת APK לא תקינה")
