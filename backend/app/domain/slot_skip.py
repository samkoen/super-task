"""Sous-tâche « לא ניתן לצלם » : l'oved explique pourquoi il ne peut pas la faire (règles pures, sans I/O).

La case garde son type et son index, mais sans fichier : la pièce jointe porte une clé ``skipped`` :
``{"reason_code", "reason_text"?, "audio_url"?}``. Le menahel lit la raison (et écoute l'audio) en contrôlant la tâche.
"""

from __future__ import annotations

REASON_NO_STOCK = "no_stock"
REASON_AREA_BLOCKED = "area_blocked"
REASON_CAMERA_ISSUE = "camera_issue"
REASON_OTHER = "other"
REASON_CODES = (REASON_NO_STOCK, REASON_AREA_BLOCKED, REASON_CAMERA_ISSUE, REASON_OTHER)

MAX_REASON_TEXT = 500
MAX_AUDIO_URL = 1024

_INVALID_REASON = "סיבה לא תקינה לתת-משימה שלא צולמה"
_REASON_TEXT_TOO_LONG = "ההסבר ארוך מדי"
_OTHER_NEEDS_DETAILS = "יש לפרט את הסיבה בכתב או בהקלטה"


def normalize_skip(raw: object) -> dict:
    """Valide ``{reason_code, reason_text?, audio_url?}`` ; « אחר » exige un texte ou un audio."""
    if not isinstance(raw, dict):
        raise ValueError(_INVALID_REASON)
    code = str(raw.get("reason_code") or "").strip()
    if code not in REASON_CODES:
        raise ValueError(_INVALID_REASON)
    text = str(raw.get("reason_text") or "").strip()
    if len(text) > MAX_REASON_TEXT:
        raise ValueError(_REASON_TEXT_TOO_LONG)
    audio = _audio_url(raw.get("audio_url"))
    if code == REASON_OTHER and not (text or audio):
        raise ValueError(_OTHER_NEEDS_DETAILS)
    skip: dict = {"reason_code": code}
    if text:
        skip["reason_text"] = text
    if audio:
        skip["audio_url"] = audio
    return skip


def skipped_of(item: dict | None) -> dict | None:
    """La raison enregistrée sur une pièce jointe, si elle est valide."""
    skip = (item or {}).get("skipped")
    if not isinstance(skip, dict) or skip.get("reason_code") not in REASON_CODES:
        return None
    return skip


def is_skipped(item: dict | None) -> bool:
    return skipped_of(item) is not None


def has_skipped(attachments: list[dict] | None) -> bool:
    return any(is_skipped(item) for item in attachments or [])


def same_skip(a: dict | None, b: dict | None) -> bool:
    """Renvoi de la même raison pour la même case (coupure réseau)."""
    first, second = skipped_of(a), skipped_of(b)
    return bool(first and second and first == second and a.get("kind") == b.get("kind"))


def skip_audio_url(item: dict | None) -> str:
    return str((skipped_of(item) or {}).get("audio_url") or "").strip()


def _audio_url(value: object) -> str:
    text = str(value or "").strip()
    if not text:
        return ""
    if len(text) > MAX_AUDIO_URL or not text.startswith(("/uploads/", "https://", "http://")):
        raise ValueError(_INVALID_REASON)
    return text
