"""Intégration proxy médias : ACL locale /uploads."""
from __future__ import annotations

from fastapi.testclient import TestClient

from tests.integration.conftest import MGR_B_EMAIL, login_client


def test_media_proxy_allows_participants_rejects_other_branch_and_evil_url(
    client_emp,
    client_mgr,
    occurrence_id,
    jpeg_bytes,
    app,
    second_branch_seed,
    mock_i18n,
):
    upload = client_emp.post(
        "/api/tasks/upload-photo",
        files={"file": ("chat.jpg", jpeg_bytes, "image/jpeg")},
    )
    assert upload.status_code == 200, upload.text
    url = upload.json()["url"]

    posted = client_emp.post(
        f"/api/tasks/occurrences/{occurrence_id}/messages",
        json={"photo_url": url},
    )
    assert posted.status_code == 201, posted.text

    for client in (client_emp, client_mgr):
        proxied = client.get("/api/media/proxy", params={"src": url})
        assert proxied.status_code == 200, proxied.text
        assert proxied.headers["content-type"].startswith("image/")
        assert len(proxied.content) > 0
        assert "private" in proxied.headers.get("cache-control", "")

    mgr_b = login_client(app, MGR_B_EMAIL)
    denied = mgr_b.get("/api/media/proxy", params={"src": url})
    assert denied.status_code == 403

    evil = client_mgr.get(
        "/api/media/proxy",
        params={"src": "https://evil.example/secret.jpg"},
    )
    assert evil.status_code == 400
