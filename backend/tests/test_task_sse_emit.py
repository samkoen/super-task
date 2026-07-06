"""Ensure SSE is emitted only after DB commit (cross-session visibility)."""
from __future__ import annotations

from unittest.mock import MagicMock

from app.controllers import task_controller


def test_emit_task_event_commits_before_sse(monkeypatch):
    db = MagicMock()
    order: list[str] = []

    mock_svc_class = MagicMock()
    mock_svc_class.return_value.publish_task_event.return_value = [
        ("user-1", "n1", "task_created")
    ]
    mock_svc_class.push_task_event_sse.side_effect = lambda pending: order.append(
        "notification_sse"
    )
    monkeypatch.setattr(task_controller, "NotificationService", mock_svc_class)

    def commit():
        order.append("commit")

    db.commit.side_effect = commit

    def notify(event_type, item):
        order.append("sse")

    monkeypatch.setattr(task_controller, "_notify_occurrence", notify)

    task_controller._emit_task_event(
        db,
        "task_created",
        {"branch_id": "b1", "assignee_user_id": "u1", "id": "o1", "title": "Test"},
    )

    assert order == ["commit", "sse", "notification_sse"]
    db.commit.assert_called_once()
