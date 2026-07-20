"""Persisted in-app notifications (V2)."""
from __future__ import annotations

from app.domain import roles
from app.domain.notification_rules import notification_sound_for, recipients_for_task_event
from app.realtime.sse_hub import sse_hub
from app.repositories.notification_repository import NotificationRepository
from app.repositories.user_repository import UserRepository

_TASK_LABELS = {
    "task_created": ("משימה חדשה", "הוקצתה אליך משימה חדשה"),
    "task_delegated": ("משימה שויכה", "הוקצתה אליך משימה לטיפול"),
    "task_started": ("משימה התחילה", "עובד התחיל לטפל במשימה"),
    "task_completed": ("משימה ממתינה לאישור", "עובד שלח משימה לאישור"),
    "task_cancelled": ("משימה בוטלה", "משימה בוטלה"),
    "task_updated": ("משימה עודכנה", "פרטי המשימה עודכנו"),
    "task_reopened": ("משימה נפתחה מחדש", "המנהל ביקש לתקן את המשימה"),
    "task_approved": ("משימה אושרה", "המשימה אושרה ונסגרה"),
    "employee_idle_no_tasks": ("בלי משימה בטיפול", "אין משימות בקנה"),
    "employee_idle_has_tasks": ("בלי משימה בטיפול", "יש משימות אבל לא התחיל אף אחת"),
    "employee_idle_on_break": ("בלי משימה בטיפול", "העובד בהפסקה"),
}


class NotificationService:
    def __init__(self, repo: NotificationRepository, user_repo: UserRepository):
        self._repo = repo
        self._users = user_repo

    def list_for_user(self, user_id: str, *, unread_only: bool = False) -> list[dict]:
        return [n.to_dict() for n in self._repo.list_for_user(user_id, unread_only=unread_only)]

    def unread_count(self, user_id: str) -> int:
        return self._repo.count_unread(user_id)

    def mark_read(self, user_id: str, notification_id: str) -> dict | None:
        row = self._repo.mark_read(notification_id, user_id)
        return row.to_dict() if row else None

    def mark_all_read(self, user_id: str) -> int:
        return self._repo.mark_all_read(user_id)

    def publish_task_event(
        self,
        *,
        event_type: str,
        branch_id: str,
        assignee_user_id: str | None = None,
        occurrence_id: str | None = None,
        task_title: str | None = None,
        created_by_user_id: str | None = None,
        message_override: str | None = None,
    ) -> list[tuple[str, str, str, str]]:
        """Persist notifications; caller must commit before push_task_event_sse.

        Returns list of (user_id, notification_id, kind, sound).
        """
        title, base_message = _TASK_LABELS.get(event_type, ("עדכון משימה", "עדכון במשימות"))
        if message_override:
            message = message_override
        else:
            detail = f": {task_title}" if task_title else ""
            message = f"{base_message}{detail}"

        managers = [
            m.id
            for m in self._users.list_users(role=roles.BRANCH_MANAGER, branch_ids=[branch_id])
            if m.is_active
        ]
        recipient_ids = recipients_for_task_event(
            event_type,
            assignee_user_id=assignee_user_id,
            branch_manager_ids=managers,
            created_by_user_id=created_by_user_id,
        )

        pending: list[tuple[str, str, str, str]] = []
        for user_id in recipient_ids:
            user = self._users.find_by_id(user_id)
            is_employee = bool(user and user.role == roles.EMPLOYEE)
            sound = notification_sound_for(event_type, recipient_is_employee=is_employee)
            # Messages côté manager pour idle / started / completed.
            row_title, row_message = title, message
            if event_type == "task_started" and not is_employee:
                row_title, row_message = _TASK_LABELS["task_started"]
                if task_title:
                    row_message = f"{row_message}: {task_title}"
            row = self._repo.create(
                user_id=user_id,
                kind=event_type,
                title=row_title,
                message=row_message,
                occurrence_id=occurrence_id,
                branch_id=branch_id,
            )
            pending.append((user_id, row.id, event_type, sound))
        return pending

    @staticmethod
    def push_task_event_sse(pending: list[tuple]) -> None:
        for item in pending:
            if len(item) == 4:
                user_id, notification_id, kind, sound = item
            else:
                user_id, notification_id, kind = item
                sound = "none"
            sse_hub.publish_sync(
                f"user:{user_id}",
                {
                    "type": "notification",
                    "notification_id": notification_id,
                    "kind": kind,
                    "sound": sound,
                },
            )
