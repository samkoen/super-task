"""Lectures d'הזמנות Agroline. Deux lignes au plus par numéro."""
from __future__ import annotations

import uuid
from datetime import date, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

import app.db.models as orm
from app.db import mappers as mp


class AgrolineOrderRepository:
    def __init__(self, db: Session):
        self._db = db

    def list_on(self, document_date: str) -> list[dict]:
        rows = self._db.scalars(
            select(orm.AgrolineOrder)
            .where(orm.AgrolineOrder.document_date == date.fromisoformat(document_date))
            .order_by(orm.AgrolineOrder.agroline_number)
        ).all()
        return [_order_dict(row) for row in rows]

    def versions(self, number: str) -> list[dict]:
        rows = self._db.scalars(
            select(orm.AgrolineOrder)
            .where(orm.AgrolineOrder.agroline_number == number)
            .order_by(orm.AgrolineOrder.reading_kind)
        ).all()
        return [_order_dict(row) for row in rows]

    def save_reading(self, kind: str, branch_id: str | None, document: dict, read_at: datetime) -> dict:
        row = self._by_slot(document["agroline_number"], kind)
        if row is None:
            row = self._insert(kind, branch_id, document, read_at)
        else:
            _refresh(row, branch_id, document, read_at)
            self._db.flush()
        return _order_dict(row)

    def _by_slot(self, number: str, kind: str) -> orm.AgrolineOrder | None:
        return self._db.scalar(
            select(orm.AgrolineOrder).where(
                orm.AgrolineOrder.agroline_number == number,
                orm.AgrolineOrder.reading_kind == kind,
            )
        )

    def _insert(self, kind: str, branch_id: str | None, document: dict, read_at: datetime) -> orm.AgrolineOrder:
        row = orm.AgrolineOrder(
            id=uuid.uuid4(),
            agroline_number=document["agroline_number"],
            reading_kind=kind,
            branch_id=mp.parse_uuid(branch_id) if branch_id else None,
            customer_name=document["customer_name"],
            document_date=date.fromisoformat(document["document_date"]),
            pdf_url=document.get("pdf_url"),
            pdf_sha256=document.get("pdf_sha256"),
            read_at=read_at,
        )
        self._db.add(row)
        self._db.flush()
        return row


def _refresh(row: orm.AgrolineOrder, branch_id: str | None, document: dict, read_at: datetime) -> None:
    row.customer_name = document["customer_name"]
    row.document_date = date.fromisoformat(document["document_date"])
    row.pdf_url = document.get("pdf_url")
    row.pdf_sha256 = document.get("pdf_sha256")
    row.read_at = read_at
    if branch_id:
        row.branch_id = mp.parse_uuid(branch_id)


def _order_dict(row: orm.AgrolineOrder) -> dict:
    return {
        "id": str(row.id),
        "agroline_number": row.agroline_number,
        "reading_kind": row.reading_kind,
        "branch_id": str(row.branch_id) if row.branch_id else None,
        "customer_name": row.customer_name,
        "document_date": row.document_date.isoformat(),
        "pdf_url": row.pdf_url,
        "pdf_sha256": row.pdf_sha256,
        "read_at": row.read_at.isoformat(),
    }
