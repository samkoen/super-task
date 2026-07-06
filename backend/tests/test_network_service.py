from unittest.mock import MagicMock

import pytest

from app.domain.scope import ActorContext
from app.domain import roles
from app.models.network import Network
from app.services.network_service import NetworkService


def test_create_network_admin_only():
    repo = MagicMock()
    service = NetworkService(repo)
    actor = ActorContext("u1", roles.NETWORK_MANAGER, network_id="r1")

    with pytest.raises(PermissionError):
        service.create_network(actor, name="Test")


def test_list_networks_network_manager_scoped():
    repo = MagicMock()
    network = Network(id="r1", name="Net")
    repo.list_all.return_value = [network]
    service = NetworkService(repo)
    actor = ActorContext("u1", roles.NETWORK_MANAGER, network_id="r1")

    result = service.list_networks(actor)
    repo.list_all.assert_called_once_with(name=None, network_ids=["r1"])
    assert result[0]["name"] == "Net"
