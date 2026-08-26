import pytest

from app.domain import roles
from app.domain.direct_chat import (
    can_access_conversation,
    clip_body,
    counterpart_role_for_scope,
    counterpart_roles_for_scope,
    downward_scope,
    is_scope_manager,
    message_preview,
    notify_recipient_ids,
    upward_scope,
)
from app.domain.scope import ActorContext


def _actor(**kwargs) -> ActorContext:
    defaults = dict(user_id="u1", role=roles.EMPLOYEE, network_id="n1", branch_id="b1")
    defaults.update(kwargs)
    return ActorContext(**defaults)


def test_scopes_follow_hierarchy():
    oved = _actor(role=roles.EMPLOYEE)
    bm = _actor(user_id="m1", role=roles.BRANCH_MANAGER)
    nm = _actor(user_id="n-m", role=roles.NETWORK_MANAGER, branch_id=None)
    assert downward_scope(oved) is None
    assert upward_scope(oved) == ("branch", "b1")
    assert downward_scope(bm) == ("branch", "b1")
    assert upward_scope(bm) == ("network", "n1")
    assert downward_scope(nm) == ("network", "n1")
    assert upward_scope(nm) is None
    assert counterpart_role_for_scope("branch") == roles.EMPLOYEE
    assert counterpart_role_for_scope("network") == roles.BRANCH_MANAGER
    assert counterpart_roles_for_scope("network") == frozenset({roles.BRANCH_MANAGER})
    assert counterpart_roles_for_scope("network", True) == frozenset(
        {roles.BRANCH_MANAGER, roles.EMPLOYEE}
    )


def test_shared_inbox_and_network_cannot_see_oved_chats():
    bm = _actor(user_id="m1", role=roles.BRANCH_MANAGER)
    other_bm = _actor(user_id="m2", role=roles.BRANCH_MANAGER)
    nm = _actor(user_id="nm", role=roles.NETWORK_MANAGER, branch_id=None)
    oved = _actor(user_id="e1")
    assert can_access_conversation(oved, scope="branch", scope_id="b1", counterpart_user_id="e1")
    assert can_access_conversation(bm, scope="branch", scope_id="b1", counterpart_user_id="e1")
    assert can_access_conversation(other_bm, scope="branch", scope_id="b1", counterpart_user_id="e1")
    assert not can_access_conversation(nm, scope="branch", scope_id="b1", counterpart_user_id="e1")
    assert not is_scope_manager(nm, "branch", "b1")
    assert can_access_conversation(bm, scope="network", scope_id="n1", counterpart_user_id="m1")
    assert can_access_conversation(nm, scope="network", scope_id="n1", counterpart_user_id="m1")
    assert not can_access_conversation(oved, scope="branch", scope_id="b1", counterpart_user_id="e2")
    assert not can_access_conversation(
        oved, scope="network", scope_id="n1", counterpart_user_id="e1"
    )
    assert can_access_conversation(
        oved,
        scope="network",
        scope_id="n1",
        counterpart_user_id="e1",
        manages_all_workers=True,
    )
    assert not can_access_conversation(
        oved,
        scope="network",
        scope_id="n2",
        counterpart_user_id="e1",
        manages_all_workers=True,
    )


def test_notify_shared_box_or_counterpart():
    assert notify_recipient_ids(
        sender_id="e1", counterpart_user_id="e1", manager_ids=["m1", "m2", "e1"]
    ) == {"m1", "m2"}
    assert notify_recipient_ids(
        sender_id="m1", counterpart_user_id="e1", manager_ids=["m1", "m2"]
    ) == {"e1"}


def test_preview_and_clip():
    assert message_preview("  שלום  ", None, None, None) == "שלום"
    assert message_preview(" ", "/p.jpg", None, None) == "📷"
    assert message_preview(None, None, "/v.mp4", None) == "🎥"
    assert message_preview(None, None, None, "/a.m4a") == "🎤"
    assert clip_body("  x  ") == "x"
    assert clip_body("   ") is None
    with pytest.raises(ValueError):
        clip_body("x" * 2001)
