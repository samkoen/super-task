from app.db import mappers as mp
from app.domain import roles
from app.domain.scope import ActorContext, can_manage_departments
from app.repositories.branch_repository import BranchRepository
from app.repositories.department_repository import DepartmentRepository
from app.repositories.product_repository import ProductRepository


class ProductService:
    def __init__(
        self,
        product_repo: ProductRepository,
        department_repo: DepartmentRepository,
        branch_repo: BranchRepository,
    ):
        self._product = product_repo
        self._department = department_repo
        self._branch = branch_repo

    def list_products(
        self, actor: ActorContext, *, department_id: str | None = None, name: str | None = None
    ) -> list[dict]:
        if not can_manage_departments(actor):
            raise PermissionError("אין הרשאה לצפות במוצרים")
        department_ids = self._visible_department_ids(actor)
        items = self._product.list_products(
            department_id=department_id, name=name, department_ids=department_ids
        )
        return [self._to_api(p) for p in items]

    def create_product(
        self, actor: ActorContext, *, department_id: str, name: str, sku: str = ""
    ) -> dict:
        self._assert_department_access(actor, department_id)
        if not (name or "").strip():
            raise ValueError("נדרש שם מוצר")
        if not self._department.find_by_id(department_id):
            raise ValueError("מחלקה לא נמצאה")
        p = self._product.create(department_id=department_id, name=name, sku=sku)
        return self._to_api(p)

    def update_product(
        self, actor: ActorContext, id_: str, *, name: str, sku: str, is_active: bool
    ) -> dict:
        existing = self._product.find_by_id(id_)
        if not existing:
            raise ValueError("מוצר לא נמצא")
        self._assert_department_access(actor, existing.department_id)
        updated = self._product.update(id_, name=name, sku=sku, is_active=is_active)
        assert updated is not None
        return self._to_api(updated)

    def _visible_department_ids(self, actor: ActorContext) -> list[str] | None:
        if actor.role == roles.ADMIN:
            return None
        branch_ids = self._visible_branch_ids(actor)
        if branch_ids is None:
            return None
        if not branch_ids:
            return []
        return [m.id for m in self._department.list_departments(branch_ids=branch_ids)]

    def _visible_branch_ids(self, actor: ActorContext) -> list[str] | None:
        if actor.role == roles.ADMIN:
            return None
        if actor.role == roles.NETWORK_MANAGER and actor.network_id:
            return [s.id for s in self._branch.list_branches(network_id=actor.network_id)]
        if actor.role == roles.BRANCH_MANAGER and actor.branch_id:
            return [actor.branch_id]
        return []

    def _assert_department_access(self, actor: ActorContext, department_id: str) -> None:
        m = self._department.find_by_id(department_id)
        if not m:
            raise ValueError("מחלקה לא נמצאה")
        branch = self._branch.find_by_id(m.branch_id)
        if not branch:
            raise ValueError("סניף לא נמצא")
        from app.domain.scope import assert_branch_visible

        assert_branch_visible(actor, branch.network_id, branch.id)

    def _to_api(self, p) -> dict:
        department_name = self._product.get_department_name(p.department_id)
        return mp.product_domain_to_api(p, department_name=department_name)
