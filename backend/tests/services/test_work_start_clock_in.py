"""Clôture is_work_start : started_at = 1re photo/vidéo obligatoire."""
import asyncio
from datetime import datetime
from unittest.mock import MagicMock

from app.domain import roles, task_status
from app.models.task_completion import TaskCompletion
from app.models.task_occurrence import TaskOccurrence
from app.services.task_occurrence_service import TaskOccurrenceService
from tests.occurrence_batch_stubs import stub_occurrence_batch_lookups


def _occurrence(**overrides) -> TaskOccurrence:
    base = {
        "id": "occ-1",
        "template_id": None,
        "branch_id": "b1",
        "title": "פתיחה",
        "description": "",
        "due_at": "2026-01-01T09:00:00+02:00",
        "status": task_status.IN_PROGRESS,
        "assignee_user_id": "emp-1",
        "department_id": None,
        "task_kind": "fixed",
        "manager_user_id": "mgr-1",
        "photo_required": True,
        "reference_photo_url": None,
        "reference_video_url": None,
        "reference_audio_url": None,
        "media_purge_after": None,
        "started_at": "2026-01-01T08:00:00+02:00",
        "started_by_id": "emp-1",
        "created_by_id": "mgr-1",
        "created_at": "2026-01-01T00:00:00+02:00",
        "updated_at": "2026-01-01T00:00:00+02:00",
        "is_work_start": True,
        "completion_requirements": [{"kind": "photo"}],
    }
    base.update(overrides)
    return TaskOccurrence(**base)


def _completion() -> TaskCompletion:
    return TaskCompletion(
        id="cmp-1",
        occurrence_id="occ-1",
        status=task_status.COMPLETION_DONE,
        note=None,
        photo_path="/uploads/p.jpg",
        video_path=None,
        audio_path=None,
        not_completed_reason=None,
        completed_by_id="emp-1",
        completed_at="2026-01-01T10:00:00+02:00",
        manager_review_status=task_status.REVIEW_PENDING,
    )


def _service(occurrence_repo, completion_repo):
    stub_occurrence_batch_lookups(occurrence_repo, completion_repo)
    return TaskOccurrenceService(
        occurrence_repo,
        completion_repo,
        MagicMock(),
        MagicMock(),
    )


def _employee():
    actor = MagicMock()
    actor.role = roles.EMPLOYEE
    actor.user_id = "emp-1"
    actor.branch_id = "b1"
    return actor


def _repos(occurrence):
    occurrence_repo = MagicMock()
    occurrence_repo.find_by_id.return_value = occurrence
    occurrence_repo.update_status.return_value = occurrence
    occurrence_repo.get_branch_name.return_value = "Branch"
    occurrence_repo.get_department_name.return_value = None
    occurrence_repo.get_assignee_name.return_value = "Worker"
    occurrence_repo.get_manager_name.return_value = "Manager"
    completion_repo = MagicMock()
    completion_repo.find_by_occurrence.return_value = None
    completion_repo.create.return_value = _completion()
    return occurrence_repo, completion_repo


def test_work_start_complete_stamps_first_visual_capture():
    occurrence_repo, completion_repo = _repos(_occurrence())
    result = asyncio.run(
        _service(occurrence_repo, completion_repo).complete_occurrence(
            _employee(),
            "occ-1",
            completion_status=task_status.COMPLETION_DONE,
            completion_attachments=[
                {
                    "kind": "photo",
                    "url": "/uploads/p.jpg",
                    "captured_at": "2026-01-01T08:12:00+02:00",
                }
            ],
        )
    )
    occurrence_repo.set_started_at.assert_called_once()
    when = occurrence_repo.set_started_at.call_args.kwargs["started_at"]
    assert when == datetime.fromisoformat("2026-01-01T08:12:00+02:00")
    assert result["status"] == task_status.IN_PROGRESS or result.get("completion")


