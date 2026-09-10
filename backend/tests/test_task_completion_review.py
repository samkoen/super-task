"""Workflow validation manager après soumission employé."""
import asyncio
from unittest.mock import MagicMock

import pytest

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
        "title": "T",
        "description": "",
        "due_at": "2026-01-01T09:00:00+02:00",
        "status": task_status.IN_PROGRESS,
        "assignee_user_id": "emp-1",
        "department_id": None,
        "task_kind": "ad_hoc",
        "manager_user_id": "mgr-1",
        "photo_required": False,
        "reference_photo_url": None,
        "reference_video_url": None,
        "reference_audio_url": None,
        "media_purge_after": None,
        "started_at": "2026-01-01T08:00:00+02:00",
        "started_by_id": "emp-1",
        "created_by_id": "mgr-1",
        "created_at": "2026-01-01T00:00:00+02:00",
        "updated_at": "2026-01-01T00:00:00+02:00",
    }
    base.update(overrides)
    return TaskOccurrence(**base)


def _completion(**overrides) -> TaskCompletion:
    base = {
        "id": "cmp-1",
        "occurrence_id": "occ-1",
        "status": task_status.COMPLETION_DONE,
        "note": None,
        "photo_path": "/uploads/p.jpg",
        "video_path": None,
        "audio_path": None,
        "not_completed_reason": None,
        "completed_by_id": "emp-1",
        "completed_at": "2026-01-01T10:00:00+02:00",
        "manager_review_status": task_status.REVIEW_PENDING,
        "manager_reviewed_by_id": None,
        "manager_reviewed_at": None,
        "rejection_note": None,
    }
    base.update(overrides)
    return TaskCompletion(**base)


def _service(occurrence_repo, completion_repo):
    stub_occurrence_batch_lookups(occurrence_repo, completion_repo)
    return TaskOccurrenceService(
        occurrence_repo,
        completion_repo,
        MagicMock(),
        MagicMock(),
    )


def test_employee_complete_sets_pending_review():
    occurrence = _occurrence()
    pending = _occurrence(status=task_status.PENDING_REVIEW)
    completion = _completion()

    occurrence_repo = MagicMock()
    occurrence_repo.find_by_id.return_value = occurrence
    occurrence_repo.update_status.return_value = pending
    occurrence_repo.get_branch_name.return_value = "Branch"
    occurrence_repo.get_department_name.return_value = None
    occurrence_repo.get_assignee_name.return_value = "Worker"
    occurrence_repo.get_manager_name.return_value = "Manager"

    completion_repo = MagicMock()
    completion_repo.find_by_occurrence.return_value = None
    completion_repo.create.return_value = completion

    svc = _service(occurrence_repo, completion_repo)
    actor = MagicMock()
    actor.role = roles.EMPLOYEE
    actor.user_id = "emp-1"
    actor.branch_id = "b1"

    result = asyncio.run(
        svc.complete_occurrence(
            actor,
            "occ-1",
            completion_status=task_status.COMPLETION_DONE,
            photo_path="/uploads/p.jpg",
        )
    )

    occurrence_repo.update_status.assert_called_once_with("occ-1", task_status.PENDING_REVIEW)
    completion_repo.create.assert_called_once()
    assert result["status"] == task_status.PENDING_REVIEW
    assert result["completion"]["manager_review_status"] == task_status.REVIEW_PENDING


def test_employee_complete_rejects_audio_only():
    occurrence = _occurrence()
    occurrence_repo = MagicMock()
    occurrence_repo.find_by_id.return_value = occurrence
    svc = _service(occurrence_repo, MagicMock())
    actor = MagicMock()
    actor.role = roles.EMPLOYEE
    actor.user_id = "emp-1"
    actor.branch_id = "b1"

    with pytest.raises(ValueError, match="תמונה או וידאו"):
        asyncio.run(
            svc.complete_occurrence(
                actor,
                "occ-1",
                completion_status=task_status.COMPLETION_DONE,
                audio_path="/uploads/a.webm",
            )
        )


