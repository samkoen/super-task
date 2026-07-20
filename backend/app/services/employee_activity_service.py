"""Pause employé + détection inactivité (30 min sans in_progress)."""
from __future__ import annotations

from datetime import datetime, time, timedelta
from zoneinfo import ZoneInfo

from sqlalchemy import exists, select

from app.db import mappers as mp
from app.db import models as orm
from app.domain import roles, task_status
from app.domain.employee_inactivity import (
    idle_reason,
    idle_threshold_reached,
    kind_for_reason,
    should_evaluate_idle,
)
from app.repositories.notification_repository import NotificationRepository
from app.repositories.task_occurrence_repository import TaskOccurrenceRepository
from app.repositories.user_repository import UserRepository
from app.services.notification_service import NotificationService

TZ = ZoneInfo("Asia/Jerusalem")
OPEN_STATUSES = {task_status.PENDING, task_status.OVERDUE, task_status.PENDING_REVIEW}


class EmployeeActivityService:
    def __init__(
        self,
        user_repo: UserRepository,
        occurrence_repo: TaskOccurrenceRepository,
        notification_repo: NotificationRepository | None = None,
    ):
        self._users = user_repo
        self._occurrences = occurrence_repo
        self._notifications = notification_repo
        self._db = user_repo._db  # noqa: SLF001 — session partagée

    def set_break(self, user_id: str, *, on_break: bool) -> dict:
        row = self._db.get(orm.User, mp.parse_uuid(user_id))
        if not row or row.role != roles.EMPLOYEE:
            raise PermissionError("רק עובד יכול להכריז על הפסקה")
        now = datetime.now(TZ)
        if on_break:
            row.on_break_since = now
        else:
            row.on_break_since = None
            # Fin de pause = nouvel épisode potentiel.
            if not self._has_in_progress(user_id):
                row.idle_since = now
                row.inactivity_notified_at = None
        self._db.flush()
        return {
            "on_break": bool(row.on_break_since),
            "on_break_since": row.on_break_since.isoformat() if row.on_break_since else None,
        }

    def get_break_state(self, user_id: str) -> dict:
        row = self._db.get(orm.User, mp.parse_uuid(user_id))
        if not row:
            raise ValueError("משתמש לא נמצא")
        return {
            "on_break": bool(row.on_break_since),
            "on_break_since": row.on_break_since.isoformat() if row.on_break_since else None,
        }

    def on_task_started(self, user_id: str) -> None:
        row = self._db.get(orm.User, mp.parse_uuid(user_id))
        if not row:
            return
        row.idle_since = None
        row.inactivity_notified_at = None
        row.on_break_since = None
        self._db.flush()

    def on_left_in_progress(self, user_id: str) -> None:
        """Appelé quand l'employé n'a plus de tâche in_progress."""
        if self._has_in_progress(user_id):
            return
        row = self._db.get(orm.User, mp.parse_uuid(user_id))
        if not row:
            return
        if row.idle_since is None:
            row.idle_since = datetime.now(TZ)
            row.inactivity_notified_at = None
            self._db.flush()

    def run_inactivity_scan(self, *, now: datetime | None = None) -> dict:
        now = now or datetime.now(TZ)
        if self._notifications is None:
            raise RuntimeError("notification_repo required for scan")
        notif_svc = NotificationService(self._notifications, self._users)
        employees = self._users.list_users(role=roles.EMPLOYEE)
        sent = 0
        pending_all: list = []
        for emp in employees:
            if not emp.is_active or not emp.branch_id:
                continue
            n = self._maybe_notify_employee(emp.id, emp.branch_id, emp.full_name, now, notif_svc)
            if n:
                pending_all.extend(n)
                sent += 1
        self._db.flush()
        return {"checked": len(employees), "notified": sent, "pending": pending_all}

    def _maybe_notify_employee(
        self,
        user_id: str,
        branch_id: str,
        full_name: str,
        now: datetime,
        notif_svc: NotificationService,
    ) -> list | None:
        row = self._db.get(orm.User, mp.parse_uuid(user_id))
        if not row:
            return None
        has_started = self._has_started_task_today(user_id, now)
        has_ip = self._has_in_progress(user_id)
        if has_ip:
            row.idle_since = None
            row.inactivity_notified_at = None
            return None
        if not should_evaluate_idle(
            now=now,
            has_started_task_today=has_started,
            has_in_progress=False,
            already_notified_episode=bool(row.inactivity_notified_at),
        ):
            return None
        if row.idle_since is None:
            row.idle_since = now
            return None
        if not idle_threshold_reached(row.idle_since, now):
            return None

        open_count = self._open_task_count(user_id)
        reason = idle_reason(on_break=bool(row.on_break_since), open_task_count=open_count)
        kind = kind_for_reason(reason)
        pending = notif_svc.publish_task_event(
            event_type=kind,
            branch_id=branch_id,
            assignee_user_id=user_id,
            occurrence_id=None,
            task_title=full_name,
        )
        row.inactivity_notified_at = now
        return pending

    def _has_in_progress(self, user_id: str) -> bool:
        rows = self._occurrences.list_occurrences(
            assignee_user_id=user_id, status=task_status.IN_PROGRESS
        )
        return len(rows) > 0

    def _open_task_count(self, user_id: str) -> int:
        rows = self._occurrences.list_occurrences(assignee_user_id=user_id)
        return sum(1 for t in rows if t.status in OPEN_STATUSES)

    def _has_started_task_today(self, user_id: str, now: datetime) -> bool:
        local = now.astimezone(TZ) if now.tzinfo else now.replace(tzinfo=TZ)
        day_start = datetime.combine(local.date(), time(0, 0), tzinfo=TZ)
        day_end = day_start + timedelta(days=1)
        stmt = select(
            exists().where(
                orm.TaskOccurrence.assignee_user_id == mp.parse_uuid(user_id),
                orm.TaskOccurrence.started_at.is_not(None),
                orm.TaskOccurrence.started_at >= day_start,
                orm.TaskOccurrence.started_at < day_end,
            )
        )
        return bool(self._db.execute(stmt).scalar())
