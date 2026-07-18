"""ACL proxy média — périmètre branche."""
from __future__ import annotations

from unittest.mock import MagicMock, patch

from app.domain import roles
from app.domain.scope import ActorContext
from app.services.media_access_service import actor_can_access_media_url


def _actor(
    role: str,
    branch_id: str | None = "11111111-1111-1111-1111-111111111111",
) -> ActorContext:
    return ActorContext(
        user_id="u1",
        role=role,
        network_id="22222222-2222-2222-2222-222222222222",
        branch_id=branch_id,
    )


def test_empty_url_denied():
    assert actor_can_access_media_url(MagicMock(), _actor(roles.EMPLOYEE), "") is False


def test_employee_without_branches_denied():
    db = MagicMock()
    with patch(
        "app.services.media_access_service.visible_branch_ids_for_tasks",
        return_value=[],
    ):
        assert (
            actor_can_access_media_url(db, _actor(roles.EMPLOYEE), "https://x/a.jpg")
            is False
        )


def test_admin_requires_url_in_db():
    db = MagicMock()
    db.execute.return_value.first.return_value = None
    with patch(
        "app.services.media_access_service.visible_branch_ids_for_tasks",
        return_value=None,
    ):
        assert (
            actor_can_access_media_url(db, _actor(roles.ADMIN), "https://x/orphan.jpg")
            is False
        )


def test_manager_allowed_when_url_in_branch():
    db = MagicMock()
    # first query (occurrence) hits
    hit = MagicMock()
    hit.first.return_value = ("occ-1",)
    db.execute.return_value = hit
    branch_id = "11111111-1111-1111-1111-111111111111"
    with patch(
        "app.services.media_access_service.visible_branch_ids_for_tasks",
        return_value={branch_id},
    ):
        assert (
            actor_can_access_media_url(
                db,
                _actor(roles.BRANCH_MANAGER, branch_id=branch_id),
                "https://x/ok.jpg",
            )
            is True
        )


def test_manager_allowed_when_url_in_gallery():
    db = MagicMock()
    miss = MagicMock()
    miss.first.return_value = None
    hit = MagicMock()
    hit.first.return_value = ("g1",)
    # occurrence, completion, template, issue miss ; then gallery scope hit
    db.execute.side_effect = [miss, miss, miss, miss, hit]
    branch_id = "11111111-1111-1111-1111-111111111111"
    with patch(
        "app.services.media_access_service.visible_branch_ids_for_tasks",
        return_value=[branch_id],
    ):
        assert (
            actor_can_access_media_url(
                db,
                _actor(roles.BRANCH_MANAGER, branch_id=branch_id),
                "/uploads/gallery_photos/a.jpg",
            )
            is True
        )
