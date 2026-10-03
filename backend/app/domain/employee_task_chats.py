"""Liste שיחות oved : chats ouverts, plus les tâches du jour même sans message."""
from __future__ import annotations

from app.domain import task_status
from app.domain.direct_chat import message_preview


def is_open_employee_chat_task(status: str) -> bool:
    return status not in task_status.TERMINAL


def employee_task_chat_card(occurrence, last_message=None) -> dict:
    preview, last_at = _last_message_fields(last_message)
    return {
        "id": occurrence.id,
        "title": occurrence.title,
        "status": occurrence.status,
        "due_at": getattr(occurrence, "due_at", None),
        "last_preview": preview,
        "last_at": last_at,
    }


def append_today_open_chats(started: list[dict], today: list) -> list[dict]:
    seen = {item["id"] for item in started}
    extras = [
        employee_task_chat_card(occ)
        for occ in today
        if occ.id not in seen and is_open_employee_chat_task(occ.status)
    ]
    return sort_employee_task_chats([*started, *extras])


def sort_employee_task_chats(items: list[dict]) -> list[dict]:
    return sorted(items, key=lambda item: item.get("last_at") or "", reverse=True)


def _last_message_fields(last_message):
    if not last_message:
        return None, None
    preview = message_preview(
        last_message.body,
        last_message.photo_url,
        last_message.video_url,
        last_message.audio_url,
        getattr(last_message, "file_url", None),
    )
    return preview or None, last_message.created_at
