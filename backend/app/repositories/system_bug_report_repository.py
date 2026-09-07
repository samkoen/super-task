from sqlalchemy import select
from sqlalchemy.orm import Session

import app.db.models as orm
from app.db import mappers as mp
from app.models.system_bug_report import (
    SystemBugReport,
    trail_from_json,
    trail_to_json,
)


class SystemBugReportRepository:
    def __init__(self, db: Session):
        self._db = db

    def create(
        self,
        *,
        reporter_user_id: str | None,
        reporter_name: str,
        reporter_role: str,
        branch_name: str,
        network_name: str,
        note: str,
        route: str,
        trail: list[str],
        app_version: str,
        screenshot_url: str | None,
        audio_url: str | None,
        github_issue_url: str | None,
    ) -> SystemBugReport:
        import uuid

        row = orm.SystemBugReport(
            id=uuid.uuid4(),
            reporter_user_id=mp.parse_uuid(reporter_user_id) if reporter_user_id else None,
            reporter_name=reporter_name,
            reporter_role=reporter_role,
            branch_name=branch_name,
            network_name=network_name,
            note=note,
            route=route,
            trail=trail_to_json(trail),
            app_version=app_version,
            screenshot_url=screenshot_url,
            audio_url=audio_url,
            github_issue_url=github_issue_url,
        )
        self._db.add(row)
        self._db.flush()
        out = self._to_domain(row)
        assert out is not None
        return out

    def find_by_id(self, report_id: str) -> SystemBugReport | None:
        try:
            row = self._db.get(orm.SystemBugReport, mp.parse_uuid(report_id))
        except ValueError:
            return None
        return self._to_domain(row)

    def list_recent(self) -> list[SystemBugReport]:
        q = select(orm.SystemBugReport).order_by(orm.SystemBugReport.created_at.desc())
        rows = self._db.execute(q).scalars().all()
        return [r for row in rows if (r := self._to_domain(row))]

    def delete(self, report_id: str) -> bool:
        try:
            row = self._db.get(orm.SystemBugReport, mp.parse_uuid(report_id))
        except ValueError:
            return False
        if row is None:
            return False
        self._db.delete(row)
        self._db.flush()
        return True

    @staticmethod
    def _to_domain(row: orm.SystemBugReport | None) -> SystemBugReport | None:
        if row is None:
            return None
        reporter_id = str(row.reporter_user_id) if row.reporter_user_id else None
        return SystemBugReport(
            id=str(row.id),
            reporter_user_id=reporter_id,
            reporter_name=row.reporter_name or "",
            reporter_role=row.reporter_role or "",
            branch_name=row.branch_name or "",
            network_name=row.network_name or "",
            note=row.note or "",
            route=row.route or "",
            trail=trail_from_json(row.trail),
            app_version=row.app_version or "",
            screenshot_url=row.screenshot_url,
            audio_url=row.audio_url,
            github_issue_url=row.github_issue_url,
            created_at=mp.parse_datetime_iso(row.created_at),
        )
