from datetime import datetime, timezone
from unittest.mock import MagicMock, patch

from app.domain import roles
from app.domain.scope import ActorContext
from app.models.direct_conversation import DirectConversation
from app.models.direct_message import DirectMessage
from app.models.network import Network
from app.models.user import User
from app.services.direct_chat_service import DirectChatService


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


def _conv(**kwargs) -> DirectConversation:
    defaults = dict(
        id="c1",
        scope="branch",
        scope_id="b1",
        counterpart_user_id="e1",
        last_preview=None,
        last_at=None,
        last_sender_user_id=None,
        created_at="2026-08-26T08:00:00+03:00",
    )
    defaults.update(kwargs)
    return DirectConversation(**defaults)


def _svc(*, network=None):
    convs = MagicMock()
    messages = MagicMock()
    reads = MagicMock()
    users = MagicMock()
    users.on_break_since.return_value = None
    return (
        DirectChatService(convs, messages, reads, users, network_repo=network),
        convs,
        messages,
        reads,
        users,
    )


def _flag_on():
    repo = MagicMock()
    repo.find_by_id.return_value = Network(id="n1", name="Net", manages_all_workers=True)
    return repo


def test_oved_cannot_open_with_peer():
    svc, *_ = _svc()
    oved = ActorContext("e1", roles.EMPLOYEE, "n1", "b1")
    try:
        svc.open_with(oved, "e2")
        assert False
    except PermissionError:
        pass


def test_network_manager_cannot_open_oved_chat():
    svc, convs, _m, _r, users = _svc()
    users.find_by_id.return_value = _user()
    nm = ActorContext("nm", roles.NETWORK_MANAGER, "n1", None)
    try:
        svc.open_with(nm, "e1")
        assert False
    except PermissionError:
        pass
    convs.get_or_create.assert_not_called()


def test_network_manager_opens_oved_when_flag():
    svc, convs, messages, _r, users = _svc(network=_flag_on())
    users.find_by_id.return_value = _user()
    convs.get_or_create.return_value = _conv(scope="network", scope_id="n1")
    messages.list_page.return_value = ([], False)
    nm = ActorContext("nm", roles.NETWORK_MANAGER, "n1", None)
    opened = svc.open_with(nm, "e1")
    assert opened["conversation"]["id"] == "c1"
    convs.get_or_create.assert_called_with("network", "n1", "e1")


def test_network_manager_inbox_includes_ovdim_when_flag():
    svc, convs, messages, reads, users = _svc(network=_flag_on())
    bm = _user(id="m1", email="m@x.com", first_name="א", last_name="ב", role=roles.BRANCH_MANAGER)
    oved = _user()
    users.list_users.return_value = [oved, bm]
    convs.list_for_scope.return_value = []
    reads.last_read_at.return_value = None
    messages.unread_count.return_value = 0
    nm = ActorContext("nm", roles.NETWORK_MANAGER, "n1", None)
    inbox = svc.inbox(nm)
    ids = [item["counterpart_user_id"] for item in inbox["items"]]
    assert ids == ["m1", "e1"]


def test_oved_opens_network_thread_when_flag_and_no_bm():
    svc, convs, messages, _r, users = _svc(network=_flag_on())
    users.list_users.return_value = []
    convs.get_or_create.return_value = _conv(id="cn", scope="network", scope_id="n1")
    messages.list_page.return_value = ([], False)
    oved = ActorContext("e1", roles.EMPLOYEE, "n1", "b1")
    opened = svc.open_mine(oved)
    convs.get_or_create.assert_called_with("network", "n1", "e1")
    assert opened["conversation"]["id"] == "cn"


def test_branch_manager_opens_oved_and_lists_inbox():
    svc, convs, messages, reads, users = _svc()
    oved = _user()
    users.find_by_id.return_value = oved
    users.list_users.return_value = [oved]
    users.find_network_manager.return_value = _user(
        id="nm", email="n@x.com", first_name="רשת", last_name="לוי", role=roles.NETWORK_MANAGER, branch_id=None
    )
    convs.get_or_create.return_value = _conv()
    convs.list_for_scope.return_value = [_conv()]
    convs.find.return_value = None
    messages.unread_count.return_value = 2
    reads.last_read_at.return_value = None
    messages.list_page.return_value = ([], False)
    bm = ActorContext("m1", roles.BRANCH_MANAGER, "n1", "b1")
    opened = svc.open_with(bm, "e1")
    assert opened["conversation"]["id"] == "c1"
    inbox = svc.inbox(bm)
    assert inbox["items"][0]["unread_count"] == 2
    assert inbox["up"]["counterpart_role"] == roles.NETWORK_MANAGER


