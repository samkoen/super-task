"""Règles de soumission de fin de tâche (oved → menahel)."""

from __future__ import annotations

from app.domain import task_status

NOT_COMPLETED_REASON_MAX = 500
_STATUS_ERROR = "סטטוס סיום לא תקין"
_REASON_REQUIRED = "יש להסביר למה המשימה לא בוצעה"
_REASON_TOO_LONG = "ההסבר ארוך מדי"


def normalize_completion_status(raw: object) -> str:
    value = str(raw or "").strip()
    if value in {task_status.COMPLETION_DONE, task_status.COMPLETION_NOT_DONE}:
        return value
    raise ValueError(_STATUS_ERROR)


def normalize_not_completed_reason(status: str, reason: object | None) -> str | None:
    cleaned = str(reason or "").strip()
    if status != task_status.COMPLETION_NOT_DONE:
        return None
    if not cleaned:
        raise ValueError(_REASON_REQUIRED)
    if len(cleaned) > NOT_COMPLETED_REASON_MAX:
        raise ValueError(_REASON_TOO_LONG)
    return cleaned


def requires_completion_media(status: str) -> bool:
    return status == task_status.COMPLETION_DONE


def employee_submission_needs_review(as_assignee: bool) -> bool:
    return as_assignee
