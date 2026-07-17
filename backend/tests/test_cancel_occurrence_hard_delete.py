"""ביטול tâche = suppression DB + médias storage."""
from __future__ import annotations

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
        "status": task_status.PENDING,
        "assignee_user_id": "emp-1",
        "department_id": None,
        "task_kind": "ad_hoc",
        "manager_user_id": "mgr-1",
        "photo_required": False,
        "reference_photo_url": "https://blob.example/ref.jpg",
        "reference_video_url": None,
        "reference_audio_url": None,
        "media_purge_after": None,
        "started_at": None,
        "started_by_id": None,
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
        "photo_path": "https://blob.example/done.jpg",
        "video_path": None,
        "audio_path": None,
        "audio_transcript": None,
        "audio_transcript_employee": None,
        "not_completed_reason": None,
        "manager_review_status": None,
        "manager_reviewed_by_id": None,
        "manager_reviewed_at": None,
        "rejection_note": None,
        "completed_by_id": "emp-1",
        "completed_at": "2026-01-01T09:30:00+02:00",
    }
    base.update(overrides)
    return TaskCompletion(**base)


def test_cancel_deletes_media_completion_and_occurrence(monkeypatch):
    occurrence = _occurrence(template_id="tpl-1", reference_photo_url="https://blob.example/shared.jpg")
    completion = _completion()
    occurrence_repo = MagicMock()
    occurrence_repo.find_by_id.return_value = occurrence
    occurrence_repo.delete.return_value = True
    occurrence_repo.get_branch_name.return_value = "Branch"
    occurrence_repo.get_department_name.return_value = None
    occurrence_repo.get_assignee_name.return_value = "Worker"
    occurrence_repo.get_manager_name.return_value = "Manager"

    completion_repo = MagicMock()
    completion_repo.find_by_occurrence.return_value = completion
    notification_repo = MagicMock()
    template_repo = MagicMock()
    template_repo.find_by_id.return_value = MagicMock(
        reference_photo_url="https://blob.example/shared.jpg",
        reference_video_url=None,
        reference_audio_url=None,
    )
    svc = TaskOccurrenceService(
        occurrence_repo,
        completion_repo,
        MagicMock(),
        template_repo=template_repo,
        notification_repo=notification_repo,
    )
    actor = MagicMock()
    actor.role = roles.BRANCH_MANAGER
    actor.user_id = "mgr-1"
    actor.branch_id = "b1"

    result = svc.cancel_occurrence(actor, "occ-1")

    assert result["deleted"] is True
    assert result["status"] == task_status.CANCELLED
    assert "https://blob.example/shared.jpg" not in result["_media_to_delete"]
    assert "https://blob.example/done.jpg" in result["_media_to_delete"]
    completion_repo.delete_by_occurrence.assert_called_once_with("occ-1")
    notification_repo.clear_occurrence_links.assert_called_once_with("occ-1")
    occurrence_repo.delete.assert_called_once_with("occ-1")
    occurrence_repo.update_status.assert_not_called()


def test_cancel_terminal_task_rejected():
    occurrence_repo = MagicMock()
    occurrence_repo.find_by_id.return_value = _occurrence(status=task_status.COMPLETED)
    svc = TaskOccurrenceService(occurrence_repo, MagicMock(), MagicMock())
    actor = MagicMock()
    actor.role = roles.BRANCH_MANAGER
    actor.branch_id = "b1"

    with pytest.raises(ValueError, match="נסגרה"):
        svc.cancel_occurrence(actor, "occ-1")
