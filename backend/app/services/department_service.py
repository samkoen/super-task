from app.db import mappers as mp
from app.domain import roles
from app.domain.scope import ActorContext, can_manage_departments
from app.repositories.branch_repository import BranchRepository
from app.repositories.department_repository import DepartmentRepository


class DepartmentService:
    def __init__(self, department_repo: DepartmentRepository, branch_repo: BranchRepository):
        self._department = department_repo
        self._branch = branch_repo

    def list_departments(
        self, actor: ActorContext, *, branch_id: str | None = None, name: str | None = None
    ) -> list[dict]:
        if not can_manage_departments(actor):
            raise PermissionError("אין הרשאה לצפות במחלקות")
        branch_ids = self._visible_branch_ids(actor)
        if actor.role == roles.BRANCH_MANAGER and actor.branch_id:
            branch_id = actor.branch_id
        items = self._department.list_departments(branch_id=branch_id, name=name, branch_ids=branch_ids)
        return [self._to_api(m) for m in items]

    def create_department(
        self, actor: ActorContext, *, branch_id: str, name: str, sort_order: int = 0
    ) -> dict:
        self._assert_branch_access(actor, branch_id)
        if not (name or "").strip():
            raise ValueError("נדרש שם מחלקה")
        if not self._branch.find_by_id(branch_id):
            raise ValueError("סניף לא נמצא")
        m = self._department.create(branch_id=branch_id, name=name, sort_order=sort_order)
        return self._to_api(m)

    def update_department(
        self,
        actor: ActorContext,
        id_: str,
        *,
        name: str,
        sort_order: int,
        is_active: bool,
    ) -> dict:
        existing = self._department.find_by_id(id_)
        if not existing:
            raise ValueError("מחלקה לא נמצאה")
        self._assert_branch_access(actor, existing.branch_id)
        updated = self._department.update(id_, name=name, sort_order=sort_order, is_active=is_active)
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

    def _assert_branch_access(self, actor: ActorContext, branch_id: str) -> None:
        branch = self._branch.find_by_id(branch_id)
        if not branch:
            raise ValueError("סניף לא נמצא")
        from app.domain.scope import assert_branch_visible

        assert_branch_visible(actor, branch.network_id, branch.id)

    def _to_api(self, m) -> dict:
        branch_name = self._department.get_branch_name(m.branch_id)
        return mp.department_domain_to_api(m, branch_name=branch_name)
