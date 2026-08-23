from datetime import date, datetime
from zoneinfo import ZoneInfo

from sqlalchemy import func, select, update
from sqlalchemy.orm import Session

import app.db.models as orm
from app.db import mappers as mp
from app.domain import task_status
from app.domain.dashboard_day_tasks import due_window
from app.domain.employee_task_carry_over import (
    ROLLOVER_STATUSES,
    can_rollover_task_kind,
    opened_on_from_due,
    rollover_due_datetime,
    start_of_day,
    status_after_rollover,
)
from app.domain.fixed_task_expiry import EXPIRE_STATUSES
from app.domain.task_kind import AD_HOC, FIXED
from app.models.task_occurrence import TaskOccurrence

_TZ = ZoneInfo("Asia/Jerusalem")


class TaskOccurrenceRepository:
    def __init__(self, db: Session):
        self._db = db

    def find_by_id(self, id_: str) -> TaskOccurrence | None:
        try:
            return mp.task_occurrence_orm_to_domain(
                self._db.get(orm.TaskOccurrence, mp.parse_uuid(id_))
            )
        except ValueError:
            return None

    def exists_for_template_on_date(self, template_id: str, day: date) -> bool:
        start, end = due_window(day, _TZ)
        q = (
            select(func.count())
            .select_from(orm.TaskOccurrence)
            .where(orm.TaskOccurrence.template_id == mp.parse_uuid(template_id))
            .where(orm.TaskOccurrence.due_at >= start)
            .where(orm.TaskOccurrence.due_at < end)
        )
        return self._db.execute(q).scalar_one() > 0

    def list_occurrences(
        self,
        *,
        branch_ids: list[str] | None = None,
        branch_id: str | None = None,
        status: str | None = None,
        assignee_user_id: str | None = None,
        for_employee_user_id: str | None = None,
        manager_user_id: str | None = None,
        pending_delegation: bool | None = None,
        task_kind: str | None = None,
        due_on: date | None = None,
        due_from: date | None = None,
        due_to: date | None = None,
    ) -> list[TaskOccurrence]:
        q = select(orm.TaskOccurrence).order_by(orm.TaskOccurrence.due_at.asc())
        q = self._apply_scope_filters(
            q,
            branch_ids=branch_ids,
            branch_id=branch_id,
            status=status,
            assignee_user_id=assignee_user_id,
            for_employee_user_id=for_employee_user_id,
            manager_user_id=manager_user_id,
            pending_delegation=pending_delegation,
            task_kind=task_kind,
        )
        q = self._apply_due_filters(q, due_on=due_on, due_from=due_from, due_to=due_to)
        rows = self._db.execute(q).scalars().all()
        return [o for row in rows if (o := mp.task_occurrence_orm_to_domain(row))]

    def expire_open_fixed_before(
        self,
        day: date,
        *,
        branch_ids: list[str] | None = None,
    ) -> list[TaskOccurrence]:
        """Annule les קבועות ouvertes dont le jour d'origine est passé."""
        start, _ = due_window(day, _TZ)
        q = (
            select(orm.TaskOccurrence)
            .where(orm.TaskOccurrence.task_kind == FIXED)
            .where(orm.TaskOccurrence.status.in_(tuple(EXPIRE_STATUSES)))
            .where(orm.TaskOccurrence.due_at < start)
        )
        if branch_ids is not None:
            if not branch_ids:
                return []
            q = q.where(
                orm.TaskOccurrence.branch_id.in_([mp.parse_uuid(i) for i in branch_ids])
            )
        rows = self._db.execute(q).scalars().all()
        expired: list[TaskOccurrence] = []
        for row in rows:
            row.status = task_status.CANCELLED
            row.manager_next_at = None
            domain = mp.task_occurrence_orm_to_domain(row)
            if domain:
                expired.append(domain)
        if expired:
            self._db.flush()
        return expired

    def _apply_scope_filters(
        self,
        q,
        *,
        branch_ids,
        branch_id,
        status,
        assignee_user_id,
        for_employee_user_id,
        manager_user_id,
        pending_delegation,
        task_kind,
    ):
        if branch_id:
            q = q.where(orm.TaskOccurrence.branch_id == mp.parse_uuid(branch_id))
        if branch_ids is not None:
            q = q.where(orm.TaskOccurrence.branch_id.in_([mp.parse_uuid(i) for i in branch_ids]))
        if status:
            q = q.where(orm.TaskOccurrence.status == status)
        if assignee_user_id:
            q = q.where(orm.TaskOccurrence.assignee_user_id == mp.parse_uuid(assignee_user_id))
        if for_employee_user_id:
            q = q.where(orm.TaskOccurrence.assignee_user_id == mp.parse_uuid(for_employee_user_id))
        if manager_user_id:
            q = q.where(orm.TaskOccurrence.manager_user_id == mp.parse_uuid(manager_user_id))
        if pending_delegation is True:
            q = q.where(orm.TaskOccurrence.manager_user_id.isnot(None))
            q = q.where(orm.TaskOccurrence.assignee_user_id.is_(None))
        if task_kind:
            q = q.where(orm.TaskOccurrence.task_kind == task_kind)
        return q

    def _apply_due_filters(self, q, *, due_on, due_from, due_to):
        if due_on:
            start, end = due_window(due_on, _TZ)
            return q.where(orm.TaskOccurrence.due_at >= start).where(
                orm.TaskOccurrence.due_at < end
            )
        if due_from:
            start, _ = due_window(due_from, _TZ)
            q = q.where(orm.TaskOccurrence.due_at >= start)
        if due_to:
            _, end = due_window(due_to, _TZ)
            q = q.where(orm.TaskOccurrence.due_at < end)
        return q

    def list_by_network_group(self, network_group_id: str) -> list[TaskOccurrence]:
        try:
            gid = mp.parse_uuid(network_group_id)
        except ValueError:
            return []
        q = select(orm.TaskOccurrence).where(orm.TaskOccurrence.network_group_id == gid)
        rows = self._db.execute(q).scalars().all()
        return [o for row in rows if (o := mp.task_occurrence_orm_to_domain(row))]

    def has_open_from_gallery(
        self,
        *,
        assignee_user_id: str,
        gallery_item_id: str,
        statuses: frozenset[str],
    ) -> bool:
        try:
            uid = mp.parse_uuid(assignee_user_id)
            gid = mp.parse_uuid(gallery_item_id)
        except ValueError:
            return False
        row = self._db.execute(
            select(orm.TaskOccurrence.id)
            .where(orm.TaskOccurrence.assignee_user_id == uid)
            .where(orm.TaskOccurrence.source_gallery_item_id == gid)
            .where(orm.TaskOccurrence.status.in_(list(statuses)))
            .limit(1)
        ).first()
        return bool(row)

    def list_by_template_id(self, template_id: str) -> list[TaskOccurrence]:
        try:
            tid = mp.parse_uuid(template_id)
        except ValueError:
            return []
        q = select(orm.TaskOccurrence).where(orm.TaskOccurrence.template_id == tid)
        rows = self._db.execute(q).scalars().all()
        return [o for row in rows if (o := mp.task_occurrence_orm_to_domain(row))]

    def clear_template_id(self, template_id: str) -> int:
        try:
            tid = mp.parse_uuid(template_id)
        except ValueError:
            return 0
        result = self._db.execute(
            update(orm.TaskOccurrence)
            .where(orm.TaskOccurrence.template_id == tid)
            .values(template_id=None)
        )
        self._db.flush()
        return int(result.rowcount or 0)

    def create(
        self,
        *,
        template_id: str | None,
        branch_id: str,
        title: str,
        description: str,
        due_at: datetime,
        assignee_user_id: str | None,
        department_id: str | None,
        status: str = task_status.PENDING,
        task_kind: str = "fixed",
        manager_user_id: str | None = None,
        photo_required: bool = False,
        reference_photo_url: str | None = None,
        reference_video_url: str | None = None,
        reference_audio_url: str | None = None,
        created_by_id: str | None = None,
        source_gallery_item_id: str | None = None,
        ops_category: str | None = None,
        min_video_seconds: int | None = None,
        completion_requirements: list | None = None,
        is_work_start: bool = False,
        network_group_id: str | None = None,
    ) -> TaskOccurrence:
        import uuid

        row = orm.TaskOccurrence(
            id=uuid.uuid4(),
            template_id=mp.parse_uuid(template_id) if template_id else None,
            branch_id=mp.parse_uuid(branch_id),
            title=title.strip(),
            description=description.strip(),
            due_at=due_at,
            opened_on=opened_on_from_due(due_at, _TZ),
            status=status,
            assignee_user_id=mp.parse_uuid(assignee_user_id) if assignee_user_id else None,
            department_id=mp.parse_uuid(department_id) if department_id else None,
            task_kind=task_kind,
            ops_category=ops_category,
            min_video_seconds=min_video_seconds,
            completion_requirements=completion_requirements,
            is_work_start=bool(is_work_start),
            network_group_id=mp.parse_uuid(network_group_id) if network_group_id else None,
            manager_user_id=mp.parse_uuid(manager_user_id) if manager_user_id else None,
            photo_required=photo_required,
            reference_photo_url=(reference_photo_url or "").strip() or None,
            reference_video_url=(reference_video_url or "").strip() or None,
            reference_audio_url=(reference_audio_url or "").strip() or None,
            created_by_id=mp.parse_uuid(created_by_id) if created_by_id else None,
            source_gallery_item_id=(
                mp.parse_uuid(source_gallery_item_id) if source_gallery_item_id else None
            ),
        )
        self._db.add(row)
        self._db.flush()
        out = mp.task_occurrence_orm_to_domain(row)
        assert out is not None
        return out

    def update_status(self, id_: str, status: str) -> TaskOccurrence | None:
        row = self._db.get(orm.TaskOccurrence, mp.parse_uuid(id_))
        if not row:
            return None
        row.status = status
        if status in task_status.TERMINAL:
            row.manager_next_at = None
        self._db.flush()
        return mp.task_occurrence_orm_to_domain(row)

    def start(self, id_: str, *, started_by_id: str, started_at: datetime) -> TaskOccurrence | None:
        row = self._db.get(orm.TaskOccurrence, mp.parse_uuid(id_))
        if not row:
            return None
        row.status = task_status.IN_PROGRESS
        row.started_by_id = mp.parse_uuid(started_by_id)
        row.started_at = started_at
        row.manager_next_at = None
        self._db.flush()
        return mp.task_occurrence_orm_to_domain(row)

    def clear_manager_next_for_assignee(self, assignee_user_id: str) -> None:
        uid = mp.parse_uuid(assignee_user_id)
        rows = (
            self._db.query(orm.TaskOccurrence)
            .filter(
                orm.TaskOccurrence.assignee_user_id == uid,
                orm.TaskOccurrence.manager_next_at.isnot(None),
            )
            .all()
        )
        for row in rows:
            row.manager_next_at = None
        if rows:
            self._db.flush()

    def set_manager_next(
        self,
        id_: str,
        *,
        manager_next_at: datetime | None,
    ) -> TaskOccurrence | None:
        row = self._db.get(orm.TaskOccurrence, mp.parse_uuid(id_))
        if not row:
            return None
        row.manager_next_at = manager_next_at
        self._db.flush()
        return mp.task_occurrence_orm_to_domain(row)

    def reopen_after_review(self, id_: str) -> TaskOccurrence | None:
        row = self._db.get(orm.TaskOccurrence, mp.parse_uuid(id_))
        if not row:
            return None
        row.status = task_status.IN_PROGRESS
        self._db.flush()
        return mp.task_occurrence_orm_to_domain(row)

    def delegate(self, id_: str, *, assignee_user_id: str) -> TaskOccurrence | None:
        row = self._db.get(orm.TaskOccurrence, mp.parse_uuid(id_))
        if not row:
            return None
        row.assignee_user_id = mp.parse_uuid(assignee_user_id)
        self._db.flush()
        return mp.task_occurrence_orm_to_domain(row)

    def update_title_description(
        self, id_: str, *, title: str, description: str
    ) -> TaskOccurrence | None:
        row = self._db.get(orm.TaskOccurrence, mp.parse_uuid(id_))
        if not row:
            return None
        row.title = title.strip()
        row.description = description.strip()
        self._db.flush()
        return mp.task_occurrence_orm_to_domain(row)

    def update_completion_requirements(
        self, id_: str, requirements: list | None
    ) -> TaskOccurrence | None:
        row = self._db.get(orm.TaskOccurrence, mp.parse_uuid(id_))
        if not row:
            return None
        row.completion_requirements = requirements or []
        self._db.flush()
        return mp.task_occurrence_orm_to_domain(row)

    def update_details(
        self,
        id_: str,
        *,
        title: str,
        description: str,
        due_at: datetime,
        assignee_user_id: str | None,
        photo_required: bool | None = None,
        reference_photo_url: str | None = None,
        reference_video_url: str | None = None,
        reference_audio_url: str | None = None,
        update_reference_photo: bool = False,
        update_reference_video: bool = False,
        update_reference_audio: bool = False,
        min_video_seconds: int | None = None,
        update_min_video_seconds: bool = False,
        completion_requirements: list | None = None,
        update_completion_requirements: bool = False,
    ) -> TaskOccurrence | None:
        row = self._db.get(orm.TaskOccurrence, mp.parse_uuid(id_))
        if not row:
            return None
        row.title = title.strip()
        row.description = description.strip()
        row.due_at = due_at
        row.assignee_user_id = mp.parse_uuid(assignee_user_id) if assignee_user_id else None
        if photo_required is not None:
            row.photo_required = photo_required
        if update_min_video_seconds:
            row.min_video_seconds = min_video_seconds
        if update_completion_requirements:
            row.completion_requirements = completion_requirements
        if update_reference_photo:
            row.reference_photo_url = (reference_photo_url or "").strip() or None
        if update_reference_video:
            row.reference_video_url = (reference_video_url or "").strip() or None
        if update_reference_audio:
            row.reference_audio_url = (reference_audio_url or "").strip() or None
        self._db.flush()
        return mp.task_occurrence_orm_to_domain(row)

    def update_reference_media(
        self,
        id_: str,
        *,
        reference_photo_url: str | None,
        reference_video_url: str | None,
        reference_audio_url: str | None,
    ) -> TaskOccurrence | None:
        row = self._db.get(orm.TaskOccurrence, mp.parse_uuid(id_))
        if not row:
            return None
        row.reference_photo_url = (reference_photo_url or "").strip() or None
        row.reference_video_url = (reference_video_url or "").strip() or None
        row.reference_audio_url = (reference_audio_url or "").strip() or None
        self._db.flush()
        return mp.task_occurrence_orm_to_domain(row)

    def mark_overdue_before(
        self, now: datetime, *, branch_ids: list[str] | None = None
    ) -> int:
        """Passe PENDING → OVERDUE en un seul UPDATE (pas de N+1).

        Grâce de 15 min après l'échéance pour éviter באיחור immédiat
        quand due_at est proche de « maintenant » à la création.
        """
        from app.domain.task_overdue import overdue_cutoff

        cutoff = overdue_cutoff(now)
        q = (
            update(orm.TaskOccurrence)
            .where(orm.TaskOccurrence.status == task_status.PENDING)
            .where(orm.TaskOccurrence.due_at < cutoff)
            .values(status=task_status.OVERDUE)
        )
        if branch_ids is not None:
            if not branch_ids:
                return 0
            q = q.where(
                orm.TaskOccurrence.branch_id.in_([mp.parse_uuid(i) for i in branch_ids])
            )
        result = self._db.execute(q)
        self._db.flush()
        return int(result.rowcount or 0)

    def rollover_open_tasks_to_day(
        self,
        day: date,
        *,
        now: datetime,
        branch_ids: list[str] | None = None,
    ) -> int:
        """Avance due_at des מזדמנות ouvertes ; קבועות non reportées (nouvelle gen. scheduler)."""
        cutoff = start_of_day(day, _TZ)
        q = (
            select(orm.TaskOccurrence)
            .where(orm.TaskOccurrence.status.in_(tuple(ROLLOVER_STATUSES)))
            .where(orm.TaskOccurrence.task_kind == AD_HOC)
            .where(orm.TaskOccurrence.due_at < cutoff)
        )
        if branch_ids is not None:
            if not branch_ids:
                return 0
            q = q.where(
                orm.TaskOccurrence.branch_id.in_([mp.parse_uuid(i) for i in branch_ids])
            )
        rows = self._db.execute(q).scalars().all()
        count = 0
        for row in rows:
            if not can_rollover_task_kind(getattr(row, "task_kind", None)):
                continue
            if getattr(row, "opened_on", None) is None:
                row.opened_on = opened_on_from_due(row.due_at, _TZ)
            new_due = rollover_due_datetime(row.due_at, to_day=day, tz=_TZ)
            row.due_at = new_due
            row.status = status_after_rollover(row.status, new_due_at=new_due, now=now)
            count += 1
        if count:
            self._db.flush()
        return count

    def set_media_purge_after(self, id_: str, when: datetime | None) -> TaskOccurrence | None:
        row = self._db.get(orm.TaskOccurrence, mp.parse_uuid(id_))
        if not row:
            return None
        row.media_purge_after = when
        self._db.flush()
        return mp.task_occurrence_orm_to_domain(row)

    def list_due_for_media_purge(self, before: datetime) -> list[TaskOccurrence]:
        q = (
            select(orm.TaskOccurrence)
            .where(orm.TaskOccurrence.media_purge_after.is_not(None))
            .where(orm.TaskOccurrence.media_purge_after <= before)
        )
        rows = self._db.execute(q).scalars().all()
        return [o for r in rows if (o := mp.task_occurrence_orm_to_domain(r))]

    def clear_reference_media(self, id_: str) -> TaskOccurrence | None:
        return self.update_reference_media(
            id_,
            reference_photo_url=None,
            reference_video_url=None,
            reference_audio_url=None,
        )

    def delete(self, id_: str) -> bool:
        row = self._db.get(orm.TaskOccurrence, mp.parse_uuid(id_))
        if not row:
            return False
        self._db.delete(row)
        self._db.flush()
        return True

    def get_branch_name(self, branch_id: str) -> str | None:
        row = self._db.get(orm.Branch, mp.parse_uuid(branch_id))
        return row.name if row else None

    def get_department_name(self, department_id: str | None) -> str | None:
        if not department_id:
            return None
        row = self._db.get(orm.Department, mp.parse_uuid(department_id))
        return row.name if row else None

    def get_assignee_name(self, user_id: str | None) -> str | None:
        if not user_id:
            return None
        row = self._db.get(orm.User, mp.parse_uuid(user_id))
        if not row:
            return None
        return f"{row.first_name} {row.last_name}".strip()

    def get_manager_name(self, user_id: str | None) -> str | None:
        return self.get_assignee_name(user_id)

    def lookup_display_names(
        self,
        *,
        branch_ids: set[str],
        department_ids: set[str],
        user_ids: set[str],
    ) -> tuple[dict[str, str], dict[str, str], dict[str, str]]:
        """Batch branch / department / user names for list serialization."""
        branches: dict[str, str] = {}
        if branch_ids:
            rows = (
                self._db.query(orm.Branch)
                .filter(orm.Branch.id.in_([mp.parse_uuid(i) for i in branch_ids]))
                .all()
            )
            branches = {str(r.id): r.name for r in rows}
        departments: dict[str, str] = {}
        if department_ids:
            rows = (
                self._db.query(orm.Department)
                .filter(orm.Department.id.in_([mp.parse_uuid(i) for i in department_ids]))
                .all()
            )
            departments = {str(r.id): r.name for r in rows}
        users: dict[str, str] = {}
        if user_ids:
            rows = (
                self._db.query(orm.User)
                .filter(orm.User.id.in_([mp.parse_uuid(i) for i in user_ids]))
                .all()
            )
            users = {
                str(r.id): f"{r.first_name} {r.last_name}".strip() for r in rows
            }
        return branches, departments, users
