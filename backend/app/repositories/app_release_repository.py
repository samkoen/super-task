from sqlalchemy import select
from sqlalchemy.orm import Session

import app.db.models as orm
from app.db import mappers as mp
from app.models.app_release import AppRelease


class AppReleaseRepository:
    def __init__(self, db: Session):
        self._db = db

    def find_latest(self) -> AppRelease | None:
        row = self._db.execute(
            select(orm.AppRelease).order_by(orm.AppRelease.version_code.desc()).limit(1)
        ).scalar_one_or_none()
        return mp.app_release_orm_to_domain(row)

    def list_recent(self, limit: int = 20) -> list[AppRelease]:
        rows = self._db.execute(
            select(orm.AppRelease).order_by(orm.AppRelease.version_code.desc()).limit(limit)
        ).scalars().all()
        return [item for row in rows if (item := mp.app_release_orm_to_domain(row))]

    def create(
        self,
        *,
        version_code: int,
        version_name: str,
        apk_url: str,
        published_by_user_id: str | None,
    ) -> AppRelease:
        import uuid

        row = orm.AppRelease(
            id=uuid.uuid4(),
            version_code=version_code,
            version_name=version_name,
            apk_url=apk_url,
            published_by_user_id=mp.parse_uuid(published_by_user_id)
            if published_by_user_id
            else None,
        )
        self._db.add(row)
        self._db.flush()
        out = mp.app_release_orm_to_domain(row)
        assert out is not None
        return out
