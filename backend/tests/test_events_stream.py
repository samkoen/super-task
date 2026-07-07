from unittest.mock import MagicMock, patch

from fastapi.dependencies.utils import get_dependant
from fastapi.testclient import TestClient

from app.controllers import events_controller
from app.controllers.notification_controller import list_notifications
from app.main import create_app


def test_list_notifications_does_not_require_request_query_param():
    dependant = get_dependant(path="/api/notifications", call=list_notifications)
    assert [p.name for p in dependant.query_params] == ["unread_only"]


def test_list_notifications_without_session_returns_401_not_422():
    client = TestClient(create_app())
    response = client.get("/api/notifications")
    assert response.status_code == 401


def test_resolve_stream_channels_uses_live_sessionlocal():
    """SessionLocal imported by value stays None; module attribute must be read after get_engine."""
    fake_session = MagicMock()
    fake_session.return_value = MagicMock()
    with patch.object(events_controller.db_session, "get_engine") as get_engine:
        with patch.object(events_controller.db_session, "SessionLocal", fake_session):
            with patch.object(events_controller, "load_actor", return_value=MagicMock(role="employee", user_id="u1", branch_id="b1")):
                with patch.object(events_controller, "BranchRepository"):
                    with patch.object(events_controller, "UserRepository"):
                        with patch.object(events_controller, "channels_for_actor", return_value=["user:u1"]):
                            request = MagicMock()
                            channels = events_controller._resolve_stream_channels(request)

    get_engine.assert_called_once()
    fake_session.assert_called_once()
    assert channels == ["user:u1"]
