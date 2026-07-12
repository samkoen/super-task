"""Tests endpoint task-from-voice (multipart)."""
from __future__ import annotations

import io

from fastapi.testclient import TestClient

from app.main import app


def test_task_from_voice_requires_multipart_fields():
    client = TestClient(app)
    response = client.post("/api/ai/task-from-voice", json={"branch_id": "b1", "task_kind": "ad_hoc"})
    assert response.status_code == 422


def test_task_from_voice_accepts_multipart(monkeypatch):
    from app.controllers import ai_controller

    class FakeDraft:
        title = "משימה"
        description = "תיאור"
        assignee_user_id = "u1"
        assignee_name = "יוסי"

    async def fake_parse(self, actor, **kwargs):
        return FakeDraft()

    monkeypatch.setattr(ai_controller.TaskVoiceAiService, "parse_voice_message", fake_parse)
    monkeypatch.setattr(ai_controller, "load_actor", lambda request, repo: object())

    client = TestClient(app)
    files = {"file": ("voice.webm", io.BytesIO(b"fake-audio"), "audio/webm")}
    data = {"branch_id": "branch-1", "task_kind": "ad_hoc"}
    response = client.post("/api/ai/task-from-voice", data=data, files=files)

    assert response.status_code == 200, response.text
    payload = response.json()
    assert payload["title"] == "משימה"
    assert payload["assignee_user_id"] == "u1"
