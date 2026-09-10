from sqlalchemy import select
from sqlalchemy.orm import Session

import app.db.models as orm
from app.db import mappers as mp
from app.domain.system_bug import SYSTEM_BUG_STATUS_OPEN, parse_system_bug_status
from app.models.system_bug_report import (
    SystemBugReport,
    comments_from_json,
    comments_to_json,
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
            status=SYSTEM_BUG_STATUS_OPEN,
            comments="[]",
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
        items = [r for row in rows if (r := self._to_domain(row))]
        open_items = [item for item in items if item.status == SYSTEM_BUG_STATUS_OPEN]
        closed_items = [item for item in items if item.status != SYSTEM_BUG_STATUS_OPEN]
        return open_items + closed_items

    def patch(
        self,
        report_id: str,
        *,
        status: str | None = None,
        comments: list | None = None,
    ) -> SystemBugReport | None:
        try:
            row = self._db.get(orm.SystemBugReport, mp.parse_uuid(report_id))
        except ValueError:
            return None
        if row is None:
            return None
        if status is not None:
            row.status = status
        if comments is not None:
            row.comments = comments_to_json(comments)
        self._db.flush()
        return self._to_domain(row)

    def set_status(self, report_id: str, status: str) -> SystemBugReport | None:
        return self.patch(report_id, status=status)

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
            status=parse_system_bug_status(getattr(row, "status", None)),
            comments=comments_from_json(getattr(row, "comments", None)),
            created_at=mp.parse_datetime_iso(row.created_at),
        )
