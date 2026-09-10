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
