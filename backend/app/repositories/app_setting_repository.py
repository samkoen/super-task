"""Réglages applicatifs (une ligne par clé)."""
from __future__ import annotations

from datetime import datetime
from zoneinfo import ZoneInfo

from sqlalchemy.orm import Session

import app.db.models as orm
from app.domain.media_retention_policy import (
    DEFAULT_RETENTION_DAYS,
    MEDIA_RETENTION_DAYS_KEY,
    parse_retention_days,
)

TZ = ZoneInfo("Asia/Jerusalem")


class AppSettingRepository:
    def __init__(self, db: Session):
        self._db = db

    def media_retention_days(self) -> int:
        raw = self.get_value(MEDIA_RETENTION_DAYS_KEY)
        if raw is None:
            return DEFAULT_RETENTION_DAYS
        try:
            return parse_retention_days(raw)
        except ValueError:
            return DEFAULT_RETENTION_DAYS

    def set_media_retention_days(self, days: int) -> None:
        self.set_value(MEDIA_RETENTION_DAYS_KEY, str(days))

    def get_value(self, key: str) -> str | None:
        row = self._db.get(orm.AppSetting, key)
        return row.value if row else None

    def set_value(self, key: str, value: str) -> None:
        row = self._db.get(orm.AppSetting, key)
        if row is None:
            self._db.add(orm.AppSetting(key=key, value=value, updated_at=datetime.now(TZ)))
        else:
            row.value = value
            row.updated_at = datetime.now(TZ)
        self._db.flush()