def test_employee_can_finish_old_task_without_forced_photo():
    occurrence = _occurrence(completion_requirements=[{"kind": "photo"}], photo_required=False)
    pending = _occurrence(status=task_status.PENDING_REVIEW)
    completion = _completion(photo_path=None)

    occurrence_repo = MagicMock()
    occurrence_repo.find_by_id.return_value = occurrence
    occurrence_repo.update_status.return_value = pending
    occurrence_repo.get_branch_name.return_value = "Branch"
    occurrence_repo.get_department_name.return_value = None
    occurrence_repo.get_assignee_name.return_value = "Worker"
    occurrence_repo.get_manager_name.return_value = "Manager"

    completion_repo = MagicMock()
    completion_repo.find_by_occurrence.return_value = None
    completion_repo.create.return_value = completion

    svc = _service(occurrence_repo, completion_repo)
    actor = MagicMock()
    actor.role = roles.EMPLOYEE
    actor.user_id = "emp-1"
    actor.branch_id = "b1"

    result = asyncio.run(
        svc.complete_occurrence(actor, "occ-1", completion_status=task_status.COMPLETION_DONE)
    )
    completion_repo.create.assert_called_once()
    assert result["status"] == task_status.PENDING_REVIEW


def test_manager_complete_skips_review():
    occurrence = _occurrence()
    completed = _occurrence(status=task_status.COMPLETED)
    completion = _completion(manager_review_status=None)

    occurrence_repo = MagicMock()
    occurrence_repo.find_by_id.return_value = occurrence
    occurrence_repo.update_status.return_value = completed
    occurrence_repo.get_branch_name.return_value = "Branch"
    occurrence_repo.get_department_name.return_value = None
    occurrence_repo.get_assignee_name.return_value = "Worker"
    occurrence_repo.get_manager_name.return_value = "Manager"

    completion_repo = MagicMock()
    completion_repo.find_by_occurrence.return_value = None
    completion_repo.create.return_value = completion

    svc = _service(occurrence_repo, completion_repo)
    actor = MagicMock()
    actor.role = roles.BRANCH_MANAGER
    actor.user_id = "mgr-1"
    actor.branch_id = "b1"

    result = asyncio.run(
        svc.complete_occurrence(actor, "occ-1", completion_status=task_status.COMPLETION_DONE)
    )

    occurrence_repo.update_status.assert_called_once_with("occ-1", task_status.COMPLETED)
    assert result["status"] == task_status.COMPLETED


def test_branch_manager_complete_own_task_sets_pending_review():
    occurrence = _occurrence(assignee_user_id="mgr-1")
    pending = _occurrence(status=task_status.PENDING_REVIEW, assignee_user_id="mgr-1")
    completion = _completion()

    occurrence_repo = MagicMock()
    occurrence_repo.find_by_id.return_value = occurrence
    occurrence_repo.update_status.return_value = pending
    occurrence_repo.get_branch_name.return_value = "Branch"
    occurrence_repo.get_department_name.return_value = None
    occurrence_repo.get_assignee_name.return_value = "Manager"
    occurrence_repo.get_manager_name.return_value = "Network"

    completion_repo = MagicMock()
    completion_repo.find_by_occurrence.return_value = None
    completion_repo.create.return_value = completion

    svc = _service(occurrence_repo, completion_repo)
    actor = MagicMock()
    actor.role = roles.BRANCH_MANAGER
    actor.user_id = "mgr-1"
    actor.branch_id = "b1"

    result = asyncio.run(
        svc.complete_occurrence(
            actor,
            "occ-1",
            completion_status=task_status.COMPLETION_DONE,
            photo_path="/uploads/p.jpg",
        )
    )

    occurrence_repo.update_status.assert_called_once_with("occ-1", task_status.PENDING_REVIEW)
    assert result["status"] == task_status.PENDING_REVIEW



