from datetime import datetime

from sqlalchemy import delete, select, update
from sqlalchemy.orm import Session

import app.db.models as orm
from app.db import mappers as mp
from app.models.user_notification import UserNotification


class NotificationRepository:
    def __init__(self, db: Session):
        self._db = db

    def create(
        self,
        *,
        user_id: str,
        kind: str,
        title: str,
        message: str,
        occurrence_id: str | None = None,
        issue_report_id: str | None = None,
        branch_id: str | None = None,
    ) -> UserNotification:
        import uuid

        row = orm.UserNotification(
            id=uuid.uuid4(),
            user_id=mp.parse_uuid(user_id),
            kind=kind,
            title=title.strip(),
            message=message.strip(),
            occurrence_id=mp.parse_uuid(occurrence_id) if occurrence_id else None,
            issue_report_id=mp.parse_uuid(issue_report_id) if issue_report_id else None,
            branch_id=mp.parse_uuid(branch_id) if branch_id else None,
        )
        self._db.add(row)
        self._db.flush()
        out = self._to_domain(row)
        assert out is not None
        return out

    def list_for_user(self, user_id: str, *, unread_only: bool = False, limit: int = 30) -> list[UserNotification]:
        q = (
            select(orm.UserNotification)
            .where(orm.UserNotification.user_id == mp.parse_uuid(user_id))
            .order_by(orm.UserNotification.created_at.desc())
            .limit(limit)
        )
        if unread_only:
            q = q.where(orm.UserNotification.read_at.is_(None))
        rows = self._db.execute(q).scalars().all()
        return [n for row in rows if (n := self._to_domain(row))]

    def count_unread(self, user_id: str) -> int:
        q = (
            select(orm.UserNotification)
            .where(orm.UserNotification.user_id == mp.parse_uuid(user_id))
            .where(orm.UserNotification.read_at.is_(None))
        )
        return len(self._db.execute(q).scalars().all())

    def mark_read(self, notification_id: str, user_id: str) -> UserNotification | None:
        row = self._db.get(orm.UserNotification, mp.parse_uuid(notification_id))
        if not row or str(row.user_id) != user_id:
            return None
        if row.read_at is None:
            row.read_at = datetime.now().astimezone()
            self._db.flush()
        return self._to_domain(row)

    def clear_issue_report_links(self, issue_report_id: str) -> int:
        """Détache les notifications avant suppression d'un דיווח (FK sans CASCADE)."""
        result = self._db.execute(
            update(orm.UserNotification)
            .where(orm.UserNotification.issue_report_id == mp.parse_uuid(issue_report_id))
            .values(issue_report_id=None)
        )
        self._db.flush()
        return int(result.rowcount or 0)

    def clear_occurrence_links(self, occurrence_id: str) -> int:
        """Détache les notifications avant suppression d'une occurrence (FK sans CASCADE)."""
        result = self._db.execute(
            update(orm.UserNotification)
            .where(orm.UserNotification.occurrence_id == mp.parse_uuid(occurrence_id))
            .values(occurrence_id=None)
        )
        self._db.flush()
        return int(result.rowcount or 0)

    def mark_all_read(self, user_id: str) -> int:
        q = (
            select(orm.UserNotification)
            .where(orm.UserNotification.user_id == mp.parse_uuid(user_id))
            .where(orm.UserNotification.read_at.is_(None))
        )
        rows = self._db.execute(q).scalars().all()
        now = datetime.now().astimezone()
        for row in rows:
            row.read_at = now
        if rows:
            self._db.flush()
        return len(rows)

    def delete_older_than(self, cutoff: datetime) -> int:
        """Supprime les alertes créées avant `cutoff` (lues et non lues)."""
        result = self._db.execute(
            delete(orm.UserNotification).where(orm.UserNotification.created_at < cutoff)
        )
        self._db.flush()
        return int(result.rowcount or 0)

    @staticmethod
    def _to_domain(row: orm.UserNotification | None) -> UserNotification | None:
        if row is None:
            return None
        return UserNotification(
            id=str(row.id),
            user_id=str(row.user_id),
            kind=row.kind,
            title=row.title,
            message=row.message,
            occurrence_id=str(row.occurrence_id) if row.occurrence_id else None,
            issue_report_id=str(row.issue_report_id) if row.issue_report_id else None,
            branch_id=str(row.branch_id) if row.branch_id else None,
            read_at=mp.parse_datetime_iso(row.read_at) if row.read_at else None,
            created_at=mp.parse_datetime_iso(row.created_at),
        )
