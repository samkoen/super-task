"""Fermeture auto des קבועות — enregistrement « לא בוצע » système."""
from __future__ import annotations

from datetime import date
from unittest.mock import MagicMock

from app.domain import task_status
from app.domain.fixed_task_expiry import SYSTEM_NOT_COMPLETED_REASON
from app.models.task_occurrence import TaskOccurrence
from app.services.fixed_task_expiry import close_expired_fixed_occurrences


def _occ(**over) -> TaskOccurrence:
    base = dict(
        id="o1",
        template_id="tpl",
        branch_id="b1",
        title="T",
        description="",
        due_at="2026-08-18T23:59:00+03:00",
        status=task_status.CANCELLED,
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
        updated_at="2026-08-19T00:01:00+03:00",
    )
    base.update(over)
    return TaskOccurrence(**base)


def test_close_expired_records_system_not_completed():
    occ_repo = MagicMock()
    occ_repo.expire_open_fixed_before.return_value = [_occ()]
    comp_repo = MagicMock()
    comp_repo.find_by_occurrence.return_value = None

    count = close_expired_fixed_occurrences(occ_repo, comp_repo, date(2026, 8, 19))

    assert count == 1
    comp_repo.create.assert_called_once()
    kwargs = comp_repo.create.call_args.kwargs
    assert kwargs["status"] == task_status.COMPLETION_NOT_DONE
    assert kwargs["not_completed_reason"] == SYSTEM_NOT_COMPLETED_REASON
    assert kwargs["completed_by_id"] == "e1"


def test_close_expired_updates_existing_completion():
    occ_repo = MagicMock()
    occ_repo.expire_open_fixed_before.return_value = [_occ()]
    existing = MagicMock()
    existing.note = None
    existing.photo_path = None
    existing.video_path = None
    existing.audio_path = None
    existing.completion_attachments = None
    comp_repo = MagicMock()
    comp_repo.find_by_occurrence.return_value = existing

    close_expired_fixed_occurrences(occ_repo, comp_repo, date(2026, 8, 19))

    comp_repo.create.assert_not_called()
    comp_repo.update_submission.assert_called_once()
    kwargs = comp_repo.update_submission.call_args.kwargs
    assert kwargs["status"] == task_status.COMPLETION_NOT_DONE
    assert kwargs["not_completed_reason"] == SYSTEM_NOT_COMPLETED_REASON


def test_close_expired_empty_list_is_noop():
    occ_repo = MagicMock()
    occ_repo.expire_open_fixed_before.return_value = []
    comp_repo = MagicMock()
    assert close_expired_fixed_occurrences(occ_repo, comp_repo, date(2026, 8, 19)) == 0
    comp_repo.create.assert_not_called()
    comp_repo.update_submission.assert_not_called()
