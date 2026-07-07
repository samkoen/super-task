"""Persisted in-app notifications (V2)."""
from __future__ import annotations

from app.domain import roles
from app.realtime.sse_hub import sse_hub
from app.repositories.notification_repository import NotificationRepository
from app.repositories.user_repository import UserRepository

_TASK_LABELS = {
    "task_created": ("משימה חדשה", "הוקצתה אליך משימה חדשה"),
    "task_delegated": ("משימה שויכה", "הוקצתה אליך משימה לטיפול"),
    "task_started": ("משימה התחילה", "עובד התחיל לטפל במשימה"),
    "task_completed": ("משימה הושלמה", "משימה הושלמה על ידי עובד"),
    "task_cancelled": ("משימה בוטלה", "משימה בוטלה"),
    "task_updated": ("משימה עודכנה", "פרטי המשימה עודכנו"),
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
    ) -> list[tuple[str, str, str]]:
        """Persist notifications; caller must commit before push_task_event_sse."""
        title, base_message = _TASK_LABELS.get(event_type, ("עדכון משימה", "עדכון במשימות"))
        detail = f": {task_title}" if task_title else ""
        message = f"{base_message}{detail}"

        recipients = self._recipients_for(event_type, branch_id, assignee_user_id)
        pending: list[tuple[str, str, str]] = []
        for user_id in recipients:
            row = self._repo.create(
                user_id=user_id,
                kind=event_type,
                title=title,
                message=message,
                occurrence_id=occurrence_id,
                branch_id=branch_id,
            )
            pending.append((user_id, row.id, event_type))
        return pending

    @staticmethod
    def push_task_event_sse(pending: list[tuple[str, str, str]]) -> None:
        for user_id, notification_id, kind in pending:
            sse_hub.publish_sync(
                f"user:{user_id}",
                {"type": "notification", "notification_id": notification_id, "kind": kind},
            )

    def _recipients_for(
        self, event_type: str, branch_id: str, assignee_user_id: str | None
    ) -> set[str]:
        recipients: set[str] = set()
        if event_type in {"task_created", "task_delegated", "task_updated"} and assignee_user_id:
            recipients.add(assignee_user_id)
        elif event_type == "task_created":
            for mgr in self._users.list_users(role=roles.BRANCH_MANAGER, branch_ids=[branch_id]):
                recipients.add(mgr.id)
        if event_type in {"task_started", "task_completed", "task_cancelled", "task_updated"}:
            for mgr in self._users.list_users(role=roles.BRANCH_MANAGER, branch_ids=[branch_id]):
                recipients.add(mgr.id)
        return recipients
