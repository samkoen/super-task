from unittest.mock import MagicMock

import pytest

from app.domain import roles
from app.domain.scope import ActorContext
from app.services.media_retention_settings_service import MediaRetentionSettingsService


def _actor(role: str) -> ActorContext:
    return ActorContext(user_id="u1", role=role, network_id="n1", branch_id="b1")


def test_manager_reads_and_updates_retention_days():
    repo = MagicMock()
    repo.media_retention_days.return_value = 1
    service = MediaRetentionSettingsService(repo)

    assert service.read(_actor(roles.BRANCH_MANAGER)) == {"retention_days": 1}
    saved = service.update(_actor(roles.NETWORK_MANAGER), "14")

    assert saved == {"retention_days": 14}
    repo.set_media_retention_days.assert_called_once_with(14)


def test_employee_cannot_read_or_change_retention_days():
    service = MediaRetentionSettingsService(MagicMock())
    with pytest.raises(PermissionError):
        service.read(_actor(roles.EMPLOYEE))
    with pytest.raises(PermissionError):
        service.update(_actor(roles.EMPLOYEE), 3)


def test_update_rejects_a_day_count_past_the_limit():
    repo = MagicMock()
    service = MediaRetentionSettingsService(repo)
    with pytest.raises(ValueError):
        service.update(_actor(roles.BRANCH_MANAGER), 400)
    repo.set_media_retention_days.assert_not_called()
