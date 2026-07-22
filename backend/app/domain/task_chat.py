"""Règles pures du chat tâche."""
from __future__ import annotations

from app.domain import roles, task_status

EMPLOYEE_CHAT_STATUSES = {
    task_status.IN_PROGRESS,
    task_status.OVERDUE,
    task_status.AWAITING_RESPONSE,
}

MANAGER_CHAT_STATUSES = {
    task_status.IN_PROGRESS,
    task_status.OVERDUE,
    task_status.AWAITING_RESPONSE,
    task_status.PENDING_REVIEW,
}


def has_message_content(
    body: str | None,
    photo_url: str | None,
    video_url: str | None,
    audio_url: str | None,
) -> bool:
    return bool(
        (body or "").strip()
        or (photo_url or "").strip()
        or (video_url or "").strip()
        or (audio_url or "").strip()
    )


def can_employee_post(status: str) -> bool:
    return status in EMPLOYEE_CHAT_STATUSES


def can_manager_post(status: str) -> bool:
    return status in MANAGER_CHAT_STATUSES


def next_status_after_employee_message(current: str) -> str:
    return task_status.AWAITING_RESPONSE


def next_status_after_manager_message(current: str) -> str | None:
    """None = pas de changement de statut."""
    if current in {task_status.AWAITING_RESPONSE, task_status.PENDING_REVIEW}:
        return task_status.IN_PROGRESS
    return None


def message_event_type(sender_role: str) -> str:
    if sender_role == roles.EMPLOYEE:
        return "task_message_employee"
    return "task_message_manager"
