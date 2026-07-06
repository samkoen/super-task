from sqlalchemy import select
from sqlalchemy.orm import Session

import app.db.models as orm
from app.db import mappers as mp
from app.models.branch import Branch


class BranchRepository:
    def __init__(self, db: Session):
        self._db = db

    def find_by_id(self, id_: str) -> Branch | None:
        try:
            uid = mp.parse_uuid(id_)
        except ValueError:
            return None
        return mp.branch_orm_to_domain(self._db.get(orm.Branch, uid))

    def get_network_name(self, network_id: str) -> str | None:
        row = self._db.get(orm.Network, mp.parse_uuid(network_id))
        return row.name if row else None

    def list_branches(
        self,
        *,
        network_id: str | None = None,
        name: str | None = None,
        branch_ids: list[str] | None = None,
    ) -> list[Branch]:
        q = select(orm.Branch).order_by(orm.Branch.name.asc())
        if network_id:
            q = q.where(orm.Branch.network_id == mp.parse_uuid(network_id))
        if name:
            q = q.where(orm.Branch.name.ilike(f"%{name.strip()}%"))
        if branch_ids is not None:
            q = q.where(orm.Branch.id.in_([mp.parse_uuid(i) for i in branch_ids]))
        rows = self._db.execute(q).scalars().all()
        return [s for row in rows if (s := mp.branch_orm_to_domain(row))]

    def create(
        self,
        *,
        network_id: str,
        name: str,
        address: str,
        city: str,
        postal_code: str,
    ) -> Branch:
        import uuid

        row = orm.Branch(
            id=uuid.uuid4(),
            network_id=mp.parse_uuid(network_id),
            name=name.strip(),
            address=address.strip(),
            city=city.strip(),
            postal_code=postal_code.strip(),
            is_active=True,
        )
        self._db.add(row)
        self._db.flush()
        out = mp.branch_orm_to_domain(row)
        assert out is not None
        return out

    def update(
        self,
        id_: str,
        *,
        name: str,
        address: str,
        city: str,
        postal_code: str,
        is_active: bool,
    ) -> Branch | None:
        row = self._db.get(orm.Branch, mp.parse_uuid(id_))
        if not row:
            return None
        row.name = name.strip()
        row.address = address.strip()
        row.city = city.strip()
        row.postal_code = postal_code.strip()
        row.is_active = is_active
        self._db.flush()
        return mp.branch_orm_to_domain(row)
