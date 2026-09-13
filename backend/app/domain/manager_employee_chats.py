"""Inbox manager : chats tâche du jour + total non-lus (option A)."""
from __future__ import annotations

from app.domain.direct_chat import message_preview


def contact_unread_total(direct_unread: int, task_unread: int) -> int:
    return max(0, int(direct_unread or 0)) + max(0, int(task_unread or 0))


def manager_task_chat_card(occurrence, last_message, unread: int) -> dict:
    preview = None
    last_at = None
    if last_message:
        preview = message_preview(
            last_message.body,
            last_message.photo_url,
            last_message.video_url,
            last_message.audio_url,
            getattr(last_message, "file_url", None),
        ) or None
        last_at = last_message.created_at
    return {
        "id": occurrence.id,
        "title": occurrence.title,
        "status": occurrence.status,
        "last_preview": preview,
        "last_at": last_at,
        "unread_count": max(0, int(unread or 0)),
    }


def sort_manager_day_chats(items: list[dict]) -> list[dict]:
    return sorted(items, key=lambda item: item.get("last_at") or "", reverse=True)
