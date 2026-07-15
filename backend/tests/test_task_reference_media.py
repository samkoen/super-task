"""Propagation du média de référence template → occurrence."""
from __future__ import annotations

from datetime import date, datetime
from unittest.mock import MagicMock
from zoneinfo import ZoneInfo

from app.models.task_template import TaskTemplate
from app.services.task_scheduler_service import TaskSchedulerService

TZ = ZoneInfo("Asia/Jerusalem")


def _template(**overrides) -> TaskTemplate:
    base = {
        "id": "tpl-1",
        "branch_id": "branch-1",
        "title": "Nettoyage",
        "description": "Desc",
        "recurrence": "daily",
        "due_time": "09:00",
        "weekly_days": None,
        "monthly_day": None,
        "assignee_user_id": "user-1",
        "department_id": None,
        "task_kind": "fixed",
        "photo_required": False,
        "reference_photo_url": "/uploads/task_photos/ref.jpg",
        "reference_video_url": "/uploads/task_videos/ref.mp4",
        "reference_audio_url": "/uploads/task_audio/ref.webm",
        "biweekly_anchor": None,
        "is_active": True,
        "created_by_id": "mgr-1",
        "created_at": "2026-01-01T00:00:00+02:00",
        "updated_at": "2026-01-01T00:00:00+02:00",
    }
    base.update(overrides)
    return TaskTemplate(**base)


def test_generate_from_template_copies_reference_media(monkeypatch):
    template = _template()
    occurrence_repo = MagicMock()
    occurrence_repo.exists_for_template_on_date.return_value = False

    scheduler = TaskSchedulerService(MagicMock(), occurrence_repo)
    monkeypatch.setattr(
        "app.services.task_scheduler_service.task_recurrence.should_generate_on_date",
        lambda *args, **kwargs: True,
    )

    day = date(2026, 7, 14)
    ok = scheduler.generate_from_template(template, on_date=day)

    assert ok is True
    occurrence_repo.create.assert_called_once()
    kwargs = occurrence_repo.create.call_args.kwargs
    assert kwargs["reference_photo_url"] == "/uploads/task_photos/ref.jpg"
    assert kwargs["reference_video_url"] == "/uploads/task_videos/ref.mp4"
    assert kwargs["reference_audio_url"] == "/uploads/task_audio/ref.webm"
    assert kwargs["template_id"] == template.id


def test_create_once_occurrence_copies_reference_media():
    template = _template(reference_photo_url=None, reference_video_url=None)
    occurrence_repo = MagicMock()
    scheduler = TaskSchedulerService(MagicMock(), occurrence_repo)

    due_at = datetime(2026, 7, 14, 9, 0, tzinfo=TZ)
    scheduler.create_once_occurrence(template, due_at=due_at)

    kwargs = occurrence_repo.create.call_args.kwargs
    assert kwargs["reference_photo_url"] is None
    assert kwargs["reference_video_url"] is None
    assert kwargs["due_at"] == due_at
