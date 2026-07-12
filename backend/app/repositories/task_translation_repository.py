"""Cache traductions AI par occurrence."""
from __future__ import annotations

import uuid

from sqlalchemy import select

import app.db.models as orm
from app.db import mappers as mp
from app.models.task_translation import TaskOccurrenceTranslation


class TaskTranslationRepository:
    def __init__(self, db):
        self._db = db

    def get_many(self, occurrence_ids: list[str], language: str) -> dict[str, TaskOccurrenceTranslation]:
        if not occurrence_ids:
            return {}
        ids = [mp.parse_uuid(item) for item in occurrence_ids]
        rows = self._db.execute(
            select(orm.TaskOccurrenceTranslation).where(
                orm.TaskOccurrenceTranslation.occurrence_id.in_(ids),
                orm.TaskOccurrenceTranslation.language == language,
            )
        ).scalars().all()
        result: dict[str, TaskOccurrenceTranslation] = {}
        for row in rows:
            domain = self._to_domain(row)
            if domain:
                result[domain.occurrence_id] = domain
        return result

    def upsert(
        self,
        *,
        occurrence_id: str,
        language: str,
        title: str,
        description: str,
        spoken_text: str,
        source_hash: str,
    ) -> None:
        occ_id = mp.parse_uuid(occurrence_id)
        row = self._db.execute(
            select(orm.TaskOccurrenceTranslation).where(
                orm.TaskOccurrenceTranslation.occurrence_id == occ_id,
                orm.TaskOccurrenceTranslation.language == language,
            )
        ).scalar_one_or_none()
        if row is None:
            row = orm.TaskOccurrenceTranslation(
                id=uuid.uuid4(),
                occurrence_id=occ_id,
                language=language,
                title=title,
                description=description,
                spoken_text=spoken_text,
                source_hash=source_hash,
            )
            self._db.add(row)
        else:
            row.title = title
            row.description = description
            row.spoken_text = spoken_text
            row.source_hash = source_hash
        self._db.flush()

    def _to_domain(self, row: orm.TaskOccurrenceTranslation | None) -> TaskOccurrenceTranslation | None:
        if row is None:
            return None
        return TaskOccurrenceTranslation(
            id=str(row.id),
            occurrence_id=str(row.occurrence_id),
            language=row.language,
            title=row.title,
            description=row.description,
            spoken_text=row.spoken_text,
            source_hash=row.source_hash,
        )
