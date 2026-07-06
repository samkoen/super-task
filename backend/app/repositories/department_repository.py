from sqlalchemy import select
from sqlalchemy.orm import Session

import app.db.models as orm
from app.db import mappers as mp
from app.models.department import Department


class DepartmentRepository:
    def __init__(self, db: Session):
        self._db = db

    def find_by_id(self, id_: str) -> Department | None:
        try:
            return mp.department_orm_to_domain(self._db.get(orm.Department, mp.parse_uuid(id_)))
        except ValueError:
            return None

    def get_branch_name(self, branch_id: str) -> str | None:
        row = self._db.get(orm.Branch, mp.parse_uuid(branch_id))
        return row.name if row else None

    def list_departments(
        self,
        *,
        branch_id: str | None = None,
        name: str | None = None,
        branch_ids: list[str] | None = None,
    ) -> list[Department]:
        q = select(orm.Department).order_by(orm.Department.sort_order, orm.Department.name)
        if branch_id:
            q = q.where(orm.Department.branch_id == mp.parse_uuid(branch_id))
        if branch_ids is not None:
            q = q.where(orm.Department.branch_id.in_([mp.parse_uuid(i) for i in branch_ids]))
        if name:
            q = q.where(orm.Department.name.ilike(f"%{name.strip()}%"))
        rows = self._db.execute(q).scalars().all()
        return [m for row in rows if (m := mp.department_orm_to_domain(row))]

    def create(self, *, branch_id: str, name: str, sort_order: int = 0) -> Department:
        import uuid

        row = orm.Department(
            id=uuid.uuid4(),
            branch_id=mp.parse_uuid(branch_id),
            name=name.strip(),
            sort_order=sort_order,
            is_active=True,
        )
        self._db.add(row)
        self._db.flush()
        out = mp.department_orm_to_domain(row)
        assert out is not None
        return out

    def update(
        self, id_: str, *, name: str, sort_order: int, is_active: bool
    ) -> Department | None:
        row = self._db.get(orm.Department, mp.parse_uuid(id_))
        if not row:
            return None
        row.name = name.strip()
        row.sort_order = sort_order
        row.is_active = is_active
        self._db.flush()
        return mp.department_orm_to_domain(row)
