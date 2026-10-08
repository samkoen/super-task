"""Un compte Agroline pour tout le réseau."""
from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

import app.db.models as orm


class AgrolineAccountRepository:
    def __init__(self, db: Session):
        self._db = db

    def get(self) -> dict | None:
        row = self._db.scalar(select(orm.AgrolineAccount).limit(1))
        if row is None:
            return None
        return _account_dict(row)

    def save(self, username: str, password_encrypted: str, is_internal: bool, enabled: bool) -> dict:
        row = self._db.scalar(select(orm.AgrolineAccount).limit(1))
        if row is None:
            row = orm.AgrolineAccount(
                id=uuid.uuid4(),
                username=username,
                password_encrypted=password_encrypted,
                is_internal=is_internal,
                enabled=enabled,
            )
            self._db.add(row)
        else:
            row.username = username
            row.password_encrypted = password_encrypted
            row.is_internal = is_internal
            row.enabled = enabled
        self._db.flush()
        return _account_dict(row)

    def set_enabled(self, enabled: bool) -> dict | None:
        row = self._db.scalar(select(orm.AgrolineAccount).limit(1))
        if row is None:
            return None
        row.enabled = enabled
        self._db.flush()
        return _account_dict(row)


def _account_dict(row: orm.AgrolineAccount) -> dict:
    return {
        "username": row.username,
        "password_encrypted": row.password_encrypted,
        "is_internal": bool(row.is_internal),
        "enabled": bool(row.enabled),
    }
