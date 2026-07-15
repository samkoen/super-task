"""Fusion média de référence template → occurrence."""
from app.domain.task_reference_media import merge_occurrence_reference_media
from app.models.task_occurrence import TaskOccurrence
from app.models.task_template import TaskTemplate


def _occurrence(**overrides) -> TaskOccurrence:
    base = {
        "id": "occ-1",
        "template_id": "tpl-1",
        "branch_id": "branch-1",
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
        "branch_id": "branch-1",
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
        "reference_video_url": "/uploads/task_videos/tpl.mp4",
        "reference_audio_url": "/uploads/task_audio/tpl.webm",
        "biweekly_anchor": None,
        "is_active": True,
        "created_by_id": "m1",
        "created_at": "2026-01-01T00:00:00+02:00",
        "updated_at": "2026-01-01T00:00:00+02:00",
    }
    base.update(overrides)
    return TaskTemplate(**base)


def test_merge_occurrence_reference_media_fills_missing_from_template():
    merged = merge_occurrence_reference_media(_occurrence(), _template())
    assert merged.reference_photo_url == "/uploads/task_photos/tpl.jpg"
    assert merged.reference_video_url == "/uploads/task_videos/tpl.mp4"
    assert merged.reference_audio_url == "/uploads/task_audio/tpl.webm"


def test_merge_occurrence_reference_media_keeps_occurrence_values():
    merged = merge_occurrence_reference_media(
        _occurrence(reference_photo_url="/uploads/task_photos/occ.jpg"),
        _template(),
    )
    assert merged.reference_photo_url == "/uploads/task_photos/occ.jpg"
    assert merged.reference_video_url == "/uploads/task_videos/tpl.mp4"
