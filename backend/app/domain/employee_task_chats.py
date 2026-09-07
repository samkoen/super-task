"""Liste שיחות oved : tâches ouvertes où un chat a déjà commencé."""
from __future__ import annotations

from app.domain import task_status
from app.domain.direct_chat import message_preview


def is_open_employee_chat_task(status: str) -> bool:
    return status not in task_status.TERMINAL


def employee_task_chat_card(occurrence, last_message) -> dict:
    preview = message_preview(
        last_message.body,
        last_message.photo_url,
        last_message.video_url,
        last_message.audio_url,
        getattr(last_message, "file_url", None),
    )
    return {
        "id": occurrence.id,
        "title": occurrence.title,
        "status": occurrence.status,
        "last_preview": preview or None,
        "last_at": last_message.created_at,
    }


def sort_employee_task_chats(items: list[dict]) -> list[dict]:
    return sorted(items, key=lambda item: item.get("last_at") or "", reverse=True)
