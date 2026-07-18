"""Règles galerie de tâches + service (mocks)."""
from unittest.mock import MagicMock

import pytest

from app.domain.scope import ActorContext
from app.domain.task_gallery import gallery_item_visible, resolve_gallery_branch_id
from app.models.task_gallery_item import TaskGalleryItem
from app.services.task_gallery_service import TaskGalleryService


def _actor(**kwargs) -> ActorContext:
    defaults = {
        "user_id": "u1",
        "role": "branch_manager",
        "network_id": "n1",
        "branch_id": "b1",
    }
    defaults.update(kwargs)
    return ActorContext(**defaults)


def test_gallery_item_visible_network_wide_for_branch_manager():
    actor = _actor()
    assert (
        gallery_item_visible(
            actor=actor,
            item_network_id="n1",
            item_branch_id=None,
            visible_branch_ids=["b1"],
        )
        is True
    )


def test_gallery_item_hidden_other_branch():
    actor = _actor()
    assert (
        gallery_item_visible(
            actor=actor,
            item_network_id="n1",
            item_branch_id="b2",
            visible_branch_ids=["b1"],
        )
        is False
    )


def test_branch_manager_forced_branch_id():
    assert resolve_gallery_branch_id(_actor(), "other") == "b1"


def test_network_manager_optional_branch():
    actor = _actor(role="network_manager", branch_id=None)
    assert resolve_gallery_branch_id(actor, None) is None
    assert resolve_gallery_branch_id(actor, "b9") == "b9"


def test_create_item_requires_title_or_description():
    service = TaskGalleryService(MagicMock(), MagicMock(), MagicMock(), MagicMock())
    with pytest.raises(ValueError, match="כותרת או תיאור"):
        service.create_item(_actor(), {"task_kind": "ad_hoc", "title": "  ", "description": ""})


def test_create_item_rejects_bad_kind():
    service = TaskGalleryService(MagicMock(), MagicMock(), MagicMock(), MagicMock())
    with pytest.raises(ValueError, match="סוג משימה"):
        service.create_item(_actor(), {"task_kind": "once", "title": "ניקוי"})


def test_create_item_ok(monkeypatch):
    repo = MagicMock()
    repo.create.return_value = TaskGalleryItem(
        id="g1",
        network_id="n1",
        branch_id="b1",
        title="ניקוי",
        description="",
        task_kind="ad_hoc",
        recurrence=None,
        due_time=None,
        weekly_days=None,
        monthly_day=None,
        photo_required=True,
        reference_photo_url=None,
        reference_video_url=None,
        reference_audio_url=None,
        created_by_id="u1",
        created_at="2026-01-01T00:00:00+00:00",
        updated_at="2026-01-01T00:00:00+00:00",
        source_occurrence_id=None,
    )
    branches = MagicMock()
    branches.find_by_id.return_value = MagicMock(id="b1")
    monkeypatch.setattr(
        "app.services.task_gallery_service.visible_branch_ids_for_tasks",
        lambda actor, repo: ["b1"],
    )
    monkeypatch.setattr(
        "app.services.task_gallery_service.blob_storage.copy_media_url",
        lambda url, folder: url,
    )
    service = TaskGalleryService(repo, branches, MagicMock(), MagicMock())
    result = service.create_item(
        _actor(), {"title": "ניקוי", "task_kind": "ad_hoc", "description": "x"}
    )
    assert result["id"] == "g1"
    repo.create.assert_called_once()