def test_approve_occurrence_closes_task():
    occurrence = _occurrence(status=task_status.PENDING_REVIEW)
    completed = _occurrence(status=task_status.COMPLETED)
    completion = _completion()
    approved = _completion(manager_review_status=task_status.REVIEW_APPROVED)

    occurrence_repo = MagicMock()
    occurrence_repo.find_by_id.return_value = occurrence
    occurrence_repo.update_status.return_value = completed
    occurrence_repo.get_branch_name.return_value = "Branch"
    occurrence_repo.get_department_name.return_value = None
    occurrence_repo.get_assignee_name.return_value = "Worker"
    occurrence_repo.get_manager_name.return_value = "Manager"

    completion_repo = MagicMock()
    completion_repo.find_by_occurrence.return_value = completion
    completion_repo.update_review.return_value = approved

    svc = _service(occurrence_repo, completion_repo)
    actor = MagicMock()
    actor.role = roles.BRANCH_MANAGER
    actor.user_id = "mgr-1"
    actor.branch_id = "b1"

    result = svc.approve_occurrence(actor, "occ-1", quality_rating=4)

    occurrence_repo.update_status.assert_called_once_with("occ-1", task_status.COMPLETED)
    occurrence_repo.set_media_purge_after.assert_called_once()
    assert result["status"] == task_status.COMPLETED
    assert result["completion"]["manager_review_status"] == task_status.REVIEW_APPROVED
    assert completion_repo.update_review.call_args.kwargs["quality_rating"] == 4


def test_approve_occurrence_requires_rating():
    occurrence = _occurrence(status=task_status.PENDING_REVIEW)
    occurrence_repo = MagicMock()
    occurrence_repo.find_by_id.return_value = occurrence
    completion_repo = MagicMock()
    completion_repo.find_by_occurrence.return_value = _completion()
    svc = _service(occurrence_repo, completion_repo)
    actor = MagicMock()
    actor.role = roles.BRANCH_MANAGER
    actor.user_id = "mgr-1"
    actor.branch_id = "b1"
    with pytest.raises(ValueError, match="1 ל-5"):
        svc.approve_occurrence(actor, "occ-1")
    occurrence_repo.update_status.assert_not_called()


def test_branch_manager_cannot_approve_own_submission():
    occurrence = _occurrence(status=task_status.PENDING_REVIEW, assignee_user_id="mgr-1")
    occurrence_repo = MagicMock()
    occurrence_repo.find_by_id.return_value = occurrence
    svc = _service(occurrence_repo, MagicMock())
    actor = MagicMock()
    actor.role = roles.BRANCH_MANAGER
    actor.user_id = "mgr-1"
    actor.branch_id = "b1"
    with pytest.raises(PermissionError, match="עצמך"):
        svc.approve_occurrence(actor, "occ-1")
    occurrence_repo.update_status.assert_not_called()


def test_reopen_occurrence_returns_to_employee():
    occurrence = _occurrence(status=task_status.PENDING_REVIEW)
    reopened = _occurrence(status=task_status.IN_PROGRESS)
    completion = _completion()
    rejected = _completion(
        manager_review_status=task_status.REVIEW_REJECTED,
        rejection_note="תקן את התמונה",
    )

    occurrence_repo = MagicMock()
    occurrence_repo.find_by_id.return_value = occurrence
    occurrence_repo.reopen_after_review.return_value = reopened
    occurrence_repo.get_branch_name.return_value = "Branch"
    occurrence_repo.get_department_name.return_value = None
    occurrence_repo.get_assignee_name.return_value = "Worker"
    occurrence_repo.get_manager_name.return_value = "Manager"

    completion_repo = MagicMock()
    completion_repo.find_by_occurrence.return_value = completion
    completion_repo.update_review.return_value = rejected

    svc = _service(occurrence_repo, completion_repo)
    actor = MagicMock()
    actor.role = roles.BRANCH_MANAGER
    actor.user_id = "mgr-1"
    actor.branch_id = "b1"

    result = svc.reopen_occurrence(actor, "occ-1", rejection_note="תקן את התמונה")

    occurrence_repo.reopen_after_review.assert_called_once_with("occ-1")
    assert result["status"] == task_status.IN_PROGRESS
    assert result["completion"]["rejection_note"] == "תקן את התמונה"


