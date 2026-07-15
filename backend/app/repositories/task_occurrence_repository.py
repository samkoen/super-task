from datetime import date, datetime

from sqlalchemy import func, select
from sqlalchemy.orm import Session

import app.db.models as orm
from app.db import mappers as mp
from app.domain import task_status
from app.models.task_occurrence import TaskOccurrence


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
        q = (
            select(func.count())
            .select_from(orm.TaskOccurrence)
            .where(orm.TaskOccurrence.template_id == mp.parse_uuid(template_id))
            .where(func.date(orm.TaskOccurrence.due_at) == day)
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
        if due_on:
            q = q.where(func.date(orm.TaskOccurrence.due_at) == due_on)
        else:
            if due_from:
                q = q.where(func.date(orm.TaskOccurrence.due_at) >= due_from)
            if due_to:
                q = q.where(func.date(orm.TaskOccurrence.due_at) <= due_to)
        rows = self._db.execute(q).scalars().all()
        return [o for row in rows if (o := mp.task_occurrence_orm_to_domain(row))]

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
    ) -> TaskOccurrence:
        import uuid

        row = orm.TaskOccurrence(
            id=uuid.uuid4(),
            template_id=mp.parse_uuid(template_id) if template_id else None,
            branch_id=mp.parse_uuid(branch_id),
            title=title.strip(),
            description=description.strip(),
            due_at=due_at,
            status=status,
            assignee_user_id=mp.parse_uuid(assignee_user_id) if assignee_user_id else None,
            department_id=mp.parse_uuid(department_id) if department_id else None,
            task_kind=task_kind,
            manager_user_id=mp.parse_uuid(manager_user_id) if manager_user_id else None,
            photo_required=photo_required,
            reference_photo_url=(reference_photo_url or "").strip() or None,
            reference_video_url=(reference_video_url or "").strip() or None,
            reference_audio_url=(reference_audio_url or "").strip() or None,
            created_by_id=mp.parse_uuid(created_by_id) if created_by_id else None,
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
        self._db.flush()
        return mp.task_occurrence_orm_to_domain(row)

    def start(self, id_: str, *, started_by_id: str, started_at: datetime) -> TaskOccurrence | None:
        row = self._db.get(orm.TaskOccurrence, mp.parse_uuid(id_))
        if not row:
            return None
        row.status = task_status.IN_PROGRESS
        row.started_by_id = mp.parse_uuid(started_by_id)
        row.started_at = started_at
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

    def mark_overdue_before(self, now: datetime) -> int:
        q = (
            select(orm.TaskOccurrence)
            .where(orm.TaskOccurrence.status == task_status.PENDING)
            .where(orm.TaskOccurrence.due_at < now)
        )
        rows = self._db.execute(q).scalars().all()
        count = 0
        for row in rows:
            row.status = task_status.OVERDUE
            count += 1
        if count:
            self._db.flush()
        return count

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
