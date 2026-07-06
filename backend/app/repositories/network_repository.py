from sqlalchemy import func, select
from sqlalchemy.orm import Session

import app.db.models as orm
from app.db import mappers as mp
from app.models.network import Network


class NetworkRepository:
    def __init__(self, db: Session):
        self._db = db

    def find_by_id(self, id_: str) -> Network | None:
        try:
            uid = mp.parse_uuid(id_)
        except ValueError:
            return None
        return mp.network_orm_to_domain(self._db.get(orm.Network, uid))

    def list_all(self, *, name: str | None = None, network_ids: list[str] | None = None) -> list[Network]:
        q = select(orm.Network).order_by(orm.Network.name.asc())
        if name:
            q = q.where(orm.Network.name.ilike(f"%{name.strip()}%"))
        if network_ids is not None:
            uuids = [mp.parse_uuid(i) for i in network_ids]
            q = q.where(orm.Network.id.in_(uuids))
        rows = self._db.execute(q).scalars().all()
        return [r for row in rows if (r := mp.network_orm_to_domain(row))]

    def create(self, *, name: str) -> Network:
        import uuid

        row = orm.Network(id=uuid.uuid4(), name=name.strip(), is_active=True)
        self._db.add(row)
        self._db.flush()
        out = mp.network_orm_to_domain(row)
        assert out is not None
        return out

    def update(self, id_: str, *, name: str, is_active: bool) -> Network | None:
        row = self._db.get(orm.Network, mp.parse_uuid(id_))
        if not row:
            return None
        row.name = name.strip()
        row.is_active = is_active
        self._db.flush()
        return mp.network_orm_to_domain(row)

    def count_branches(self, network_id: str) -> int:
        return int(
            self._db.execute(
                select(func.count()).select_from(orm.Branch).where(
                    orm.Branch.network_id == mp.parse_uuid(network_id)
                )
            ).scalar_one()
        )