def test_employee_cannot_complete_while_pending_review():
    occurrence = _occurrence(status=task_status.PENDING_REVIEW)
    occurrence_repo = MagicMock()
    occurrence_repo.find_by_id.return_value = occurrence

    svc = _service(occurrence_repo, MagicMock())
    actor = MagicMock()
    actor.role = roles.EMPLOYEE
    actor.user_id = "emp-1"
    actor.branch_id = "b1"

    with pytest.raises(ValueError, match="ממתינה לאישור"):
        asyncio.run(
            svc.complete_occurrence(actor, "occ-1", completion_status=task_status.COMPLETION_DONE)
        )


def test_employee_complete_requires_min_video_duration():
    occurrence = _occurrence(min_video_seconds=8)
    occurrence_repo = MagicMock()
    occurrence_repo.find_by_id.return_value = occurrence
    svc = _service(occurrence_repo, MagicMock())
    actor = MagicMock()
    actor.role = roles.EMPLOYEE
    actor.user_id = "emp-1"
    actor.branch_id = "b1"

    with pytest.raises(ValueError, match="8"):
        asyncio.run(
            svc.complete_occurrence(
                actor,
                "occ-1",
                completion_status=task_status.COMPLETION_DONE,
                photo_path="/uploads/p.jpg",
                video_path="/uploads/v.mp4",
                video_duration_seconds=3,
            )
        )


def test_employee_not_completed_goes_to_review_without_photo():
    occurrence = _occurrence(completion_requirements=[{"kind": "photo"}], photo_required=True)
    pending = _occurrence(status=task_status.PENDING_REVIEW)
    completion = _completion(
        status=task_status.COMPLETION_NOT_DONE,
        photo_path=None,
        not_completed_reason="אין מה לצלם",
    )

    occurrence_repo = MagicMock()
    occurrence_repo.find_by_id.return_value = occurrence
    occurrence_repo.update_status.return_value = pending
    occurrence_repo.get_branch_name.return_value = "Branch"
    occurrence_repo.get_department_name.return_value = None
    occurrence_repo.get_assignee_name.return_value = "Worker"
    occurrence_repo.get_manager_name.return_value = "Manager"

    completion_repo = MagicMock()
    completion_repo.find_by_occurrence.return_value = None
    completion_repo.create.return_value = completion

    svc = _service(occurrence_repo, completion_repo)
    actor = MagicMock()
    actor.role = roles.EMPLOYEE
    actor.user_id = "emp-1"
    actor.branch_id = "b1"

    result = asyncio.run(
        svc.complete_occurrence(
            actor,
            "occ-1",
            completion_status=task_status.COMPLETION_NOT_DONE,
            not_completed_reason="אין מה לצלם",
        )
    )

    occurrence_repo.update_status.assert_called_once_with("occ-1", task_status.PENDING_REVIEW)
    created = completion_repo.create.call_args.kwargs
    assert created["status"] == task_status.COMPLETION_NOT_DONE
    assert created["not_completed_reason"] == "אין מה לצלם"
    assert result["status"] == task_status.PENDING_REVIEW


def test_employee_not_completed_requires_reason():
    occurrence = _occurrence()
    occurrence_repo = MagicMock()
    occurrence_repo.find_by_id.return_value = occurrence
    svc = _service(occurrence_repo, MagicMock())
    actor = MagicMock()
    actor.role = roles.EMPLOYEE
    actor.user_id = "emp-1"
    actor.branch_id = "b1"

    with pytest.raises(ValueError, match="יש להסביר"):
        asyncio.run(
            svc.complete_occurrence(
                actor,
                "occ-1",
                completion_status=task_status.COMPLETION_NOT_DONE,
            )
        )


