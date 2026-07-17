"""Config sécurisée prod + session utilisateur désactivé."""
from __future__ import annotations

from unittest.mock import MagicMock

import pytest
from fastapi import HTTPException

from app.auth.actor import load_actor, require_admin_actor, require_manager_actor
from app.domain import roles


def test_assert_secure_runtime_rejects_default_secret(monkeypatch):
    monkeypatch.setattr("app.core.config.IS_PRODUCTION", True)
    monkeypatch.setattr("app.core.config.SECRET_KEY", "dev-secret-key-change-in-production")
    monkeypatch.setattr("app.core.config.BLOB_READ_WRITE_TOKEN", "tok")
    from app.core import config

    with pytest.raises(RuntimeError, match="SECRET_KEY"):
        config.assert_secure_runtime_config()


def test_assert_secure_runtime_rejects_missing_blob(monkeypatch):
    monkeypatch.setattr("app.core.config.IS_PRODUCTION", True)
    monkeypatch.setattr("app.core.config.SECRET_KEY", "a" * 32)
    monkeypatch.setattr("app.core.config.BLOB_READ_WRITE_TOKEN", "")
    from app.core import config

    with pytest.raises(RuntimeError, match="BLOB_READ_WRITE_TOKEN"):
        config.assert_secure_runtime_config()


def test_load_actor_rejects_inactive_user():
    user = MagicMock()
    user.is_active = False
    user.role = roles.EMPLOYEE
    user.network_id = None
    user.branch_id = "b1"
    repo = MagicMock()
    repo.find_by_id.return_value = user
    request = MagicMock()
    session: dict = {"user_id": "u1", "user_role": roles.EMPLOYEE}
    request.session = session

    with pytest.raises(HTTPException) as exc:
        load_actor(request, repo)
    assert exc.value.status_code == 401
    assert session == {}


def test_require_admin_uses_db_role_not_stale_session():
    user = MagicMock()
    user.is_active = True
    user.role = roles.EMPLOYEE  # rétrogradé
    user.network_id = None
    user.branch_id = "b1"
    repo = MagicMock()
    repo.find_by_id.return_value = user
    request = MagicMock()
    request.session = {"user_id": "u1", "user_role": roles.ADMIN}

    with pytest.raises(HTTPException) as exc:
        require_admin_actor(request, repo)
    assert exc.value.status_code == 403


def test_require_manager_actor_ok():
    user = MagicMock()
    user.is_active = True
    user.role = roles.BRANCH_MANAGER
    user.network_id = "n1"
    user.branch_id = "b1"
    repo = MagicMock()
    repo.find_by_id.return_value = user
    request = MagicMock()
    request.session = {"user_id": "u1", "user_role": roles.EMPLOYEE}

    actor = require_manager_actor(request, repo)
    assert actor.role == roles.BRANCH_MANAGER
    assert request.session["user_role"] == roles.BRANCH_MANAGER
