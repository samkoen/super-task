"""Le menahel a écrit en dernier : l'oved doit encore répondre ou envoyer la tâche."""
from __future__ import annotations

from app.domain import task_status
from app.domain.direct_chat import message_preview
from app.domain.task_chat_i18n import display_chat_body

OPEN_FOR_MANAGER_WAIT = frozenset(
    {
        task_status.PENDING,
        task_status.IN_PROGRESS,
        task_status.OVERDUE,
        task_status.AWAITING_RESPONSE,
    }
)


def manager_is_waiting(
    status: str,
    assignee_user_id: str | None,
    last_sender_user_id: str | None,
) -> bool:
    if status not in OPEN_FOR_MANAGER_WAIT:
        return False
    if not assignee_user_id or not last_sender_user_id:
        return False
    return last_sender_user_id != assignee_user_id


def waiting_message_preview(message) -> str:
    body = display_chat_body(
        body=message.body,
        body_translated=getattr(message, "body_translated", None),
        viewer_is_sender=False,
    )
    return message_preview(
        body,
        message.photo_url,
        message.video_url,
        message.audio_url,
        getattr(message, "file_url", None),
    )


def select_manager_waiting(tasks: list, last_messages: dict) -> list[tuple]:
    selected: list[tuple] = []
    for task in tasks:
        message = last_messages.get(task.id)
        if message is None:
            continue
        if manager_is_waiting(task.status, task.assignee_user_id, message.sender_user_id):
            selected.append((task, message))
    selected.sort(key=lambda pair: getattr(pair[1], "created_at", "") or "", reverse=True)
    return selected