@patch("app.services.direct_chat_service.notify_direct_message")
def test_post_rejects_empty_and_notifies_shared_box(_notify):
    svc, convs, messages, reads, users = _svc()
    convs.get.return_value = _conv()
    users.find_by_id.return_value = _user()
    users.list_users.return_value = [
        _user(id="m1", email="m1@x.com", first_name="א", last_name="א", role=roles.BRANCH_MANAGER),
        _user(id="m2", email="m2@x.com", first_name="ב", last_name="ב", role=roles.BRANCH_MANAGER),
    ]
    oved = ActorContext("e1", roles.EMPLOYEE, "n1", "b1")
    try:
        svc.post_message(oved, "c1", body="  ")
        assert False
    except ValueError:
        pass
    created = DirectMessage(
        id="msg1",
        conversation_id="c1",
        sender_user_id="e1",
        body="שלום",
        photo_url=None,
        video_url=None,
        audio_url=None,
        created_at="2026-08-26T08:01:00+03:00",
    )
    messages.create.return_value = created
    result = svc.post_message(oved, "c1", body="שלום")
    assert result["message"]["body"] == "שלום"
    assert "recipient_break" not in result


@patch("app.services.direct_chat_service.notify_direct_message")
def test_manager_post_includes_break_alert(_notify):
    svc, convs, messages, reads, users = _svc()
    convs.get.return_value = _conv()
    users.find_by_id.return_value = _user()
    users.list_users.return_value = [
        _user(id="m1", email="m1@x.com", first_name="א", last_name="א", role=roles.BRANCH_MANAGER),
    ]
    start = datetime(2026, 8, 28, 10, 0, tzinfo=timezone.utc)
    users.on_break_since.return_value = start
    messages.create.return_value = DirectMessage(
        id="msg1",
        conversation_id="c1",
        sender_user_id="m1",
        body="דחוף",
        photo_url=None,
        video_url=None,
        audio_url=None,
        created_at="2026-08-28T10:15:00+00:00",
    )
    bm = ActorContext("m1", roles.BRANCH_MANAGER, "n1", "b1")
    result = svc.post_message(bm, "c1", body="דחוף")
    assert result["recipient_user_id"] == "e1"
    assert result["recipient_break"]["on_break"] is True

@patch("app.services.direct_chat_service.notify_direct_message")
def test_broadcast_posts_to_each_oved(_notify):
    svc, convs, messages, reads, users = _svc()
    users.list_users.return_value = [_user(id="e1"), _user(id="e2", email="e2@x.com", first_name="מ")]
    convs.get_or_create.side_effect = lambda scope, sid, uid: _conv(id=f"c-{uid}", counterpart_user_id=uid)
    messages.create.return_value = DirectMessage(
        id="m",
        conversation_id="c-e1",
        sender_user_id="m1",
        body="מחר 7",
        photo_url=None,
        video_url=None,
        audio_url=None,
        created_at="2026-08-26T08:01:00+03:00",
    )
    bm = ActorContext("m1", roles.BRANCH_MANAGER, "n1", "b1")
    result = svc.broadcast(bm, body="מחר 7")
    assert result["count"] == 2
    assert convs.get_or_create.call_count == 2


def test_oved_inbox_counts_unread_on_mine():
    svc, convs, messages, reads, users = _svc()
    users.list_users.return_value = [
        _user(id="m1", email="m@x.com", first_name="א", last_name="ב", role=roles.BRANCH_MANAGER)
    ]
    convs.find.return_value = _conv()
    reads.last_read_at.return_value = None
    messages.unread_count.return_value = 3
    oved = ActorContext("e1", roles.EMPLOYEE, "n1", "b1")
    inbox = svc.inbox(oved)
    assert inbox["items"] == []
    assert inbox["unread_count"] == 3
    assert inbox["managers"][0]["scope"] == "branch"


def test_list_messages_returns_capped_page():
    svc, convs, messages, _r, users = _svc()
    convs.get.return_value = _conv()
    users.find_by_id.return_value = _user()
    created = DirectMessage(
        id="msg1",
        conversation_id="c1",
        sender_user_id="e1",
        body="שלום",
        photo_url=None,
        video_url=None,
        audio_url=None,
        created_at="2026-08-26T08:01:00+03:00",
    )
    messages.list_page.return_value = ([created], True)
    bm = ActorContext("m1", roles.BRANCH_MANAGER, "n1", "b1")
    page = svc.list_messages(bm, "c1", limit=2, before="old")
    assert page["has_more"] is True
    assert page["messages"][0]["body"] == "שלום"
    messages.list_page.assert_called_once_with("c1", limit=2, before_id="old")
    messages.list_page.reset_mock()
    svc.list_messages(bm, "c1", limit=999)
    messages.list_page.assert_called_once_with("c1", limit=50, before_id=None)
