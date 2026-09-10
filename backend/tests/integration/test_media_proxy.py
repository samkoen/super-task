"""Intégration proxy médias : ACL locale /uploads."""
from __future__ import annotations

from fastapi.testclient import TestClient

from tests.integration.conftest import MGR_B_EMAIL, due_at_iso, login_client


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


def test_media_proxy_allows_chat_file_for_participants(
    client_emp,
    client_mgr,
    occurrence_id,
    mock_i18n,
):
    upload = client_emp.post(
        "/api/tasks/upload-file",
        files={"file": ("report.pdf", b"%PDF-1.4 fake", "application/pdf")},
    )
    assert upload.status_code == 200, upload.text
    url = upload.json()["url"]
    posted = client_emp.post(
        f"/api/tasks/occurrences/{occurrence_id}/messages",
        json={"file_url": url, "file_name": "report.pdf"},
    )
    assert posted.status_code == 201, posted.text

    for client in (client_emp, client_mgr):
        proxied = client.get("/api/media/proxy", params={"src": url})
        assert proxied.status_code == 200, proxied.text
        assert proxied.content.startswith(b"%PDF")


def test_media_proxy_allows_each_completion_video_for_manager(
    client_emp, client_mgr, world_seed
):
    occ_id = _create_three_video_task(client_mgr, world_seed)
    videos = _submit_three_videos(client_emp, occ_id)
    for url in videos:
        proxied = client_mgr.get("/api/media/proxy", params={"src": url})
        assert proxied.status_code == 200, proxied.text
        assert proxied.content


def _create_three_video_task(client_mgr, world_seed) -> str:
    created = client_mgr.post(
        "/api/tasks/ad-hoc",
        json={
            "branch_id": world_seed["branch_id"],
            "title": "שלוש מצלמות",
            "description": "לצלם שלוש",
            "due_at": due_at_iso(),
            "assignee_user_id": world_seed["employee_id"],
            "photo_required": False,
            "completion_requirements": [
                {"kind": "video", "min_seconds": 8},
                {"kind": "video", "min_seconds": 8},
                {"kind": "video", "min_seconds": 8},
            ],
        },
    )
    assert created.status_code == 201, created.text
    return created.json()["occurrence"]["id"]


def _submit_three_videos(client_emp, occ_id: str) -> list[str]:
    assert client_emp.post(f"/api/tasks/occurrences/{occ_id}/start").status_code == 200
    videos = [_upload_task_video(client_emp, f"cam-{i}.webm") for i in (1, 2, 3)]
    completed = client_emp.post(
        f"/api/tasks/occurrences/{occ_id}/complete",
        json={
            "status": "completed",
            "completion_attachments": [
                {"kind": "video", "url": url, "duration_seconds": 10} for url in videos
            ],
        },
    )
    assert completed.status_code == 200, completed.text
    saved = completed.json()["occurrence"]["completion"]["completion_attachments"]
    assert [item["url"] for item in saved] == videos
    return videos


def _upload_task_video(client, name: str) -> str:
    upload = client.post(
        "/api/tasks/upload-video",
        files={"file": (name, b"webm-fake-clip", "video/webm")},
    )
    assert upload.status_code == 200, upload.text
    return upload.json()["url"]
