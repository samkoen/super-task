from sqlalchemy import select
from sqlalchemy.orm import Session

import app.db.models as orm
from app.db import mappers as mp
from app.models.product import Product


class ProductRepository:
    def __init__(self, db: Session):
        self._db = db

    def find_by_id(self, id_: str) -> Product | None:
        try:
            return mp.product_orm_to_domain(self._db.get(orm.Product, mp.parse_uuid(id_)))
        except ValueError:
            return None

    def get_department_name(self, department_id: str) -> str | None:
        row = self._db.get(orm.Department, mp.parse_uuid(department_id))
        return row.name if row else None

    def list_products(
        self,
        *,
        department_id: str | None = None,
        name: str | None = None,
        department_ids: list[str] | None = None,
    ) -> list[Product]:
        q = select(orm.Product).order_by(orm.Product.name.asc())
        if department_id:
            q = q.where(orm.Product.department_id == mp.parse_uuid(department_id))
        if department_ids is not None:
            q = q.where(orm.Product.department_id.in_([mp.parse_uuid(i) for i in department_ids]))
        if name:
            q = q.where(orm.Product.name.ilike(f"%{name.strip()}%"))
        rows = self._db.execute(q).scalars().all()
        return [p for row in rows if (p := mp.product_orm_to_domain(row))]

    def create(self, *, department_id: str, name: str, sku: str = "") -> Product:
        import uuid

        row = orm.Product(
            id=uuid.uuid4(),
            department_id=mp.parse_uuid(department_id),
            name=name.strip(),
            sku=sku.strip(),
            is_active=True,
        )
        self._db.add(row)
        self._db.flush()
        out = mp.product_orm_to_domain(row)
        assert out is not None
        return out

    def update(self, id_: str, *, name: str, sku: str, is_active: bool) -> Product | None:
        row = self._db.get(orm.Product, mp.parse_uuid(id_))
        if not row:
            return None
        row.name = name.strip()
        row.sku = sku.strip()
        row.is_active = is_active
        self._db.flush()
        return mp.product_orm_to_domain(row)
