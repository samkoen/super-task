"""Règles pures — alerte mobile pour הודעה בתוך מטלה."""

TASK_CHAT_ALERT_KINDS = frozenset({"task_message_employee", "task_message_manager"})


def is_task_chat_alert(kind: str | None) -> bool:
    return bool(kind) and kind in TASK_CHAT_ALERT_KINDS