def test_employee_complete_requires_each_listed_video():
    occurrence = _occurrence(
        completion_requirements=[
            {"kind": "video", "min_seconds": 8},
            {"kind": "video", "min_seconds": 5},
        ]
    )
    occurrence_repo = MagicMock()
    occurrence_repo.find_by_id.return_value = occurrence
    svc = _service(occurrence_repo, MagicMock())
    actor = MagicMock()
    actor.role = roles.EMPLOYEE
    actor.user_id = "emp-1"
    actor.branch_id = "b1"

    with pytest.raises(ValueError, match="וידאו"):
        asyncio.run(
            svc.complete_occurrence(
                actor,
                "occ-1",
                completion_status=task_status.COMPLETION_DONE,
                completion_attachments=[
                    {"kind": "video", "url": "/uploads/v1.mp4", "duration_seconds": 9},
                ],
            )
        )


def test_employee_complete_persists_three_videos():
    occurrence = _occurrence(
        completion_requirements=[
            {"kind": "video", "min_seconds": 8},
            {"kind": "video", "min_seconds": 8},
            {"kind": "video", "min_seconds": 8},
        ]
    )
    pending = _occurrence(status=task_status.PENDING_REVIEW)
    occurrence_repo = MagicMock()
    occurrence_repo.find_by_id.return_value = occurrence
    occurrence_repo.update_status.return_value = pending
    completion_repo = MagicMock()
    completion_repo.find_by_occurrence.return_value = None
    completion_repo.create.return_value = _completion()
    svc = _service(occurrence_repo, completion_repo)
    actor = MagicMock()
    actor.role = roles.EMPLOYEE
    actor.user_id = "emp-1"
    actor.branch_id = "b1"
    videos = [
        {"kind": "video", "url": f"/uploads/v{i}.mp4", "duration_seconds": 10}
        for i in (1, 2, 3)
    ]
    asyncio.run(
        svc.complete_occurrence(
            actor,
            "occ-1",
            completion_status=task_status.COMPLETION_DONE,
            completion_attachments=videos,
        )
    )
    saved = completion_repo.create.call_args.kwargs["completion_attachments"]
    assert [item["url"] for item in saved] == ["/uploads/v1.mp4", "/uploads/v2.mp4", "/uploads/v3.mp4"]


def test_employee_complete_blocked_while_blob_videos_not_ready(monkeypatch):
    occurrence = _occurrence(
        completion_requirements=[
            {"kind": "video", "min_seconds": 8},
            {"kind": "video", "min_seconds": 8},
            {"kind": "video", "min_seconds": 8},
        ]
    )
    occurrence_repo = MagicMock()
    occurrence_repo.find_by_id.return_value = occurrence
    completion_repo = MagicMock()
    completion_repo.find_by_occurrence.return_value = None
    svc = _service(occurrence_repo, completion_repo)
    actor = MagicMock()
    actor.role = roles.EMPLOYEE
    actor.user_id = "emp-1"
    actor.branch_id = "b1"
    monkeypatch.setattr("app.services.blob_storage.media_is_ready", lambda _url: False)
    videos = [
        {
            "kind": "video",
            "url": f"https://x.private.blob.vercel-storage.com/v{i}.mp4",
            "duration_seconds": 10,
        }
        for i in (1, 2, 3)
    ]
    with pytest.raises(ValueError, match="נטענים"):
        asyncio.run(
            svc.complete_occurrence(
                actor,
                "occ-1",
                completion_status=task_status.COMPLETION_DONE,
                completion_attachments=videos,
            )
        )
    completion_repo.create.assert_not_called()


