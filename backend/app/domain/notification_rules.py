"""Règles pures destinataires + son des notifications (FLUX-NOTIFICATIONS)."""
from __future__ import annotations

# Sons côté client (employé uniquement).
SOUND_NEW_TASK = "new_task"
SOUND_TASK_END = "task_end"
SOUND_ALERT = "alert"
SOUND_NONE = "none"


def notification_sound_for(kind: str, *, recipient_is_employee: bool) -> str:
    """Son à jouer chez le destinataire. Menahel = toujours none."""
    if not recipient_is_employee:
        return SOUND_NONE
    if kind in {"task_created", "task_delegated"}:
        return SOUND_NEW_TASK
    if kind in {"task_cancelled", "task_reopened"}:
        return SOUND_TASK_END
    if kind in {"employee_idle", "employee_idle_no_tasks", "employee_idle_has_tasks", "employee_idle_on_break"}:
        return SOUND_ALERT
    return SOUND_ALERT


def recipients_for_task_event(
    event_type: str,
    *,
    assignee_user_id: str | None,
    branch_manager_ids: list[str],
    created_by_user_id: str | None = None,
) -> set[str]:
    """Destinataires persistés (sans network/admin)."""
    recipients: set[str] = set()
    managers = {str(mid) for mid in branch_manager_ids if mid}
    assignee = str(assignee_user_id).strip() if assignee_user_id else ""
    creator = str(created_by_user_id).strip() if created_by_user_id else ""

    if event_type in {"task_created", "task_delegated"}:
        if assignee:
            recipients.add(assignee)
        # Menahel snif seulement s'il n'est pas le créateur.
        for mid in managers:
            if mid and mid != creator:
                recipients.add(mid)
        return recipients

    if event_type == "task_started":
        recipients.update(managers)
        return recipients

    if event_type == "task_completed":
        # Envoi לאישור → menahel snif.
        recipients.update(managers)
        return recipients

    if event_type == "task_cancelled":
        if assignee:
            recipients.add(assignee)
        return recipients

    if event_type == "task_reopened":
        if assignee:
            recipients.add(assignee)
        return recipients

    if event_type == "task_updated":
        if assignee:
            recipients.add(assignee)
        recipients.update(managers)
        return recipients

    if event_type.startswith("employee_idle"):
        if assignee:
            recipients.add(assignee)
        recipients.update(managers)
        return recipients

    return recipients
