"""Intégration auth : login / me / logout / erreurs."""
from __future__ import annotations

import app.db.session as db_session
from fastapi.testclient import TestClient

from app.domain import roles
from app.repositories.user_repository import UserRepository
from tests.integration.conftest import EMP_EMAIL, PASSWORD, UNVERIFIED_EMAIL


def test_login_me_logout_roundtrip(app, world_seed):
    client = TestClient(app)
    login = client.post(
        "/api/auth/login",
        json={"email": EMP_EMAIL, "password": PASSWORD},
    )
    assert login.status_code == 200, login.text
    assert login.json()["user"]["email"] == EMP_EMAIL
    assert login.json()["user"]["role"] == roles.EMPLOYEE

    me = client.get("/api/auth/me")
    assert me.status_code == 200
    assert me.json()["user"]["id"] == world_seed["employee_id"]

    assert client.post("/api/auth/logout").status_code == 200
    assert client.get("/api/auth/me").status_code == 401


def test_login_wrong_password(app, world_seed):
    client = TestClient(app)
    response = client.post(
        "/api/auth/login",
        json={"email": EMP_EMAIL, "password": "wrong-password"},
    )
    assert response.status_code == 401
    assert "אימייל או סיסמה שגויים" in response.json()["error"]
    assert client.get("/api/auth/me").status_code == 401


def test_login_unknown_email(app, world_seed):
    client = TestClient(app)
    response = client.post(
        "/api/auth/login",
        json={"email": "nobody@test.local", "password": PASSWORD},
    )
    assert response.status_code == 401


def test_login_unverified_email(app, world_seed):
    assert db_session.SessionLocal is not None
    db = db_session.SessionLocal()
    try:
        UserRepository(db).create_user(
            email=UNVERIFIED_EMAIL,
            password=PASSWORD,
            first_name="Wait",
            last_name="Verify",
            role=roles.EMPLOYEE,
            email_verified=False,
            network_id=world_seed["network_id"],
            branch_id=world_seed["branch_id"],
            preferred_language="he",
        )
        db.commit()
    finally:
        db.close()

    client = TestClient(app)
    response = client.post(
        "/api/auth/login",
        json={"email": UNVERIFIED_EMAIL, "password": PASSWORD},
    )
    assert response.status_code == 403
    assert "לאמת" in response.json()["error"]
