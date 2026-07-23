"""Intégration chat tâche : 2 utilisateurs, texte / médias / i18n."""
from __future__ import annotations

import app.db.session as db_session
from fastapi.testclient import TestClient

from app.domain import roles
from app.repositories.user_repository import UserRepository


def _messages_url(occurrence_id: str) -> str:
    return f"/api/tasks/occurrences/{occurrence_id}/messages"


def _last(client: TestClient, occurrence_id: str) -> dict:
    response = client.get(_messages_url(occurrence_id))
    assert response.status_code == 200, response.text
    items = response.json()
    assert items, "expected at least one message"
    return items[-1]


def test_employee_text_then_manager_sees_translation(
    client_emp, client_mgr, occurrence_id, mock_i18n
):
    posted = client_emp.post(
        _messages_url(occurrence_id),
        json={"body": "sawasdee"},
    )
    assert posted.status_code == 201, posted.text
    body = posted.json()
    assert body["occurrence"]["status"] == "awaiting_response"
    assert body["chat_message"]["display_body"] == "sawasdee"
    assert body["chat_message"]["body_translated"] == "sawasdee->he"

    as_mgr = _last(client_mgr, occurrence_id)
    assert as_mgr["body"] == "sawasdee"
    assert as_mgr["display_body"] == "sawasdee->he"

    as_emp = _last(client_emp, occurrence_id)
    assert as_emp["display_body"] == "sawasdee"


def test_manager_reply_reopens_in_progress_and_translates_for_employee(
    client_emp, client_mgr, occurrence_id, mock_i18n
):
    assert (
        client_emp.post(_messages_url(occurrence_id), json={"body": "sha-la"}).status_code
        == 201
    )
    reply = client_mgr.post(
        _messages_url(occurrence_id),
        json={"body": "בסדר"},
    )
    assert reply.status_code == 201, reply.text
    assert reply.json()["occurrence"]["status"] == "in_progress"
    assert reply.json()["chat_message"]["body_translated"] == "בסדר->th"

    as_emp = _last(client_emp, occurrence_id)
    assert as_emp["body"] == "בסדר"
    assert as_emp["display_body"] == "בסדר->th"

    as_mgr = _last(client_mgr, occurrence_id)
    assert as_mgr["display_body"] == "בסדר"


def test_employee_photo_message(client_emp, client_mgr, occurrence_id, mock_i18n, jpeg_bytes):
    upload = client_emp.post(
        "/api/tasks/upload-photo",
        files={"file": ("shot.jpg", jpeg_bytes, "image/jpeg")},
    )
    assert upload.status_code == 200, upload.text
    url = upload.json()["url"]
    assert url.startswith("/uploads/")

    posted = client_emp.post(_messages_url(occurrence_id), json={"photo_url": url})
    assert posted.status_code == 201, posted.text
    assert posted.json()["chat_message"]["photo_url"] == url

    as_mgr = _last(client_mgr, occurrence_id)
    assert as_mgr["photo_url"] == url
    assert as_mgr["body"] is None


def test_employee_video_message(client_emp, client_mgr, occurrence_id, mock_i18n):
    upload = client_emp.post(
        "/api/tasks/upload-video",
        files={"file": ("clip.mp4", b"fake-mp4-bytes", "video/mp4")},
    )
    assert upload.status_code == 200, upload.text
    url = upload.json()["url"]

    posted = client_emp.post(_messages_url(occurrence_id), json={"video_url": url})
    assert posted.status_code == 201, posted.text
    assert _last(client_mgr, occurrence_id)["video_url"] == url


def test_employee_audio_message_transcripts(
    client_emp, client_mgr, occurrence_id, mock_i18n
):
    upload = client_emp.post(
        "/api/tasks/upload-audio",
        files={"file": ("note.webm", b"fake-audio-bytes", "audio/webm")},
    )
    assert upload.status_code == 200, upload.text
    url = upload.json()["url"]

    posted = client_emp.post(_messages_url(occurrence_id), json={"audio_url": url})
    assert posted.status_code == 201, posted.text
    msg = posted.json()["chat_message"]
    assert msg["audio_url"] == url
    assert msg["audio_transcript"] == "transcript-he"
    assert msg["audio_transcript_sender"] == "transcript-he->th"
    assert msg["display_audio_transcript"] == "transcript-he->th"

    as_mgr = _last(client_mgr, occurrence_id)
    assert as_mgr["display_audio_transcript"] == "transcript-he"


def test_empty_message_rejected(client_emp, occurrence_id, mock_i18n):
    response = client_emp.post(_messages_url(occurrence_id), json={"body": "   "})
    assert response.status_code == 400


def test_other_employee_cannot_post(app, chat_seed, mock_i18n):
    from tests.integration import conftest as integration_conftest

    assert db_session.SessionLocal is not None
    db = db_session.SessionLocal()
    try:
        UserRepository(db).create_user(
            email="other.emp@test.local",
            password=integration_conftest.PASSWORD,
            first_name="Other",
            last_name="Emp",
            role=roles.EMPLOYEE,
            email_verified=True,
            network_id=chat_seed["network_id"],
            branch_id=chat_seed["branch_id"],
            preferred_language="he",
        )
        db.commit()
    finally:
        db.close()

    other = TestClient(app)
    login = other.post(
        "/api/auth/login",
        json={
            "email": "other.emp@test.local",
            "password": integration_conftest.PASSWORD,
        },
    )
    assert login.status_code == 200
    denied = other.post(
        _messages_url(chat_seed["occurrence_id"]),
        json={"body": "intrus"},
    )
    assert denied.status_code == 403
