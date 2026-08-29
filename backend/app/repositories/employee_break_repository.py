from datetime import datetime
import uuid

from sqlalchemy import or_, select
from sqlalchemy.orm import Session

import app.db.models as orm
from app.db import mappers as mp
from app.models.employee_break_interval import EmployeeBreakInterval


class EmployeeBreakRepository:
    def __init__(self, db: Session):
        self._db = db

    def open_interval(self, user_id: str, started_at: datetime) -> EmployeeBreakInterval:
        row = orm.EmployeeBreakInterval(
            id=uuid.uuid4(),
            user_id=mp.parse_uuid(user_id),
            started_at=started_at,
            ended_at=None,
        )
        self._db.add(row)
        self._db.flush()
        out = mp.employee_break_orm_to_domain(row)
        assert out is not None
        return out

    def find_open(self, user_id: str) -> EmployeeBreakInterval | None:
        q = (
            select(orm.EmployeeBreakInterval)
            .where(orm.EmployeeBreakInterval.user_id == mp.parse_uuid(user_id))
            .where(orm.EmployeeBreakInterval.ended_at.is_(None))
            .order_by(orm.EmployeeBreakInterval.started_at.desc())
            .limit(1)
        )
        row = self._db.execute(q).scalars().first()
        return mp.employee_break_orm_to_domain(row)

    def close_open(self, user_id: str, ended_at: datetime) -> EmployeeBreakInterval | None:
        q = (
            select(orm.EmployeeBreakInterval)
            .where(orm.EmployeeBreakInterval.user_id == mp.parse_uuid(user_id))
            .where(orm.EmployeeBreakInterval.ended_at.is_(None))
            .order_by(orm.EmployeeBreakInterval.started_at.desc())
            .limit(1)
        )
        row = self._db.execute(q).scalars().first()
        if not row:
            return None
        row.ended_at = ended_at
        self._db.flush()
        return mp.employee_break_orm_to_domain(row)

    def list_overlapping(
        self,
        user_ids: list[str],
        *,
        start: datetime,
        end: datetime,
    ) -> list[EmployeeBreakInterval]:
        if not user_ids:
            return []
        ids = [mp.parse_uuid(uid) for uid in user_ids]
        q = (
            select(orm.EmployeeBreakInterval)
            .where(orm.EmployeeBreakInterval.user_id.in_(ids))
            .where(orm.EmployeeBreakInterval.started_at < end)
            .where(
                or_(
                    orm.EmployeeBreakInterval.ended_at.is_(None),
                    orm.EmployeeBreakInterval.ended_at > start,
                )
            )
            .order_by(orm.EmployeeBreakInterval.started_at.asc())
        )
        rows = self._db.execute(q).scalars().all()
        return [iv for row in rows if (iv := mp.employee_break_orm_to_domain(row))]
