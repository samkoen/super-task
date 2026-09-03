from datetime import date, datetime
from types import SimpleNamespace
from unittest.mock import MagicMock
from zoneinfo import ZoneInfo

from app.domain.scope import ActorContext
from app.domain import roles
from app.models.network import Network
from app.models.user import User
from app.services.dashboard_service import DashboardService

TZ = ZoneInfo("Asia/Jerusalem")
NOW = datetime(2026, 9, 3, 12, 0, tzinfo=TZ)
DAY = date(2026, 9, 3)


def _actor() -> ActorContext:
    return ActorContext(user_id="nm", role=roles.NETWORK_MANAGER, network_id="n1")


def _service(networks=None) -> DashboardService:
    return DashboardService(
        MagicMock(),
        MagicMock(),
        MagicMock(),
        MagicMock(),
        MagicMock(),
        network_repo=networks,
    )


def test_manages_all_workers_reads_network_flag():
    networks = MagicMock()
    networks.find_by_id.return_value = Network(id="n1", name="רשת", manages_all_workers=True)
    svc = _service(networks)
    assert svc._manages_all_workers(_actor()) is True
    networks.find_by_id.return_value = Network(id="n1", name="רשת", manages_all_workers=False)
    assert svc._manages_all_workers(_actor()) is False


def test_manages_all_workers_false_without_repo():
    assert _service()._manages_all_workers(_actor()) is False


def test_annotate_team_branches_adds_snif_name():
    svc = _service()
    svc._branches.find_by_id.return_value = SimpleNamespace(name="רמת אהרון")
    emp = User(
        id="e1",
        email="e@x",
        first_name="דני",
        last_name="עובד",
        branch_id="b1",
    )
    team = [{"user_id": "e1", "full_name": "דני עובד"}]
    out = svc._annotate_team_branches(team, [emp])
    assert out[0]["branch_name"] == "רמת אהרון"


def test_fill_all_workers_sets_flag_even_without_branches():
    svc = _service()
    payload = {"counts": {}, "manages_all_workers": False}
    svc._fill_all_workers_overview(payload, _actor(), [], {"tasks": [], "overdue": []}, DAY, NOW)
    assert payload["manages_all_workers"] is True
    assert payload.get("team") is None
