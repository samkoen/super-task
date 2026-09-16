from unittest.mock import MagicMock

import pytest

from app.domain import roles
from app.domain.scope import ActorContext
from app.models.app_release import AppRelease
from app.services.app_release_service import AppReleaseService


def _admin() -> ActorContext:
    return ActorContext(user_id="admin-1", role=roles.ADMIN)


def _employee() -> ActorContext:
    return ActorContext(user_id="e1", role=roles.EMPLOYEE, network_id="n1", branch_id="b1")


def _release(**overrides) -> AppRelease:
    data = dict(
        id="r1",
        version_code=101,
        version_name="1.1",
        apk_url="/uploads/app_apks/a.apk",
        published_by_user_id="admin-1",
        created_at="2026-01-01T00:00:00",
    )
    data.update(overrides)
    return AppRelease(**data)


def _service(repo=None) -> AppReleaseService:
    return AppReleaseService(repo or MagicMock())


def test_latest_empty():
    repo = MagicMock()
    repo.find_latest.return_value = None
    assert _service(repo).latest_for_client() == {"available": False}


def test_latest_returns_download_url(monkeypatch):
    repo = MagicMock()
    repo.find_latest.return_value = _release()
    monkeypatch.setattr(
        "app.services.app_release_service.blob_storage.presign_get_url",
        lambda url: "https://signed.example/a.apk",
    )
    out = _service(repo).latest_for_client()
    assert out["available"] is True
    assert out["version_code"] == 101
    assert out["download_url"] == "https://signed.example/a.apk"
    assert "apk_url" not in out


def test_employee_cannot_publish():
    with pytest.raises(PermissionError):
        _service().publish(
            _employee(),
            version_name="1.1",
            apk_url="/uploads/app_apks/a.apk",
        )


def test_publish_requires_newer_code(monkeypatch):
    repo = MagicMock()
    repo.find_latest.return_value = _release(version_code=101, version_name="1.1")
    monkeypatch.setattr(
        "app.services.app_release_service.blob_storage.media_is_readable",
        lambda url: True,
    )
    with pytest.raises(ValueError):
        _service(repo).publish(
            _admin(),
            version_name="1.1",
            apk_url="/uploads/app_apks/a.apk",
        )


def test_publish_saves_when_apk_exists(monkeypatch):
    repo = MagicMock()
    repo.find_latest.return_value = _release(version_code=100, version_name="1.0")
    repo.create.return_value = _release(version_code=101, version_name="1.1")
    monkeypatch.setattr(
        "app.services.app_release_service.blob_storage.media_is_readable",
        lambda url: True,
    )
    out = _service(repo).publish(
        _admin(),
        version_name="1.1",
        apk_url="/uploads/app_apks/a.apk",
    )
    assert out["version_code"] == 101
    assert "apk_url" not in out
    repo.create.assert_called_once()


def test_upload_intent_proxy_when_no_r2(monkeypatch):
    monkeypatch.setattr(
        "app.services.app_release_service.should_use_direct_put_intent",
        lambda: False,
    )
    assert _service().create_upload_intent(_admin(), 1000) == {"mode": "proxy"}
