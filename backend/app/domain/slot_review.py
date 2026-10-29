"""Contrôle V/X de chaque sous-tâche rendue par l'oved (règles pures, sans I/O).

Chaque pièce jointe de la preuve peut porter une clé ``review`` :
``{"status": "approved"|"rejected", "remark", "annotated_url", "reviewed_at"}``.
"""

from __future__ import annotations

from app.domain import task_status
from app.domain.completion_media import attachment_is_filled

SLOT_APPROVED = task_status.REVIEW_APPROVED
SLOT_REJECTED = task_status.REVIEW_REJECTED
VALID_STATUSES = (SLOT_APPROVED, SLOT_REJECTED)
MAX_REMARK = 500
MAX_ANNOTATED_URL = 1024

OUTCOME_APPROVED = "approved"
OUTCOME_REJECTED = "rejected"
OUTCOME_INCOMPLETE = "incomplete"

_INVALID_DECISION = "סימון תת-משימה לא תקין"
_REMARK_TOO_LONG = "ההערה ארוכה מדי"
_NOTHING_TO_REVIEW = "אין תתי-משימות לבדיקה"

def review_of(item: dict | None) -> dict | None:
    """Retourne le contrôle d'une pièce jointe s'il est valide, sinon None."""
    review = (item or {}).get("review")
    if not isinstance(review, dict) or review.get("status") not in VALID_STATUSES:
        return None
    return review


def normalize_decision(raw: object, *, count: int) -> tuple[int, dict]:
    """Valide une décision `{index, status, remark?, annotated_url?}`."""
    if not isinstance(raw, dict):
        raise ValueError(_INVALID_DECISION)
    index = _parse_index(raw.get("index"), count)
    status = str(raw.get("status") or "").strip()
    if status not in VALID_STATUSES:
        raise ValueError(_INVALID_DECISION)
    if status == SLOT_APPROVED:
        return index, {"status": status}
    return index, {"status": status, **_rejection_fields(raw)}


def normalize_decisions(raw: object, *, count: int) -> dict[int, dict]:
    """Liste de décisions → `{index: décision}` (la dernière gagne)."""
    if not isinstance(raw, list):
        raise ValueError(_INVALID_DECISION)
    out: dict[int, dict] = {}
    for item in raw:
        index, decision = normalize_decision(item, count=count)
        out[index] = decision
    return out


def required_indices(requirements: list[dict], attachments: list[dict]) -> list[int]:
    """Cases à contrôler : une par exigence (ou tous les fichiers sans exigence).

    Les fichiers en plus des exigences sont facultatifs : ils ne bloquent pas la fin du contrôle.
    """
    filled = [i for i, item in enumerate(attachments) if attachment_is_filled(item)]
    if not requirements:
        return filled
    return [i for i in filled if i < len(requirements)]


def apply_decisions(
    attachments: list[dict], decisions: dict[int, dict], *, reviewed_at: str
) -> list[dict]:
    """Copie des pièces jointes avec le contrôle posé sur chaque case décidée."""
    out: list[dict] = []
    for index, item in enumerate(attachments):
        decision = decisions.get(index)
        if decision is None or not attachment_is_filled(item):
            out.append(dict(item))
            continue
        out.append({**item, "review": {**decision, "reviewed_at": reviewed_at}})
    return out


def review_outcome(attachments: list[dict], required: list[int]) -> str:
    """rejected dès qu'une case est X ; approved si toutes les cases requises sont V."""
    if not required:
        raise ValueError(_NOTHING_TO_REVIEW)
    statuses = [(review_of(item) or {}).get("status") for item in attachments]
    if SLOT_REJECTED in statuses:
        return OUTCOME_REJECTED
    if all(statuses[i] == SLOT_APPROVED for i in required):
        return OUTCOME_APPROVED
    return OUTCOME_INCOMPLETE


def rejected_indices(attachments: list[dict]) -> list[int]:
    return [
        i for i, item in enumerate(attachments)
        if (review_of(item) or {}).get("status") == SLOT_REJECTED
    ]


def rejection_summary(attachments: list[dict], titles: list[str], *, limit: int) -> str:
    """Message court pour le chat : une ligne par sous-tâche refusée."""
    lines = ["נדרשים תיקונים:"]
    for index in rejected_indices(attachments):
        title = titles[index] if index < len(titles) and titles[index] else f"תת-משימה {index + 1}"
        remark = (review_of(attachments[index]) or {}).get("remark")
        lines.append(f"• {title}: {remark}" if remark else f"• {title}")
    return "\n".join(lines)[:limit]


def carry_over_reviews(previous: list[dict] | None, current: list[dict]) -> list[dict]:
    """Nouvelle soumission : un V reste valide si le fichier est inchangé.

    Un X dont le fichier n'a pas été refait garde l'ancienne photo/vidéo mais repasse
    « à contrôler » : le menahel la revoit (le contrôle X est effacé).
    """
    before = previous or []
    out: list[dict] = []
    for index, item in enumerate(current):
        prior = before[index] if index < len(before) else None
        review = review_of(prior)
        keep = review is not None and review["status"] == SLOT_APPROVED and same_content(prior, item)
        out.append({**item, "review": review} if keep else item)
    return out


def strip_reviews(attachments: list[dict] | None) -> list[dict]:
    """Efface tous les contrôles (réouverture d'une tâche déjà fermée)."""
    return [{k: v for k, v in item.items() if k != "review"} for item in attachments or []]


def same_content(a: dict | None, b: dict | None) -> bool:
    if not a or not b or a.get("kind") != b.get("kind"):
        return False
    if a.get("kind") == "message":
        return _clean(a.get("text")) == _clean(b.get("text"))
    return bool(_clean(a.get("url"))) and _clean(a.get("url")) == _clean(b.get("url"))


def _clean(value: object) -> str:
    return str(value or "").strip()


def _parse_index(value: object, count: int) -> int:
    try:
        index = int(value)  # type: ignore[arg-type]
    except (TypeError, ValueError):
        raise ValueError(_INVALID_DECISION) from None
    if index < 0 or index >= count:
        raise ValueError(_INVALID_DECISION)
    return index


def _rejection_fields(raw: dict) -> dict:
    remark = _clean(raw.get("remark"))
    if len(remark) > MAX_REMARK:
        raise ValueError(_REMARK_TOO_LONG)
    fields: dict = {}
    if remark:
        fields["remark"] = remark
    url = _clean(raw.get("annotated_url"))
    if url and len(url) <= MAX_ANNOTATED_URL and url.startswith(("/uploads/", "https://", "http://")):
        fields["annotated_url"] = url
    return fields
