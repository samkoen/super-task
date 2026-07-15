"""Chargement édition : fusion template et persistance sur l'occurrence."""
from unittest.mock import MagicMock

from app.domain import roles
from app.models.task_occurrence import TaskOccurrence
from app.models.task_template import TaskTemplate
from app.services.task_occurrence_service import TaskOccurrenceService


def _occurrence(**overrides) -> TaskOccurrence:
    base = {
        "id": "occ-1",
        "template_id": "tpl-1",
        "branch_id": "b1",
        "title": "T",
        "description": "",
        "due_at": "2026-01-01T09:00:00+02:00",
        "status": "pending",
        "assignee_user_id": "u1",
        "department_id": None,
        "task_kind": "fixed",
        "manager_user_id": None,
        "photo_required": False,
        "reference_photo_url": None,
        "reference_video_url": None,
        "reference_audio_url": None,
        "started_at": None,
        "started_by_id": None,
        "created_by_id": "m1",
        "created_at": "2026-01-01T00:00:00+02:00",
        "updated_at": "2026-01-01T00:00:00+02:00",
    }
    base.update(overrides)
    return TaskOccurrence(**base)


def _template(**overrides) -> TaskTemplate:
    base = {
        "id": "tpl-1",
        "branch_id": "b1",
        "title": "T",
        "description": "",
        "recurrence": "daily",
        "due_time": "09:00",
        "weekly_days": None,
        "monthly_day": None,
        "assignee_user_id": "u1",
        "department_id": None,
        "task_kind": "fixed",
        "photo_required": False,
        "reference_photo_url": "/uploads/task_photos/tpl.jpg",
        "reference_video_url": None,
        "reference_audio_url": "/uploads/task_audio/tpl.webm",
        "biweekly_anchor": None,
        "is_active": True,
        "created_by_id": "m1",
        "created_at": "2026-01-01T00:00:00+02:00",
        "updated_at": "2026-01-01T00:00:00+02:00",
    }
    base.update(overrides)
    return TaskTemplate(**base)


def test_get_occurrence_syncs_reference_media_from_template():
    occurrence = _occurrence()
    synced = _occurrence(
        reference_photo_url="/uploads/task_photos/tpl.jpg",
        reference_audio_url="/uploads/task_audio/tpl.webm",
    )
    template = _template()

    occurrence_repo = MagicMock()
    occurrence_repo.find_by_id.return_value = occurrence
    occurrence_repo.update_reference_media.return_value = synced
    occurrence_repo.get_branch_name.return_value = "Branch"
    occurrence_repo.get_department_name.return_value = None
    occurrence_repo.get_assignee_name.return_value = "Worker"
    occurrence_repo.get_manager_name.return_value = None

    template_repo = MagicMock()
    template_repo.find_by_id.return_value = template

    completion_repo = MagicMock()
    completion_repo.find_by_occurrence.return_value = None

    svc = TaskOccurrenceService(
        occurrence_repo,
        completion_repo,
        MagicMock(),
        MagicMock(),
        template_repo=template_repo,
    )
    actor = MagicMock()
    actor.role = roles.BRANCH_MANAGER
    actor.branch_id = "b1"

    result = svc.get_occurrence(actor, "occ-1")

    occurrence_repo.update_reference_media.assert_called_once()
    assert result["reference_photo_url"] == "/uploads/task_photos/tpl.jpg"
    assert result["reference_audio_url"] == "/uploads/task_audio/tpl.webm"
