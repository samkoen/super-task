import pytest

from app.domain import roles
from app.domain.scope import ActorContext, assert_network_visible, can_manage_networks


def test_admin_can_manage_networks():
    actor = ActorContext("1", roles.ADMIN)
    assert can_manage_networks(actor) is True


def test_network_manager_cannot_manage_networks():
    actor = ActorContext("1", roles.NETWORK_MANAGER, network_id="r1")
    assert can_manage_networks(actor) is False


def test_network_manager_sees_own_network():
    actor = ActorContext("1", roles.NETWORK_MANAGER, network_id="r1")
    assert_network_visible(actor, "r1")


def test_network_manager_denied_other_network():
    actor = ActorContext("1", roles.NETWORK_MANAGER, network_id="r1")
    with pytest.raises(PermissionError):
        assert_network_visible(actor, "r2")
