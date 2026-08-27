from datetime import datetime, timezone

from sqlalchemy import and_, func, or_, select
from sqlalchemy.orm import Session

import app.db.models as orm
from app.db import mappers as mp
from app.domain.chat_page import page_from_newest_first
from app.models.direct_conversation import DirectConversation
from app.models.direct_message import DirectMessage


class DirectConversationRepository:
    def __init__(self, db: Session):
        self._db = db

    def get(self, conversation_id: str) -> DirectConversation | None:
        try:
            row = self._db.get(orm.DirectConversation, mp.parse_uuid(conversation_id))
        except ValueError:
            return None
        return mp.direct_conversation_orm_to_domain(row)

    def find(self, scope: str, scope_id: str, counterpart_user_id: str) -> DirectConversation | None:
        try:
            row = self._db.execute(
                select(orm.DirectConversation).where(
                    orm.DirectConversation.scope == scope,
                    orm.DirectConversation.scope_id == mp.parse_uuid(scope_id),
                    orm.DirectConversation.counterpart_user_id == mp.parse_uuid(counterpart_user_id),
                )
            ).scalar_one_or_none()
        except ValueError:
            return None
        return mp.direct_conversation_orm_to_domain(row)

    def list_for_scope(self, scope: str, scope_id: str) -> list[DirectConversation]:
        rows = self._db.execute(
            select(orm.DirectConversation)
            .where(
                orm.DirectConversation.scope == scope,
                orm.DirectConversation.scope_id == mp.parse_uuid(scope_id),
            )
            .order_by(orm.DirectConversation.last_at.desc())
        ).scalars().all()
        return [c for row in rows if (c := mp.direct_conversation_orm_to_domain(row))]

    def get_or_create(self, scope: str, scope_id: str, counterpart_user_id: str) -> DirectConversation:
        existing = self.find(scope, scope_id, counterpart_user_id)
        if existing:
            return existing
        import uuid

        row = orm.DirectConversation(
            id=uuid.uuid4(),
            scope=scope,
            scope_id=mp.parse_uuid(scope_id),
            counterpart_user_id=mp.parse_uuid(counterpart_user_id),
        )
        self._db.add(row)
        self._db.flush()
        found = mp.direct_conversation_orm_to_domain(row)
        assert found is not None
        return found

    def touch_last(
        self,
        conversation_id: str,
        *,
        preview: str,
        sender_user_id: str,
        at: datetime,
    ) -> None:
        row = self._db.get(orm.DirectConversation, mp.parse_uuid(conversation_id))
        if not row:
            return
        row.last_preview = preview[:80] if preview else None
        row.last_at = at
        row.last_sender_user_id = mp.parse_uuid(sender_user_id)
        self._db.flush()


class DirectMessageRepository:
    def __init__(self, db: Session):
        self._db = db

    def list_page(
        self,
        conversation_id: str,
        *,
        limit: int,
        before_id: str | None = None,
    ) -> tuple[list[DirectMessage], bool]:
        conv_uuid = mp.parse_uuid(conversation_id)
        q = select(orm.DirectMessage).where(orm.DirectMessage.conversation_id == conv_uuid)
        cursor = self._cursor(before_id, conv_uuid)
        if cursor is not None:
            q = q.where(orm.DirectMessage.id != cursor.id).where(
                or_(
                    orm.DirectMessage.created_at < cursor.created_at,
                    and_(
                        orm.DirectMessage.created_at == cursor.created_at,
                        orm.DirectMessage.id < cursor.id,
                    ),
                )
            )
        rows = self._db.execute(
            q.order_by(orm.DirectMessage.created_at.desc(), orm.DirectMessage.id.desc()).limit(limit + 1)
        ).scalars().all()
        page = page_from_newest_first(rows, limit)
        items = [m for row in page.items if (m := mp.direct_message_orm_to_domain(row))]
        return items, page.has_more

    def _cursor(self, before_id: str | None, conv_uuid):
        if not before_id:
            return None
        try:
            row = self._db.get(orm.DirectMessage, mp.parse_uuid(before_id))
        except ValueError:
            return None
        if not row or row.conversation_id != conv_uuid:
            return None
        return row

    def create(
        self,
        conversation_id: str,
        sender_user_id: str,
        *,
        body: str | None,
        photo_url: str | None,
        video_url: str | None,
        audio_url: str | None,
    ) -> DirectMessage:
        import uuid

        now = datetime.now(timezone.utc)
        row = orm.DirectMessage(
            id=uuid.uuid4(),
            conversation_id=mp.parse_uuid(conversation_id),
            sender_user_id=mp.parse_uuid(sender_user_id),
            body=body,
            photo_url=photo_url,
            video_url=video_url,
            audio_url=audio_url,
            created_at=now,
        )
        self._db.add(row)
        self._db.flush()
        found = mp.direct_message_orm_to_domain(row)
        assert found is not None
        return found

    def unread_count(self, conversation_id: str, user_id: str, last_read_at: datetime | None) -> int:
        q = select(func.count()).select_from(orm.DirectMessage).where(
            orm.DirectMessage.conversation_id == mp.parse_uuid(conversation_id),
            orm.DirectMessage.sender_user_id != mp.parse_uuid(user_id),
        )
        if last_read_at is not None:
            q = q.where(orm.DirectMessage.created_at > last_read_at)
        return int(self._db.execute(q).scalar_one() or 0)


class DirectConversationReadRepository:
    def __init__(self, db: Session):
        self._db = db

    def last_read_at(self, conversation_id: str, user_id: str) -> datetime | None:
        row = self._db.get(
            orm.DirectConversationRead,
            {
                "conversation_id": mp.parse_uuid(conversation_id),
                "user_id": mp.parse_uuid(user_id),
            },
        )
        return row.last_read_at if row else None

    def mark_read(self, conversation_id: str, user_id: str) -> None:
        now = datetime.now(timezone.utc)
        row = self._db.get(
            orm.DirectConversationRead,
            {
                "conversation_id": mp.parse_uuid(conversation_id),
                "user_id": mp.parse_uuid(user_id),
            },
        )
        if row:
            row.last_read_at = now
        else:
            self._db.add(
                orm.DirectConversationRead(
                    conversation_id=mp.parse_uuid(conversation_id),
                    user_id=mp.parse_uuid(user_id),
                    last_read_at=now,
                )
            )
        self._db.flush()
