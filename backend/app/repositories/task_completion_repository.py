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

    def find_by_occurrence_ids(self, occurrence_ids: list[str]) -> dict[str, TaskCompletion]:
        if not occurrence_ids:
            return {}
        try:
            uuids = [mp.parse_uuid(oid) for oid in occurrence_ids]
        except ValueError:
            return {}
        rows = (
            self._db.query(orm.TaskCompletion)
            .filter(orm.TaskCompletion.occurrence_id.in_(uuids))
            .all()
        )
        result: dict[str, TaskCompletion] = {}
        for row in rows:
            domain = mp.task_completion_orm_to_domain(row)
            if domain:
                result[str(row.occurrence_id)] = domain
        return result

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
        manager_review_status: str | None = None,
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
            manager_review_status=manager_review_status,
        )
        self._db.add(row)
        self._db.flush()
        out = mp.task_completion_orm_to_domain(row)
        assert out is not None
        return out

    def update_submission(
        self,
        occurrence_id: str,
        *,
        status: str,
        note: str | None,
        photo_path: str | None,
        video_path: str | None,
        audio_path: str | None,
        not_completed_reason: str | None,
        completed_by_id: str,
        manager_review_status: str | None,
    ) -> TaskCompletion | None:
        row = (
            self._db.query(orm.TaskCompletion)
            .filter(orm.TaskCompletion.occurrence_id == mp.parse_uuid(occurrence_id))
            .first()
        )
        if not row:
            return None
        row.status = status
        row.note = note
        row.photo_path = photo_path
        row.video_path = video_path
        row.audio_path = audio_path
        row.audio_transcript = None
        row.audio_transcript_employee = None
        row.not_completed_reason = not_completed_reason
        row.completed_by_id = mp.parse_uuid(completed_by_id)
        row.manager_review_status = manager_review_status
        row.manager_reviewed_by_id = None
        row.manager_reviewed_at = None
        row.rejection_note = None
        self._db.flush()
        return mp.task_completion_orm_to_domain(row)

    def update_review(
        self,
        occurrence_id: str,
        *,
        manager_review_status: str,
        manager_reviewed_by_id: str,
        manager_reviewed_at,
        rejection_note: str | None = None,
    ) -> TaskCompletion | None:
        row = (
            self._db.query(orm.TaskCompletion)
            .filter(orm.TaskCompletion.occurrence_id == mp.parse_uuid(occurrence_id))
            .first()
        )
        if not row:
            return None
        row.manager_review_status = manager_review_status
        row.manager_reviewed_by_id = mp.parse_uuid(manager_reviewed_by_id)
        row.manager_reviewed_at = manager_reviewed_at
        row.rejection_note = rejection_note
        self._db.flush()
        return mp.task_completion_orm_to_domain(row)

    def update_audio_transcripts(
        self,
        occurrence_id: str,
        *,
        audio_transcript: str | None,
        audio_transcript_employee: str | None,
    ) -> TaskCompletion | None:
        row = (
            self._db.query(orm.TaskCompletion)
            .filter(orm.TaskCompletion.occurrence_id == mp.parse_uuid(occurrence_id))
            .first()
        )
        if not row:
            return None
        row.audio_transcript = audio_transcript
        row.audio_transcript_employee = audio_transcript_employee
        self._db.flush()
        return mp.task_completion_orm_to_domain(row)

    def update_audio_transcript(self, occurrence_id: str, audio_transcript: str | None) -> TaskCompletion | None:
        return self.update_audio_transcripts(
            occurrence_id,
            audio_transcript=audio_transcript,
            audio_transcript_employee=None,
        )
