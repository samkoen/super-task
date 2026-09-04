"""Nom de fichier joint au chat."""

from __future__ import annotations

FILE_FALLBACK_NAME = "קובץ"
_MAX_LEN = 200


def clip_file_name(raw: object) -> str | None:
    text = str(raw or "").replace("\\", "/").split("/")[-1].strip()
    cleaned = "".join(ch for ch in text if ch.isprintable())
    if not cleaned:
        return None
    return cleaned[:_MAX_LEN]


def stored_file_name(raw: object, *, has_file: bool) -> str | None:
    if not has_file:
        return None
    return clip_file_name(raw) or FILE_FALLBACK_NAME
