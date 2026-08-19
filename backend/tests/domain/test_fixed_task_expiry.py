"""קבועות non faites : fermeture auto à minuit métier."""
from __future__ import annotations

from datetime import date
from zoneinfo import ZoneInfo

from app.domain import task_status
from app.domain.fixed_task_expiry import (
    SYSTEM_NOT_COMPLETED_REASON,
    counts_in_work_report,
    is_system_auto_closed,
    should_expire_open_fixed,
)
from app.models.task_completion import TaskCompletion
from app.models.task_occurrence import TaskOccurrence

TZ = ZoneInfo("Asia/Jerusalem")
DAY = date(2026, 8, 19)


def _occ(**over) -> TaskOccurrence:
    base = dict(
        id="o1",
        template_id="tpl",
        branch_id="b1",
        title="T",
        description="",
        due_at="2026-08-18T23:59:00+03:00",
        status=task_status.PENDING,
        assignee_user_id="e1",
        department_id=None,
        task_kind="fixed",
        manager_user_id=None,
        photo_required=False,
        reference_photo_url=None,
        reference_video_url=None,
        reference_audio_url=None,
        media_purge_after=None,
        started_at=None,
        started_by_id=None,
        created_by_id="m1",
        created_at="2026-08-18T08:00:00+03:00",
        updated_at="2026-08-18T08:00:00+03:00",
    )
    base.update(over)
    return TaskOccurrence(**base)


def _cmp(**over) -> TaskCompletion:
    base = dict(
        id="c1",
        occurrence_id="o1",
        status=task_status.COMPLETION_NOT_DONE,
        note=None,
        photo_path=None,
        video_path=None,
        audio_path=None,
        not_completed_reason=SYSTEM_NOT_COMPLETED_REASON,
        completed_by_id="e1",
        completed_at="2026-08-19T00:01:00+03:00",
    )
    base.update(over)
    return TaskCompletion(**base)


def test_expire_yesterday_open_fixed():
    assert should_expire_open_fixed(_occ(), day=DAY, tz=TZ) is True


def test_do_not_expire_todays_fixed():
    task = _occ(due_at="2026-08-19T23:59:00+03:00")
    assert should_expire_open_fixed(task, day=DAY, tz=TZ) is False


def test_do_not_expire_ad_hoc():
    assert should_expire_open_fixed(_occ(task_kind="ad_hoc"), day=DAY, tz=TZ) is False


def test_do_not_expire_pending_review():
    task = _occ(status=task_status.PENDING_REVIEW)
    assert should_expire_open_fixed(task, day=DAY, tz=TZ) is False


def test_report_keeps_system_auto_closed_not_manual_cancel():
    cancelled = _occ(status=task_status.CANCELLED)
    assert counts_in_work_report(cancelled, None) is False
    assert counts_in_work_report(cancelled, _cmp()) is True
    assert is_system_auto_closed(_cmp()) is True
    assert is_system_auto_closed(_cmp(status=task_status.COMPLETION_DONE)) is False
