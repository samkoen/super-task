from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

import app.db.models as orm
from app.db import mappers as mp
from app.models.task_template import TaskTemplate


class TaskTemplateRepository:
    def __init__(self, db: Session):
        self._db = db

    def find_by_id(self, id_: str) -> TaskTemplate | None:
        try:
            return mp.task_template_orm_to_domain(self._db.get(orm.TaskTemplate, mp.parse_uuid(id_)))
        except ValueError:
            return None

    def find_by_ids(self, ids: list[str]) -> dict[str, TaskTemplate]:
        if not ids:
            return {}
        try:
            uuids = [mp.parse_uuid(i) for i in ids]
        except ValueError:
            return {}
        rows = (
            self._db.execute(select(orm.TaskTemplate).where(orm.TaskTemplate.id.in_(uuids)))
            .scalars()
            .all()
        )
        out: dict[str, TaskTemplate] = {}
        for row in rows:
            domain = mp.task_template_orm_to_domain(row)
            if domain:
                out[domain.id] = domain
        return out

    def list_templates(
        self,
        *,
        branch_ids: list[str] | None = None,
        branch_id: str | None = None,
        active_only: bool = True,
        task_kind: str | None = None,
    ) -> list[TaskTemplate]:
        q = select(orm.TaskTemplate).order_by(orm.TaskTemplate.created_at.desc())
        if branch_id:
            q = q.where(orm.TaskTemplate.branch_id == mp.parse_uuid(branch_id))
        if branch_ids is not None:
            q = q.where(orm.TaskTemplate.branch_id.in_([mp.parse_uuid(i) for i in branch_ids]))
        if active_only:
            q = q.where(orm.TaskTemplate.is_active.is_(True))
        if task_kind:
            q = q.where(orm.TaskTemplate.task_kind == task_kind)
        rows = self._db.execute(q).scalars().all()
        return [t for row in rows if (t := mp.task_template_orm_to_domain(row))]

    def list_active_recurring(self) -> list[TaskTemplate]:
        q = (
            select(orm.TaskTemplate)
            .where(orm.TaskTemplate.is_active.is_(True))
            .where(orm.TaskTemplate.task_kind == "fixed")
            .where(orm.TaskTemplate.recurrence.in_(["daily", "weekly", "biweekly", "monthly"]))
        )
        rows = self._db.execute(q).scalars().all()
        return [t for row in rows if (t := mp.task_template_orm_to_domain(row))]

    def list_by_network_group(self, network_group_id: str) -> list[TaskTemplate]:
        try:
            gid = mp.parse_uuid(network_group_id)
        except ValueError:
            return []
        q = select(orm.TaskTemplate).where(orm.TaskTemplate.network_group_id == gid)
        rows = self._db.execute(q).scalars().all()
        return [t for row in rows if (t := mp.task_template_orm_to_domain(row))]

    def create(
        self,
        *,
        branch_id: str,
        title: str,
        description: str,
        recurrence: str,
        due_time: str,
        weekly_days: str | None,
        monthly_day: int | None,
        assignee_user_id: str | None,
        department_id: str | None,
        created_by_id: str,
        task_kind: str = "fixed",
        photo_required: bool = False,
        reference_photo_url: str | None = None,
        reference_video_url: str | None = None,
        reference_audio_url: str | None = None,
        biweekly_anchor: datetime | None = None,
        source_gallery_item_id: str | None = None,
        ops_category: str | None = None,
        min_video_seconds: int | None = None,
        completion_requirements: list | None = None,
        is_work_start: bool = False,
        start_url: str | None = None,
        network_group_id: str | None = None,
    ) -> TaskTemplate:
        import uuid

        row = orm.TaskTemplate(
            id=uuid.uuid4(),
            branch_id=mp.parse_uuid(branch_id),
            title=title.strip(),
            description=description.strip(),
            recurrence=recurrence,
            due_time=due_time,
            weekly_days=weekly_days,
            monthly_day=monthly_day,
            assignee_user_id=mp.parse_uuid(assignee_user_id) if assignee_user_id else None,
            department_id=mp.parse_uuid(department_id) if department_id else None,
            task_kind=task_kind,
            ops_category=ops_category,
            min_video_seconds=min_video_seconds,
            completion_requirements=completion_requirements,
            is_work_start=bool(is_work_start),
            start_url=(start_url or "").strip() or None,
            network_group_id=mp.parse_uuid(network_group_id) if network_group_id else None,
            photo_required=photo_required,
            reference_photo_url=(reference_photo_url or "").strip() or None,
            reference_video_url=(reference_video_url or "").strip() or None,
            reference_audio_url=(reference_audio_url or "").strip() or None,
            biweekly_anchor=biweekly_anchor,
            source_gallery_item_id=(
                mp.parse_uuid(source_gallery_item_id) if source_gallery_item_id else None
            ),
            is_active=True,
            created_by_id=mp.parse_uuid(created_by_id),
        )
        self._db.add(row)
        self._db.flush()
        out = mp.task_template_orm_to_domain(row)
        assert out is not None
        return out

    def update(
        self,
        id_: str,
        *,
        title: str,
        description: str,
        due_time: str,
        weekly_days: str | None,
        assignee_user_id: str | None,
        department_id: str | None,
        is_active: bool,
        reference_photo_url: str | None = None,
        reference_video_url: str | None = None,
        reference_audio_url: str | None = None,
        ops_category: str | None = None,
        update_ops_category: bool = False,
        min_video_seconds: int | None = None,
        update_min_video_seconds: bool = False,
        completion_requirements: list | None = None,
        update_completion_requirements: bool = False,
        photo_required: bool | None = None,
        is_work_start: bool | None = None,
        start_url: str | None = None,
        update_start_url: bool = False,
    ) -> TaskTemplate | None:
        row = self._db.get(orm.TaskTemplate, mp.parse_uuid(id_))
        if not row:
            return None
        row.title = title.strip()
        row.description = description.strip()
        row.due_time = due_time
        row.weekly_days = weekly_days
        row.assignee_user_id = mp.parse_uuid(assignee_user_id) if assignee_user_id else None
        row.department_id = mp.parse_uuid(department_id) if department_id else None
        row.is_active = is_active
        if update_ops_category:
            row.ops_category = ops_category
        if update_min_video_seconds:
            row.min_video_seconds = min_video_seconds
        if update_completion_requirements:
            row.completion_requirements = completion_requirements
        if photo_required is not None:
            row.photo_required = bool(photo_required)
        if is_work_start is not None:
            row.is_work_start = bool(is_work_start)
        if update_start_url:
            row.start_url = (start_url or "").strip() or None
        if reference_photo_url is not None:
            row.reference_photo_url = reference_photo_url.strip() or None
        if reference_video_url is not None:
            row.reference_video_url = reference_video_url.strip() or None
        if reference_audio_url is not None:
            row.reference_audio_url = reference_audio_url.strip() or None
        self._db.flush()
        return mp.task_template_orm_to_domain(row)

    def delete(self, id_: str) -> bool:
        row = self._db.get(orm.TaskTemplate, mp.parse_uuid(id_))
        if not row:
            return False
        self._db.delete(row)
        self._db.flush()
        return True
