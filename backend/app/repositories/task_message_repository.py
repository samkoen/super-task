"""Persistance des messages chat tâche."""
from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import and_, func, or_, select
from sqlalchemy.orm import Session

import app.db.models as orm
from app.db import mappers as mp
from app.domain import task_status
from app.domain.chat_page import page_from_newest_first
from app.models.task_message import TaskMessage
from app.models.task_occurrence import TaskOccurrence


class TaskMessageRepository:
    def __init__(self, db: Session):
        self._db = db

    def list_page(
        self,
        occurrence_id: str,
        *,
        limit: int,
        before_id: str | None = None,
    ) -> tuple[list[TaskMessage], bool]:
        occ_uuid = mp.parse_uuid(occurrence_id)
        q = select(orm.TaskMessage).where(orm.TaskMessage.occurrence_id == occ_uuid)
        cursor = self._cursor(before_id, occ_uuid)
        if cursor is not None:
            q = q.where(orm.TaskMessage.id != cursor.id).where(
                or_(
                    orm.TaskMessage.created_at < cursor.created_at,
                    and_(
                        orm.TaskMessage.created_at == cursor.created_at,
                        orm.TaskMessage.id < cursor.id,
                    ),
                )
            )
        rows = self._db.scalars(
            q.order_by(orm.TaskMessage.created_at.desc(), orm.TaskMessage.id.desc()).limit(limit + 1)
        ).all()
        page = page_from_newest_first(rows, limit)
        items = [m for row in page.items if (m := mp.task_message_orm_to_domain(row))]
        return items, page.has_more

    def _cursor(self, before_id: str | None, occ_uuid):
        if not before_id:
            return None
        try:
            row = self._db.get(orm.TaskMessage, mp.parse_uuid(before_id))
        except ValueError:
            return None
        if not row or row.occurrence_id != occ_uuid:
            return None
        return row

    def create(
        self,
        *,
        occurrence_id: str,
        sender_user_id: str,
        body: str | None,
        photo_url: str | None = None,
        video_url: str | None = None,
        audio_url: str | None = None,
        file_url: str | None = None,
        file_name: str | None = None,
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
            file_url=(file_url or "").strip() or None,
            file_name=(file_name or "").strip() or None,
            audio_transcript=(audio_transcript or "").strip() or None,
            audio_transcript_sender=(audio_transcript_sender or "").strip() or None,
            created_at=datetime.now(timezone.utc),
        )
        self._db.add(row)
        self._db.flush()
        out = mp.task_message_orm_to_domain(row)
        assert out is not None
        return out

    def list_open_chats_for_assignee(
        self,
        assignee_user_id: str,
        *,
        exclude_statuses: frozenset[str] | None = None,
    ) -> list[tuple[TaskOccurrence, TaskMessage]]:
        uid = mp.parse_uuid(assignee_user_id)
        closed = exclude_statuses if exclude_statuses is not None else task_status.TERMINAL
        last_at = (
            select(
                orm.TaskMessage.occurrence_id,
                func.max(orm.TaskMessage.created_at).label("last_at"),
            )
            .group_by(orm.TaskMessage.occurrence_id)
            .subquery()
        )
        q = (
            select(orm.TaskOccurrence, orm.TaskMessage)
            .join(last_at, last_at.c.occurrence_id == orm.TaskOccurrence.id)
            .join(
                orm.TaskMessage,
                and_(
                    orm.TaskMessage.occurrence_id == orm.TaskOccurrence.id,
                    orm.TaskMessage.created_at == last_at.c.last_at,
                ),
            )
            .where(orm.TaskOccurrence.assignee_user_id == uid)
            .where(orm.TaskOccurrence.status.notin_(list(closed)))
            .order_by(orm.TaskMessage.created_at.desc())
        )
        return self._dedupe_latest_chats(self._db.execute(q).all())

    @staticmethod
    def _dedupe_latest_chats(rows) -> list[tuple[TaskOccurrence, TaskMessage]]:
        seen: set[str] = set()
        out: list[tuple[TaskOccurrence, TaskMessage]] = []
        for occ_row, msg_row in rows:
            oid = str(occ_row.id)
            if oid in seen:
                continue
            occ = mp.task_occurrence_orm_to_domain(occ_row)
            msg = mp.task_message_orm_to_domain(msg_row)
            if not occ or not msg:
                continue
            seen.add(oid)
            out.append((occ, msg))
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
