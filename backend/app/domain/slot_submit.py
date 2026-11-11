"""Soumission d'une sous-tâche à la fois (règles pures, sans I/O).

Chaque case de ``completion_requirements`` est envoyée dès que l'oved valide son média.
La liste de pièces jointes garde la position de la case : l'index d'une pièce = l'index de l'exigence.
"""

from __future__ import annotations

from app.domain.completion_media import (
    assert_attachments_match,
    attachment_is_filled,
    normalize_attachments,
)
from app.domain.slot_review import SLOT_REJECTED, review_of, same_content

_UNKNOWN_SLOT = "תת-משימה לא קיימת"
_NO_SLOTS = "למשימה זו אין תתי-משימות לשליחה"
_WRONG_KIND = "סוג המדיה אינו תואם לתת-משימה"


def parse_slot_index(value: object, *, count: int) -> int:
    """Index de case valide (0 <= index < count), sinon ValueError."""
    if count <= 0:
        raise ValueError(_NO_SLOTS)
    try:
        index = int(value)  # type: ignore[arg-type]
    except (TypeError, ValueError):
        raise ValueError(_UNKNOWN_SLOT) from None
    if index < 0 or index >= count:
        raise ValueError(_UNKNOWN_SLOT)
    return index


def normalize_slot_attachment(requirement: dict, raw: object) -> dict:
    """Pièce jointe d'une case : même type que l'exigence, remplie, durée vidéo suffisante."""
    if not isinstance(raw, dict):
        raise ValueError(_WRONG_KIND)
    item = normalize_attachments([raw])[0]
    if item.get("kind") != requirement.get("kind"):
        raise ValueError(_WRONG_KIND)
    assert_attachments_match([requirement], [item])
    return item


def merge_slot(
    stored: list[dict] | None, requirements: list[dict], index: int, attachment: dict
) -> list[dict]:
    """Pièces jointes alignées sur les exigences, avec la case `index` remplacée.

    Les cases jamais envoyées sont des emplacements vides ; les fichiers facultatifs
    au-delà des exigences sont conservés.
    """
    current = [dict(item) for item in stored or []]
    for position in range(len(current), len(requirements)):
        current.append(empty_slot(requirements[position]["kind"]))
    current[index] = attachment
    return current


def empty_slot(kind: str) -> dict:
    if kind == "message":
        return {"kind": "message", "text": ""}
    return {"kind": kind, "url": ""}


def pending_slot_indices(requirements: list[dict], attachments: list[dict]) -> list[int]:
    """Cases encore à envoyer : vides, ou refusées par le menahel et pas encore remplacées."""
    pending: list[int] = []
    for index in range(len(requirements)):
        item = attachments[index] if index < len(attachments) else None
        if item is None or not attachment_is_filled(item) or _is_rejected(item):
            pending.append(index)
    return pending


def slot_already_sent(stored: list[dict] | None, index: int, attachment: dict) -> bool:
    """Renvoi du même fichier pour la même case (coupure réseau) : rien à refaire."""
    items = stored or []
    if index >= len(items):
        return False
    return same_content(items[index], attachment) and not _is_rejected(items[index])


def _is_rejected(item: dict) -> bool:
    return (review_of(item) or {}).get("status") == SLOT_REJECTED
