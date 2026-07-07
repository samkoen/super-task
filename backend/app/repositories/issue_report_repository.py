from sqlalchemy import select
from sqlalchemy.orm import Session

import app.db.models as orm
from app.db import mappers as mp
from app.models.issue_report import IssueReport


class IssueReportRepository:
    def __init__(self, db: Session):
        self._db = db

    def create(
        self,
        *,
        reporter_user_id: str,
        branch_id: str,
        text: str | None = None,
        photo_url: str | None = None,
        video_url: str | None = None,
        audio_url: str | None = None,
    ) -> IssueReport:
        import uuid

        row = orm.IssueReport(
            id=uuid.uuid4(),
            reporter_user_id=mp.parse_uuid(reporter_user_id),
            branch_id=mp.parse_uuid(branch_id),
            text=text,
            photo_url=photo_url,
            video_url=video_url,
            audio_url=audio_url,
        )
        self._db.add(row)
        self._db.flush()
        out = self._to_domain(row)
        assert out is not None
        return out

    def find_by_id(self, report_id: str) -> IssueReport | None:
        try:
            row = self._db.get(orm.IssueReport, mp.parse_uuid(report_id))
        except ValueError:
            return None
        return self._to_domain(row)

    def list_reports(self, *, branch_ids: list[str] | None = None) -> list[IssueReport]:
        q = select(orm.IssueReport).order_by(orm.IssueReport.created_at.desc())
        if branch_ids is not None:
            q = q.where(
                orm.IssueReport.branch_id.in_([mp.parse_uuid(i) for i in branch_ids])
            )
        rows = self._db.execute(q).scalars().all()
        return [r for row in rows if (r := self._to_domain(row))]

    @staticmethod
    def _to_domain(row: orm.IssueReport | None) -> IssueReport | None:
        if row is None:
            return None
        return IssueReport(
            id=str(row.id),
            reporter_user_id=str(row.reporter_user_id),
            branch_id=str(row.branch_id),
            text=row.text,
            photo_url=row.photo_url,
            video_url=row.video_url,
            audio_url=row.audio_url,
            created_at=mp.parse_datetime_iso(row.created_at),
        )
