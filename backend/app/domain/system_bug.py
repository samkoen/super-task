"""Règles pures — דיווח על תקלה במערכת."""
from __future__ import annotations

MAX_TRAIL = 8
MAX_NOTE_LEN = 4000
MAX_SCREENSHOT_BYTES = 3 * 1024 * 1024
MAX_AUDIO_BYTES = 5 * 1024 * 1024


def clip_route_trail(paths: list[str], *, max_len: int = MAX_TRAIL) -> list[str]:
    cleaned = [str(p).strip() for p in paths if str(p).strip()]
    return cleaned[-max_len:]


def has_system_bug_explanation(note: str, *, has_audio: bool) -> bool:
    return bool((note or "").strip()) or has_audio


def system_bug_subject(*, route: str, role: str, version: str) -> str:
    path = (route or "/").strip() or "/"
    who = (role or "?").strip() or "?"
    ver = (version or "?").strip() or "?"
    return f"[סופר-מן] תקלה · {path} · {who} · {ver}"


def parse_trail(raw: str) -> list[str]:
    text = (raw or "").strip()
    if not text:
        return []
    if text.startswith("["):
        import json

        try:
            data = json.loads(text)
        except json.JSONDecodeError:
            return clip_route_trail(text.split(","))
        if isinstance(data, list):
            return clip_route_trail([str(item) for item in data])
    return clip_route_trail(text.split(","))
