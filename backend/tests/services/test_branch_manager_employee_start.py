"""Démarrer une tâche assignée : oved et menahel dual-hat."""
from unittest.mock import MagicMock

import pytest

from app.domain import roles, task_status
from app.domain.scope import ActorContext
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
        "status": task_status.PENDING,
        "assignee_user_id": "m1",
        "department_id": None,
        "task_kind": "ad_hoc",
        "manager_user_id": "nm",
        "photo_required": False,
        "reference_photo_url": None,
        "reference_video_url": None,
        "reference_audio_url": None,
        "media_purge_after": None,
        "started_at": None,
        "started_by_id": None,
        "created_by_id": "nm",
        "created_at": "2026-01-01T00:00:00+02:00",
        "updated_at": "2026-01-01T00:00:00+02:00",
    }
    base.update(overrides)
    return TaskOccurrence(**base)


def _svc(occurrence_repo) -> TaskOccurrenceService:
    stub_occurrence_batch_lookups(occurrence_repo, MagicMock())
    return TaskOccurrenceService(occurrence_repo, MagicMock(), MagicMock(), MagicMock())


def test_branch_manager_can_start_own_assigned_task():
    started = _occurrence(status=task_status.IN_PROGRESS, started_by_id="m1")
    occurrence_repo = MagicMock()
    occurrence_repo.find_by_id.return_value = _occurrence()
    occurrence_repo.start.return_value = started
    actor = ActorContext(
        user_id="m1", role=roles.BRANCH_MANAGER, network_id="n1", branch_id="b1"
    )
    result = _svc(occurrence_repo).start_occurrence(actor, "occ-1")
    occurrence_repo.start.assert_called_once()
    assert result["status"] == task_status.IN_PROGRESS


def test_branch_manager_cannot_start_oved_task():
    occurrence_repo = MagicMock()
    occurrence_repo.find_by_id.return_value = _occurrence(assignee_user_id="e1")
    actor = ActorContext(
        user_id="m1", role=roles.BRANCH_MANAGER, network_id="n1", branch_id="b1"
    )
    with pytest.raises(PermissionError, match="אין הרשאה"):
        _svc(occurrence_repo).start_occurrence(actor, "occ-1")
