"""Persistance des messages chat tâche."""
from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

import app.db.models as orm
from app.db import mappers as mp
from app.models.task_message import TaskMessage


class TaskMessageRepository:
    def __init__(self, db: Session):
        self._db = db

    def list_for_occurrence(self, occurrence_id: str) -> list[TaskMessage]:
        rows = self._db.scalars(
            select(orm.TaskMessage)
            .where(orm.TaskMessage.occurrence_id == mp.parse_uuid(occurrence_id))
            .order_by(orm.TaskMessage.created_at.asc())
        ).all()
        return [m for m in (mp.task_message_orm_to_domain(r) for r in rows) if m]

    def create(
        self,
        *,
        occurrence_id: str,
        sender_user_id: str,
        body: str | None,
        photo_url: str | None = None,
        video_url: str | None = None,
        audio_url: str | None = None,
        body_translated: str | None = None,
        audio_transcript: str | None = None,
        audio_transcript_sender: str | None = None,
    ) -> TaskMessage:
        row = orm.TaskMessage(
            id=uuid.uuid4(),
            occurrence_id=mp.parse_uuid(occurrence_id),
            sender_user_id=mp.parse_uuid(sender_user_id),
            body=(body or "").strip() or None,
            body_translated=(body_translated or "").strip() or None,
            photo_url=(photo_url or "").strip() or None,
            video_url=(video_url or "").strip() or None,
            audio_url=(audio_url or "").strip() or None,
            audio_transcript=(audio_transcript or "").strip() or None,
            audio_transcript_sender=(audio_transcript_sender or "").strip() or None,
        )
        self._db.add(row)
        self._db.flush()
        out = mp.task_message_orm_to_domain(row)
        assert out is not None
        return out

    def update_i18n(
        self,
        message_id: str,
        *,
        body_translated: str | None = None,
        audio_transcript: str | None = None,
        audio_transcript_sender: str | None = None,
    ) -> TaskMessage | None:
        row = self._db.get(orm.TaskMessage, mp.parse_uuid(message_id))
        if not row:
            return None
        if body_translated is not None:
            row.body_translated = (body_translated or "").strip() or None
        if audio_transcript is not None:
            row.audio_transcript = (audio_transcript or "").strip() or None
        if audio_transcript_sender is not None:
            row.audio_transcript_sender = (audio_transcript_sender or "").strip() or None
        self._db.flush()
        return mp.task_message_orm_to_domain(row)
