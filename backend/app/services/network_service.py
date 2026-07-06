from app.db import mappers as mp
from app.domain import roles
from app.domain.scope import ActorContext, assert_network_visible, can_manage_networks
from app.repositories.network_repository import NetworkRepository


class NetworkService:
    def __init__(self, repo: NetworkRepository):
        self._repo = repo

    def list_networks(self, actor: ActorContext, *, name: str | None = None) -> list[dict]:
        if actor.role == roles.ADMIN:
            items = self._repo.list_all(name=name)
        elif actor.role == roles.NETWORK_MANAGER and actor.network_id:
            items = self._repo.list_all(name=name, network_ids=[actor.network_id])
        else:
            raise PermissionError("אין הרשאה לצפות ברשתות")
        return [mp.network_domain_to_api(r) for r in items]

    def create_network(self, actor: ActorContext, *, name: str) -> dict:
        if not can_manage_networks(actor):
            raise PermissionError("למנהלי מערכת בלבד")
        if not (name or "").strip():
            raise ValueError("נדרש שם רשת")
        return mp.network_domain_to_api(self._repo.create(name=name))

    def update_network(self, actor: ActorContext, id_: str, *, name: str, is_active: bool) -> dict:
        if not can_manage_networks(actor):
            raise PermissionError("למנהלי מערכת בלבד")
        row = self._repo.update(id_, name=name, is_active=is_active)
        if not row:
            raise ValueError("רשת לא נמצאה")
        return mp.network_domain_to_api(row)

    def get_network(self, actor: ActorContext, id_: str) -> dict:
        row = self._repo.find_by_id(id_)
        if not row:
            raise ValueError("רשת לא נמצאה")
        assert_network_visible(actor, row.id)
        return mp.network_domain_to_api(row)
