from __future__ import annotations

import uuid

from sqlalchemy import or_, select
from sqlalchemy.orm import Session

import app.db.models as orm
from app.db import mappers as mp
from app.models.task_gallery_item import TaskGalleryItem


class TaskGalleryRepository:
    def __init__(self, db: Session):
        self._db = db

    def create(self, **kwargs) -> TaskGalleryItem:
        row = orm.TaskGalleryItem(
            id=uuid.uuid4(),
            network_id=mp.parse_uuid(kwargs["network_id"]),
            branch_id=mp.parse_uuid(kwargs["branch_id"]) if kwargs.get("branch_id") else None,
            title=kwargs["title"].strip(),
            description=(kwargs.get("description") or "").strip(),
            task_kind=kwargs["task_kind"],
            recurrence=kwargs.get("recurrence"),
            due_time=kwargs.get("due_time"),
            weekly_days=kwargs.get("weekly_days"),
            monthly_day=kwargs.get("monthly_day"),
            photo_required=bool(kwargs.get("photo_required", True)),
            reference_photo_url=kwargs.get("reference_photo_url"),
            reference_video_url=kwargs.get("reference_video_url"),
            reference_audio_url=kwargs.get("reference_audio_url"),
            source_occurrence_id=(
                mp.parse_uuid(kwargs["source_occurrence_id"])
                if kwargs.get("source_occurrence_id")
                else None
            ),
            created_by_id=mp.parse_uuid(kwargs["created_by_id"]),
        )
        self._db.add(row)
        self._db.flush()
        out = self._to_domain(row)
        assert out is not None
        return out

    def find_by_id(self, item_id: str) -> TaskGalleryItem | None:
        try:
            row = self._db.get(orm.TaskGalleryItem, mp.parse_uuid(item_id))
        except ValueError:
            return None
        return self._to_domain(row)

    def find_by_source_occurrence_id(self, occurrence_id: str) -> TaskGalleryItem | None:
        try:
            oid = mp.parse_uuid(occurrence_id)
        except ValueError:
            return None
        row = self._db.execute(
            select(orm.TaskGalleryItem).where(
                orm.TaskGalleryItem.source_occurrence_id == oid
            )
        ).scalar_one_or_none()
        return self._to_domain(row)

    def source_occurrence_ids_in(self, occurrence_ids: list[str]) -> set[str]:
        if not occurrence_ids:
            return set()
        uuids = []
        for oid in occurrence_ids:
            try:
                uuids.append(mp.parse_uuid(oid))
            except ValueError:
                continue
        if not uuids:
            return set()
        rows = self._db.execute(
            select(orm.TaskGalleryItem.source_occurrence_id).where(
                orm.TaskGalleryItem.source_occurrence_id.in_(uuids)
            )
        ).scalars().all()
        return {str(r) for r in rows if r}

    def list_items(
        self,
        *,
        network_id: str | None = None,
        branch_ids: list[str] | None = None,
        include_network_wide: bool = True,
        task_kind: str | None = None,
    ) -> list[TaskGalleryItem]:
        q = select(orm.TaskGalleryItem).order_by(orm.TaskGalleryItem.created_at.desc())
        if network_id:
            q = q.where(orm.TaskGalleryItem.network_id == mp.parse_uuid(network_id))
        if branch_ids is not None:
            branch_uuids = [mp.parse_uuid(i) for i in branch_ids]
            if include_network_wide:
                q = q.where(
                    or_(
                        orm.TaskGalleryItem.branch_id.is_(None),
                        orm.TaskGalleryItem.branch_id.in_(branch_uuids),
                    )
                )
            else:
                q = q.where(orm.TaskGalleryItem.branch_id.in_(branch_uuids))
        if task_kind:
            q = q.where(orm.TaskGalleryItem.task_kind == task_kind)
        rows = self._db.execute(q).scalars().all()
        return [r for row in rows if (r := self._to_domain(row))]

    def update(self, item_id: str, **kwargs) -> TaskGalleryItem | None:
        try:
            row = self._db.get(orm.TaskGalleryItem, mp.parse_uuid(item_id))
        except ValueError:
            return None
        if row is None:
            return None
        for key, value in kwargs.items():
            if key == "branch_id":
                row.branch_id = mp.parse_uuid(value) if value else None
            elif hasattr(row, key):
                setattr(row, key, value)
        self._db.flush()
        return self._to_domain(row)

    def delete(self, item_id: str) -> bool:
        try:
            row = self._db.get(orm.TaskGalleryItem, mp.parse_uuid(item_id))
        except ValueError:
            return False
        if row is None:
            return False
        self._db.delete(row)
        self._db.flush()
        return True

    @staticmethod
    def _to_domain(row: orm.TaskGalleryItem | None) -> TaskGalleryItem | None:
        if row is None:
            return None
        return TaskGalleryItem(
            id=str(row.id),
            network_id=str(row.network_id),
            branch_id=str(row.branch_id) if row.branch_id else None,
            title=row.title,
            description=row.description or "",
            task_kind=row.task_kind,
            recurrence=row.recurrence,
            due_time=row.due_time,
            weekly_days=row.weekly_days,
            monthly_day=row.monthly_day,
            photo_required=bool(row.photo_required),
            reference_photo_url=row.reference_photo_url,
            reference_video_url=row.reference_video_url,
            reference_audio_url=row.reference_audio_url,
            created_by_id=str(row.created_by_id),
            created_at=mp.parse_datetime_iso(row.created_at),
            updated_at=mp.parse_datetime_iso(row.updated_at),
            source_occurrence_id=(
                str(row.source_occurrence_id) if row.source_occurrence_id else None
            ),
        )