def _closed_reopen_setup(*, reviewer_id="mgr-1", actor_id="mgr-2", role=roles.BRANCH_MANAGER):
    occurrence = _occurrence(status=task_status.COMPLETED)
    reopened = _occurrence(status=task_status.IN_PROGRESS)
    approved = _completion(
        manager_review_status=task_status.REVIEW_APPROVED,
        manager_reviewed_by_id=reviewer_id,
        photo_path="/uploads/p.jpg",
    )
    cleared = _completion(manager_review_status=None, photo_path="/uploads/p.jpg")
    occurrence_repo = MagicMock()
    occurrence_repo.find_by_id.return_value = occurrence
    occurrence_repo.reopen_after_review.return_value = reopened
    occurrence_repo.get_branch_name.return_value = "Branch"
    occurrence_repo.get_department_name.return_value = None
    occurrence_repo.get_assignee_name.return_value = "Worker"
    occurrence_repo.get_manager_name.return_value = "Manager"
    completion_repo = MagicMock()
    completion_repo.find_by_occurrence.return_value = approved
    completion_repo.clear_approved_review.return_value = cleared
    actor = MagicMock()
    actor.role = role
    actor.user_id = actor_id
    actor.branch_id = "b1"
    actor.network_id = "n1"
    return occurrence_repo, completion_repo, actor


def test_any_branch_manager_can_reopen_closed_approved_task():
    occurrence_repo, completion_repo, actor = _closed_reopen_setup()
    result = _service(occurrence_repo, completion_repo).reopen_closed_occurrence(actor, "occ-1")
    occurrence_repo.reopen_after_review.assert_called_once_with("occ-1")
    completion_repo.clear_approved_review.assert_called_once_with("occ-1")
    occurrence_repo.set_media_purge_after.assert_called_once_with("occ-1", None)
    assert result["status"] == task_status.IN_PROGRESS
    assert result["id"] == "occ-1"
    assert result["completion"]["manager_review_status"] is None
    assert result["completion"]["photo_path"] == "/uploads/p.jpg"


def test_network_manager_can_reopen_closed_approved_task():
    from types import SimpleNamespace

    occurrence_repo, completion_repo, actor = _closed_reopen_setup(
        role=roles.NETWORK_MANAGER, actor_id="net-1"
    )
    actor.branch_id = None
    branch_repo = MagicMock()
    branch_repo.list_branches.return_value = [SimpleNamespace(id="b1")]
    stub_occurrence_batch_lookups(occurrence_repo, completion_repo)
    svc = TaskOccurrenceService(occurrence_repo, completion_repo, branch_repo, MagicMock())
    result = svc.reopen_closed_occurrence(actor, "occ-1")
    assert result["status"] == task_status.IN_PROGRESS


def test_employee_cannot_reopen_closed_task():
    occurrence_repo, completion_repo, actor = _closed_reopen_setup(
        role=roles.EMPLOYEE, actor_id="emp-1"
    )
    with pytest.raises(PermissionError, match="לפתוח מחדש"):
        _service(occurrence_repo, completion_repo).reopen_closed_occurrence(actor, "occ-1")
    occurrence_repo.reopen_after_review.assert_not_called()


def test_cannot_reopen_closed_when_already_open():
    occurrence_repo, completion_repo, actor = _closed_reopen_setup()
    occurrence_repo.find_by_id.return_value = _occurrence(status=task_status.IN_PROGRESS)
    completion_repo.find_by_occurrence.return_value = _completion(
        manager_review_status=None
    )
    with pytest.raises(ValueError, match="כבר פתוחה"):
        _service(occurrence_repo, completion_repo).reopen_closed_occurrence(actor, "occ-1")
    occurrence_repo.reopen_after_review.assert_not_called()


def test_cannot_reopen_closed_without_completion():
    occurrence_repo, completion_repo, actor = _closed_reopen_setup()
    completion_repo.find_by_occurrence.return_value = None
    with pytest.raises(ValueError, match="הגשת סיום"):
        _service(occurrence_repo, completion_repo).reopen_closed_occurrence(actor, "occ-1")
    occurrence_repo.reopen_after_review.assert_not_called()
