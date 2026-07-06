"""Résolution et validation du périmètre utilisateur."""

from app.domain import roles
from app.domain.user_assignment import (
    UserScope,
    apply_inviter_defaults,
    assert_branch_in_inviter_network,
    resolve_user_scope,
)
from app.repositories.branch_repository import BranchRepository
from app.repositories.network_repository import NetworkRepository


class UserScopeService:
    def __init__(self, branch_repo: BranchRepository, network_repo: NetworkRepository):
        self._branch = branch_repo
        self._network = network_repo

    def resolve_for_role(
        self,
        role: str,
        *,
        network_id: str | None,
        branch_id: str | None,
        inviter_role: str | None = None,
        inviter_network_id: str | None = None,
        inviter_branch_id: str | None = None,
    ) -> UserScope:
        if inviter_role:
            network_id, branch_id = apply_inviter_defaults(
                role,
                network_id=network_id,
                branch_id=branch_id,
                inviter_role=inviter_role,
                inviter_network_id=inviter_network_id,
                inviter_branch_id=inviter_branch_id,
            )
        branch_network_id = self._lookup_branch_network(branch_id)
        if branch_network_id and inviter_role:
            assert_branch_in_inviter_network(branch_network_id, inviter_role, inviter_network_id)
        scope = resolve_user_scope(
            role,
            network_id=network_id,
            branch_id=branch_id,
            branch_network_id=branch_network_id,
        )
        if scope.network_id and not self._network.find_by_id(scope.network_id):
            raise ValueError("רשת לא נמצאה")
        if scope.branch_id and not self._branch.find_by_id(scope.branch_id):
            raise ValueError("סניף לא נמצא")
        if role == roles.NETWORK_MANAGER and inviter_role == roles.NETWORK_MANAGER:
            raise PermissionError("אין הרשאה להזמין מנהל רשת")
        return scope

    def _lookup_branch_network(self, branch_id: str | None) -> str | None:
        if not branch_id:
            return None
        branch = self._branch.find_by_id(branch_id)
        return branch.network_id if branch else None