def test_regular_task_does_not_stamp_arrival():
    occurrence_repo, completion_repo = _repos(_occurrence(is_work_start=False))
    asyncio.run(
        _service(occurrence_repo, completion_repo).complete_occurrence(
            _employee(),
            "occ-1",
            completion_status=task_status.COMPLETION_DONE,
            completion_attachments=[{"kind": "photo", "url": "/uploads/p.jpg"}],
        )
    )
    occurrence_repo.set_started_at.assert_not_called()


def test_work_start_resubmit_after_reopen_keeps_first_arrival():
    occurrence_repo, completion_repo = _repos(_occurrence())
    completion_repo.find_by_occurrence.return_value = _completion()
    completion_repo.update_submission.return_value = _completion()
    asyncio.run(
        _service(occurrence_repo, completion_repo).complete_occurrence(
            _employee(),
            "occ-1",
            completion_status=task_status.COMPLETION_DONE,
            completion_attachments=[
                {
                    "kind": "photo",
                    "url": "/uploads/p2.jpg",
                    "captured_at": "2026-01-01T11:40:00+02:00",
                }
            ],
        )
    )
    occurrence_repo.set_started_at.assert_not_called()


def _draft(attachments) -> TaskCompletion:
    """Sous-tâches déjà reçues, tâche pas encore envoyée au menahel."""
    draft = _completion()
    draft.manager_review_status = None
    draft.completion_attachments = attachments
    return draft


def _photo(url: str, at: str) -> dict:
    return {"kind": "photo", "url": url, "captured_at": f"2026-01-01T{at}:00+02:00"}


def _three_photo_slots():
    occurrence = _occurrence(completion_requirements=[{"kind": "photo"}, {"kind": "photo"}, {"kind": "photo"}])
    occurrence_repo, completion_repo = _repos(occurrence)
    completion_repo.update_attachments.side_effect = lambda _id, merged: _draft(merged)
    return occurrence_repo, completion_repo


def _submit(occurrence_repo, completion_repo, index: int, attachment: dict):
    return asyncio.run(
        _service(occurrence_repo, completion_repo).submit_slot(_employee(), "occ-1", index, attachment=attachment)
    )


def _stamped(occurrence_repo) -> datetime:
    return occurrence_repo.set_started_at.call_args.kwargs["started_at"]


def test_arrival_uses_earliest_film_among_all_sent_slots():
    occurrence_repo, completion_repo = _three_photo_slots()
    completion_repo.find_by_occurrence.return_value = _draft([_photo("/uploads/a.jpg", "08:20")])
    _submit(occurrence_repo, completion_repo, 1, _photo("/uploads/b.jpg", "08:05"))
    assert _stamped(occurrence_repo) == datetime.fromisoformat("2026-01-01T08:05:00+02:00")


def test_arrival_waits_for_a_real_film_when_first_slot_is_skipped():
    occurrence_repo, completion_repo = _three_photo_slots()
    skipped = {"kind": "photo", "skipped": {"reason_code": "no_stock"}}
    completion_repo.find_by_occurrence.return_value = _draft([skipped])
    _submit(occurrence_repo, completion_repo, 1, _photo("/uploads/b.jpg", "08:10"))
    assert _stamped(occurrence_repo) == datetime.fromisoformat("2026-01-01T08:10:00+02:00")


def test_arrival_ignores_a_take_replaced_before_sending():
    occurrence_repo, completion_repo = _three_photo_slots()
    completion_repo.find_by_occurrence.return_value = _draft([_photo("/uploads/old.jpg", "08:00")])
    _submit(occurrence_repo, completion_repo, 0, _photo("/uploads/new.jpg", "08:25"))
    assert _stamped(occurrence_repo) == datetime.fromisoformat("2026-01-01T08:25:00+02:00")


def test_arrival_does_not_move_on_a_slot_resent_after_a_refusal():
    occurrence_repo, completion_repo = _three_photo_slots()
    rejected = _draft([_photo("/uploads/a.jpg", "08:00")])
    rejected.manager_review_status = task_status.REVIEW_REJECTED
    completion_repo.find_by_occurrence.return_value = rejected
    _submit(occurrence_repo, completion_repo, 0, _photo("/uploads/again.jpg", "11:00"))
    occurrence_repo.set_started_at.assert_not_called()
