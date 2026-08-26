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

    def create_network(
        self, actor: ActorContext, *, name: str, manages_all_workers: bool = False
    ) -> dict:
        if not can_manage_networks(actor):
            raise PermissionError("למנהלי מערכת בלבד")
        if not (name or "").strip():
            raise ValueError("נדרש שם רשת")
        return mp.network_domain_to_api(
            self._repo.create(name=name, manages_all_workers=manages_all_workers)
        )

    def update_network(
        self,
        actor: ActorContext,
        id_: str,
        *,
        name: str | None = None,
        is_active: bool | None = None,
        manages_all_workers: bool | None = None,
    ) -> dict:
        row = self._repo.find_by_id(id_)
        if not row:
            raise ValueError("רשת לא נמצאה")
        if can_manage_networks(actor):
            return self._save(id_, name=name, is_active=is_active, manages_all_workers=manages_all_workers)
        if self._nm_may_set_flag(actor, id_, manages_all_workers):
            return self._save(id_, manages_all_workers=manages_all_workers)
        raise PermissionError("אין הרשאה לעדכן רשת")

    def get_network(self, actor: ActorContext, id_: str) -> dict:
        row = self._repo.find_by_id(id_)
        if not row:
            raise ValueError("רשת לא נמצאה")
        assert_network_visible(actor, row.id)
        return mp.network_domain_to_api(row)

    def _nm_may_set_flag(self, actor: ActorContext, id_: str, flag: bool | None) -> bool:
        return (
            actor.role == roles.NETWORK_MANAGER
            and actor.network_id == id_
            and flag is not None
        )

    def _save(self, id_: str, **fields) -> dict:
        row = self._repo.update(id_, **fields)
        if not row:
            raise ValueError("רשת לא נמצאה")
        return mp.network_domain_to_api(row)
