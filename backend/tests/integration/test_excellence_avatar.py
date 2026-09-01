"""Intégration avatar excellence : stylize HTTP, slogan, צפייה כעובד."""
from __future__ import annotations

from tests.integration.conftest import EMP_EMAIL, MGR_EMAIL, login_client


def _fake_stylize(monkeypatch, *, fail: bool = False) -> None:
    from app.services.ai.gemini_client import GeminiError

    async def ok(photo_bytes, mime_type, prompt):
        return photo_bytes, "image/jpeg"

    async def down(photo_bytes, mime_type, prompt):
        raise GeminiError("down")

    monkeypatch.setattr(
        "app.services.excellence_avatar_service.generate_image_from_photo",
        down if fail else ok,
    )


def test_oved_stylize_avatar_persists_slogan(client_emp, jpeg_bytes, monkeypatch):
    _fake_stylize(monkeypatch)
    response = client_emp.post(
        "/api/auth/me/avatar/excellence",
        files={"file": ("face.jpg", jpeg_bytes, "image/jpeg")},
    )
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["used_ai"] is True
    slogan = body["user"]["excellence_slogan"]
    assert slogan
    assert body["user"]["avatar_url"]
    me = client_emp.get("/api/auth/me")
    assert me.json()["user"]["excellence_slogan"] == slogan
    dash = client_emp.get("/api/dashboard/employee")
    assert dash.status_code == 200, dash.text
    assert dash.json()["employee"]["excellence_slogan"] == slogan


def test_stylize_keeps_photo_and_slogan_when_gemini_fails(
    client_emp, jpeg_bytes, monkeypatch
):
    _fake_stylize(monkeypatch, fail=True)
    response = client_emp.post(
        "/api/auth/me/avatar/excellence",
        files={"file": ("face.jpg", jpeg_bytes, "image/jpeg")},
    )
    assert response.status_code == 200, response.text
    assert response.json()["used_ai"] is False
    assert response.json()["user"]["excellence_slogan"]
    assert response.json()["user"]["avatar_url"]


def test_view_as_stylizes_employee_avatar(app, world_seed, jpeg_bytes, monkeypatch):
    _fake_stylize(monkeypatch)
    client = login_client(app, MGR_EMAIL)
    preview = client.post("/api/auth/view-as", json={"user_id": world_seed["employee_id"]})
    assert preview.status_code == 200, preview.text
    response = client.post(
        "/api/auth/me/avatar/excellence",
        files={"file": ("face.jpg", jpeg_bytes, "image/jpeg")},
    )
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["user"]["id"] == world_seed["employee_id"]
    assert body["user"]["is_preview"] is True
    assert body["user"]["avatar_url"]
    me = login_client(app, EMP_EMAIL).get("/api/auth/me")
    assert me.json()["user"]["excellence_slogan"]
