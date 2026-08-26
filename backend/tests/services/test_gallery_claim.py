"""L'oved se ramène une recette de galerie."""
from unittest.mock import MagicMock

import pytest

from app.domain.scope import ActorContext
from app.models.task_gallery_item import TaskGalleryItem
from app.services.task_occurrence_service import TaskOccurrenceService


def _item(**kwargs) -> TaskGalleryItem:
    defaults = dict(
        id="g1",
        network_id="n1",
        branch_id="b1",
        title="תיעוד הבסטה",
        description="לצלם אחרי העמסה",
        task_kind="ad_hoc",
        recurrence=None,
        due_time=None,
        weekly_days=None,
        monthly_day=None,
        photo_required=True,
        reference_photo_url=None,
        reference_video_url=None,
        reference_audio_url=None,
        created_by_id="m1",
        created_at="2026-01-01T00:00:00+00:00",
        updated_at="2026-01-01T00:00:00+00:00",
        employee_can_claim=True,
        completion_requirements=[{"kind": "photo"}],
    )
    defaults.update(kwargs)
    return TaskGalleryItem(**defaults)


def _svc(gallery) -> TaskOccurrenceService:
    return TaskOccurrenceService(
        MagicMock(),
        MagicMock(),
        MagicMock(),
        MagicMock(),
        gallery_repo=gallery,
    )


def _oved() -> ActorContext:
    return ActorContext(
        user_id="e1",
        role="employee",
        network_id="n1",
        branch_id="b1",
    )


def test_claim_rejects_unflagged_recipe():
    gallery = MagicMock()
    gallery.find_by_id.return_value = _item(employee_can_claim=False)
    with pytest.raises(PermissionError, match="אין הרשאה"):
        _svc(gallery).claim_gallery_item(_oved(), "g1")


def test_claim_creates_ad_hoc_for_self():
    gallery = MagicMock()
    gallery.find_by_id.return_value = _item()
    svc = _svc(gallery)
    svc.create_ad_hoc = MagicMock(return_value={"id": "o1", "title": "תיעוד הבסטה"})
    result = svc.claim_gallery_item(_oved(), "g1")
    assert result["id"] == "o1"
    kwargs = svc.create_ad_hoc.call_args.kwargs
    assert kwargs["self_claim"] is True
    assert kwargs["assignee_user_id"] == "e1"
    assert kwargs["branch_id"] == "b1"
    assert kwargs["source_gallery_item_id"] == "g1"
    assert kwargs["title"] == "תיעוד הבסטה"
    assert kwargs["completion_requirements"] == [{"kind": "photo"}]


def test_claim_rejects_missing_item():
    gallery = MagicMock()
    gallery.find_by_id.return_value = None
    with pytest.raises(ValueError, match="לא נמצא"):
        _svc(gallery).claim_gallery_item(_oved(), "missing")


def test_claim_rejects_other_snif_recipe():
    gallery = MagicMock()
    gallery.find_by_id.return_value = _item(branch_id="b2")
    with pytest.raises(PermissionError, match="אין הרשאה"):
        _svc(gallery).claim_gallery_item(_oved(), "g1")


def test_claim_rejects_network_manager():
    gallery = MagicMock()
    gallery.find_by_id.return_value = _item()
    nm = ActorContext(user_id="nm", role="network_manager", network_id="n1")
    with pytest.raises(PermissionError, match="אין הרשאה"):
        _svc(gallery).claim_gallery_item(nm, "g1")


def test_self_claim_cannot_assign_someone_else():
    svc = _svc(MagicMock())
    with pytest.raises(PermissionError, match="לעצמך"):
        svc._assert_can_create_ad_hoc(
            _oved(), "b1", "other-oved", self_claim=True
        )


def test_self_claim_allows_dual_hat_menahel():
    svc = _svc(MagicMock())
    manager = ActorContext(
        user_id="m1", role="branch_manager", network_id="n1", branch_id="b1"
    )
    svc._assert_can_create_ad_hoc(manager, "b1", "m1", self_claim=True)


def test_self_claim_rejects_network_manager():
    svc = _svc(MagicMock())
    nm = ActorContext(user_id="nm", role="network_manager", network_id="n1")
    with pytest.raises(PermissionError, match="רק עובד"):
        svc._assert_can_create_ad_hoc(nm, "b1", "nm", self_claim=True)

