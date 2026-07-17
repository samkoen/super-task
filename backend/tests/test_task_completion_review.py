"""Workflow validation manager après soumission employé."""
import asyncio
from unittest.mock import MagicMock

import pytest

from app.domain import roles, task_status
from app.models.task_completion import TaskCompletion
from app.models.task_occurrence import TaskOccurrence
from app.services.task_occurrence_service import TaskOccurrenceService


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

    result = svc.approve_occurrence(actor, "occ-1")

    occurrence_repo.update_status.assert_called_once_with("occ-1", task_status.COMPLETED)
    occurrence_repo.set_media_purge_after.assert_called_once()
    assert result["status"] == task_status.COMPLETED
    assert result["completion"]["manager_review_status"] == task_status.REVIEW_APPROVED


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
