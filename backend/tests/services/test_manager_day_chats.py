from types import SimpleNamespace
from unittest.mock import MagicMock

import pytest

from app.domain import roles, task_status
from app.domain.scope import ActorContext
from app.models.branch import Branch
from app.models.user import User
from app.services.task_message_service import TaskMessageService


def _user(**kwargs) -> User:
    defaults = dict(
        id="e1",
        email="e@x.com",
        first_name="דן",
        last_name="כהן",
        role=roles.EMPLOYEE,
        network_id="n1",
        branch_id="b1",
        is_active=True,
    )
    defaults.update(kwargs)
    return User(**defaults)


def _svc():
    messages = MagicMock()
    occs = MagicMock()
    users = MagicMock()
    branches = MagicMock()
    branches.find_by_id.return_value = Branch(id="b1", network_id="n1", name="תל אביב")
    branches.list_branches.return_value = [Branch(id="b1", network_id="n1", name="תל אביב")]
    users.find_by_id.return_value = _user()
    return TaskMessageService(messages, occs, users, branches, None, MagicMock()), messages, occs, users


def test_manager_day_chats_lists_all_today_tasks():
    svc, messages, occs, _users = _svc()
    empty = SimpleNamespace(id="o1", title="ריק", status=task_status.PENDING, assignee_user_id="e1")
    with_msg = SimpleNamespace(id="o2", title="מדף", status=task_status.IN_PROGRESS, assignee_user_id="e1")
    occs.list_occurrences.return_value = [empty, with_msg]
    messages.last_messages_for.return_value = {
        "o2": SimpleNamespace(
            body="היי",
            photo_url=None,
            video_url=None,
            audio_url=None,
            file_url=None,
            created_at="2026-09-14T10:00:00+03:00",
        )
    }
    messages.unread_counts.return_value = {"o2": 2}
    actor = ActorContext("m1", roles.BRANCH_MANAGER, "n1", "b1")
    result = svc.list_manager_day_chats(actor, "e1")
    assert [i["id"] for i in result["items"]] == ["o2", "o1"]
    assert result["items"][0]["unread_count"] == 2
    assert result["items"][1]["last_preview"] is None


def test_manager_day_chats_denied_for_employee():
    svc, *_ = _svc()
    actor = ActorContext("e1", roles.EMPLOYEE, "n1", "b1")
    with pytest.raises(PermissionError):
        svc.list_manager_day_chats(actor, "e2")


def test_manager_all_day_chats_one_call_for_every_employee():
    svc, messages, occs, _users = _svc()
    occs.list_occurrences.return_value = [
        SimpleNamespace(id="o1", title="מדף", status=task_status.PENDING, assignee_user_id="e1"),
        SimpleNamespace(id="o2", title="קופה", status=task_status.PENDING, assignee_user_id="e2"),
        SimpleNamespace(id="o3", title="פתוחה", status=task_status.PENDING, assignee_user_id=None),
    ]
    messages.last_messages_for.return_value = {}
    messages.unread_counts.return_value = {"o2": 3}
    actor = ActorContext("m1", roles.BRANCH_MANAGER, "n1", "b1")
    result = svc.list_manager_all_day_chats(actor)
    by_id = {i["id"]: i for i in result["items"]}
    # Une seule requête d'occurrences, sans filtre d'assignee ; les tâches non assignées sont écartées.
    occs.list_occurrences.assert_called_once()
    assert occs.list_occurrences.call_args.kwargs["assignee_user_id"] is None
    assert set(by_id) == {"o1", "o2"}
    assert by_id["o2"]["assignee_user_id"] == "e2"
    assert by_id["o2"]["unread_count"] == 3


def test_manager_all_day_chats_names_each_oved_once():
    """Le nom de l'oved vient avec le fil (oved absent de la boîte directe) ; un seul accès par oved."""
    svc, messages, occs, users = _svc()
    occs.list_occurrences.return_value = [
        SimpleNamespace(id="o1", title="מדף", status=task_status.PENDING, assignee_user_id="e1"),
        SimpleNamespace(id="o2", title="קופה", status=task_status.PENDING, assignee_user_id="e1"),
        SimpleNamespace(id="o3", title="מחסן", status=task_status.PENDING, assignee_user_id="gone"),
    ]
    messages.last_messages_for.return_value = {}
    messages.unread_counts.return_value = {}
    users.find_by_id.side_effect = lambda uid: _user(id=uid) if uid == "e1" else None
    actor = ActorContext("m1", roles.BRANCH_MANAGER, "n1", "b1")
    by_id = {i["id"]: i for i in svc.list_manager_all_day_chats(actor)["items"]}
    assert by_id["o1"]["assignee_name"] == "דן כהן"
    assert by_id["o2"]["assignee_name"] == "דן כהן"
    assert by_id["o3"]["assignee_name"] is None
    assert users.find_by_id.call_count == 2


def test_manager_all_day_chats_denied_for_employee():
    svc, *_ = _svc()
    actor = ActorContext("e1", roles.EMPLOYEE, "n1", "b1")
    with pytest.raises(PermissionError):
        svc.list_manager_all_day_chats(actor)


def test_unread_today_by_assignees_sums_per_employee():
    svc, messages, occs, _users = _svc()
    occs.list_occurrences.return_value = [
        SimpleNamespace(id="o1", assignee_user_id="e1"),
        SimpleNamespace(id="o2", assignee_user_id="e1"),
        SimpleNamespace(id="o3", assignee_user_id="e2"),
    ]
    messages.unread_counts.return_value = {"o1": 1, "o2": 2, "o3": 4}
    actor = ActorContext("m1", roles.BRANCH_MANAGER, "n1", "b1")
    assert svc.unread_today_by_assignees(actor, ["e1", "e2"]) == {"e1": 3, "e2": 4}


def test_list_messages_marks_task_chat_read():
    svc, messages, occs, _users = _svc()
    reads = MagicMock()
    svc._reads = reads
    occs.find_by_id.return_value = SimpleNamespace(
        id="o1", branch_id="b1", assignee_user_id="e1"
    )
    messages.list_page.return_value = ([], False)
    actor = ActorContext("m1", roles.BRANCH_MANAGER, "n1", "b1")
    svc.list_messages(actor, "o1")
    reads.mark_read.assert_called_once_with("o1", "m1")
