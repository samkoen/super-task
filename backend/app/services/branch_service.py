from app.db import mappers as mp
from app.domain import roles
from app.domain.scope import ActorContext, can_manage_branches
from app.repositories.branch_repository import BranchRepository
from app.repositories.network_repository import NetworkRepository


class BranchService:
    def __init__(self, branch_repo: BranchRepository, network_repo: NetworkRepository):
        self._branch = branch_repo
        self._network = network_repo

    def list_branches(
        self, actor: ActorContext, *, network_id: str | None = None, name: str | None = None
    ) -> list[dict]:
        if not can_manage_branches(actor):
            raise PermissionError("אין הרשאה לצפות בסניפים")
        branch_ids = self._visible_branch_ids(actor)
        if actor.role == roles.NETWORK_MANAGER and actor.network_id:
            network_id = actor.network_id
        items = self._branch.list_branches(network_id=network_id, name=name, branch_ids=branch_ids)
        return [self._to_api(s) for s in items]

    def create_branch(
        self,
        actor: ActorContext,
        *,
        network_id: str,
        name: str,
        address: str = "",
        city: str = "",
        postal_code: str = "",
    ) -> dict:
        self._assert_can_write(actor, network_id)
        if not (name or "").strip():
            raise ValueError("נדרש שם סניף")
        if not self._network.find_by_id(network_id):
            raise ValueError("רשת לא נמצאה")
        branch = self._branch.create(
            network_id=network_id,
            name=name,
            address=address,
            city=city,
            postal_code=postal_code,
        )
        return self._to_api(branch)

    def update_branch(
        self,
        actor: ActorContext,
        id_: str,
        *,
        name: str,
        address: str,
        city: str,
        postal_code: str,
        is_active: bool,
    ) -> dict:
        existing = self._branch.find_by_id(id_)
        if not existing:
            raise ValueError("סניף לא נמצא")
        self._assert_can_write(actor, existing.network_id, branch_id=existing.id)
        updated = self._branch.update(
            id_,
            name=name,
            address=address,
            city=city,
            postal_code=postal_code,
            is_active=is_active,
        )
        assert updated is not None
        return self._to_api(updated)

    def _visible_branch_ids(self, actor: ActorContext) -> list[str] | None:
        if actor.role == roles.ADMIN:
            return None
        if actor.role == roles.NETWORK_MANAGER and actor.network_id:
            return [s.id for s in self._branch.list_branches(network_id=actor.network_id)]
        if actor.role == roles.BRANCH_MANAGER and actor.branch_id:
            return [actor.branch_id]
        return []

    def _assert_can_write(
        self, actor: ActorContext, network_id: str, branch_id: str | None = None
    ) -> None:
        if actor.role == roles.ADMIN:
            return
        if actor.role == roles.NETWORK_MANAGER and actor.network_id == network_id:
            return
        if actor.role == roles.BRANCH_MANAGER and branch_id and actor.branch_id == branch_id:
            return
        raise PermissionError("אין הרשאה לנהל סניף זה")

    def _to_api(self, branch) -> dict:
        network_name = self._branch.get_network_name(branch.network_id)
        return mp.branch_domain_to_api(branch, network_name=network_name)
