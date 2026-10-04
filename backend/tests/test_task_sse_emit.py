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
    published = mock_svc_class.return_value.publish_task_event.call_args.kwargs
    assert published["occurrence_id"] == "o1"


def test_weekly_template_without_today_occurrence_skips_occurrence_fk():
    template = {
        "id": "a60cbcb2-1e96-4554-b4a9-73f79ba57fbf",
        "branch_id": "b1",
        "assignee_user_id": "u1",
        "title": "ששש",
        "created_by_id": "m1",
    }
    payload = task_controller._sse_payload_from_create_template(dict(template))
    assert payload["id"] is None
    assert payload["title"] == "ששש"
    assert payload["created_by_id"] == "m1"
    assert template["id"] == "a60cbcb2-1e96-4554-b4a9-73f79ba57fbf"


def test_emit_without_occurrence_does_not_send_template_id(monkeypatch):
    db = MagicMock()
    mock_svc_class = MagicMock()
    mock_svc_class.return_value.publish_task_event.return_value = []
    monkeypatch.setattr(task_controller, "NotificationService", mock_svc_class)
    monkeypatch.setattr(task_controller, "_notify_occurrence", lambda *_a, **_k: None)

    task_controller._emit_task_event(
        db,
        "task_created",
        task_controller._sse_payload_from_create_template(
            {
                "id": "template-only",
                "branch_id": "b1",
                "assignee_user_id": "u1",
                "title": "ששש",
                "created_by_id": "m1",
            }
        ),
    )

    published = mock_svc_class.return_value.publish_task_event.call_args.kwargs
    assert published["occurrence_id"] is None
    assert published["task_title"] == "ששש"


def test_emit_after_complete_skips_manager_alert_until_media_ready(monkeypatch):
    db = MagicMock()
    emitted: list[str] = []
    assignee_events: list[str] = []
    monkeypatch.setattr(
        task_controller,
        "_emit_task_event",
        lambda _db, event_type, _item: emitted.append(event_type),
    )
    monkeypatch.setattr(
        task_controller,
        "notify_assignee_only",
        lambda **kwargs: assignee_events.append(kwargs["event_type"]),
    )
    monkeypatch.setattr(task_controller, "EmployeeActivityService", MagicMock())
    monkeypatch.setattr(task_controller, "UserRepository", MagicMock())
    monkeypatch.setattr(task_controller, "TaskOccurrenceRepository", MagicMock())
    monkeypatch.setattr(task_controller, "EmployeeBreakRepository", MagicMock())

    pending = {
        "id": "o1",
        "branch_id": "b1",
        "assignee_user_id": "emp-1",
        "status": "pending_review",
        "completion": {"media_ready": False},
    }
    task_controller.emit_after_complete(db, pending)
    assert emitted == []
    assert assignee_events == ["task_updated"]

    ready = {**pending, "completion": {"media_ready": True}}
    task_controller.emit_after_complete(db, ready)
    assert emitted == ["task_completed"]
