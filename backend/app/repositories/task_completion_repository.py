from sqlalchemy.orm import Session

import app.db.models as orm
from app.db import mappers as mp
from app.models.task_completion import TaskCompletion


class TaskCompletionRepository:
    def __init__(self, db: Session):
        self._db = db

    def find_by_occurrence(self, occurrence_id: str) -> TaskCompletion | None:
        try:
            q = self._db.query(orm.TaskCompletion).filter(
                orm.TaskCompletion.occurrence_id == mp.parse_uuid(occurrence_id)
            )
            row = q.first()
            return mp.task_completion_orm_to_domain(row)
        except ValueError:
            return None

    def create(
        self,
        *,
        occurrence_id: str,
        status: str,
        note: str | None,
        photo_path: str | None,
        video_path: str | None,
        audio_path: str | None,
        not_completed_reason: str | None,
        completed_by_id: str,
    ) -> TaskCompletion:
        import uuid

        row = orm.TaskCompletion(
            id=uuid.uuid4(),
            occurrence_id=mp.parse_uuid(occurrence_id),
            status=status,
            note=note,
            photo_path=photo_path,
            video_path=video_path,
            audio_path=audio_path,
            not_completed_reason=not_completed_reason,
            completed_by_id=mp.parse_uuid(completed_by_id),
        )
        self._db.add(row)
        self._db.flush()
        out = mp.task_completion_orm_to_domain(row)
        assert out is not None
        return out
