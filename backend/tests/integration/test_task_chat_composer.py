"""Intégration barre chat unifiée : envoi immédiat photo / vidéo / audio."""
from __future__ import annotations


def _messages_url(occurrence_id: str) -> str:
    return f"/api/tasks/occurrences/{occurrence_id}/messages"


def _upload(client, kind: str, filename: str, content: bytes, mime: str) -> str:
    response = client.post(
        f"/api/tasks/upload-{kind}",
        files={"file": (filename, content, mime)},
    )
    assert response.status_code == 200, response.text
    return response.json()["url"]


def test_composer_sends_photo_video_audio_immediately(
    client_emp, client_mgr, occurrence_id, mock_i18n, jpeg_bytes
):
    photo = _upload(client_emp, "photo", "shot.jpg", jpeg_bytes, "image/jpeg")
    video = _upload(client_emp, "video", "clip.webm", b"fake-video", "video/webm")
    audio = _upload(client_emp, "audio", "note.webm", b"fake-audio", "audio/webm")

    photo_msg = client_emp.post(_messages_url(occurrence_id), json={"photo_url": photo})
    video_msg = client_emp.post(_messages_url(occurrence_id), json={"video_url": video})
    audio_msg = client_emp.post(_messages_url(occurrence_id), json={"audio_url": audio})
    assert photo_msg.status_code == 201, photo_msg.text
    assert video_msg.status_code == 201, video_msg.text
    assert audio_msg.status_code == 201, audio_msg.text
    assert audio_msg.json()["occurrence"]["status"] == "awaiting_response"

    thread = client_mgr.get(_messages_url(occurrence_id))
    assert thread.status_code == 200
    urls = {(m.get("photo_url"), m.get("video_url"), m.get("audio_url")) for m in thread.json()["messages"]}
    assert (photo, None, None) in urls
    assert (None, video, None) in urls
    assert (None, None, audio) in urls
    assert audio_msg.json()["chat_message"]["display_audio_transcript"]


def test_composer_send_does_not_archive_the_chat_task(
    client_emp, client_mgr, occurrence_id, mock_i18n, jpeg_bytes
):
    url = _upload(client_emp, "photo", "now.jpg", jpeg_bytes, "image/jpeg")
    posted = client_emp.post(_messages_url(occurrence_id), json={"photo_url": url})
    assert posted.status_code == 201
    listed = client_mgr.get(_messages_url(occurrence_id))
    assert listed.status_code == 200
    occ = client_mgr.get(f"/api/tasks/occurrences/{occurrence_id}")
    assert occ.status_code == 200
    body = occ.json()
    assert body["status"] == "awaiting_response"
    assert not body.get("chat_resolved_at")
