from app.db import mappers as mp
from app.domain.promotion_stage import can_create_refill_task, needs_urgent_refill
from app.domain.scope import ActorContext, assert_branch_visible, can_manage_departments
from app.repositories.branch_repository import BranchRepository
from app.repositories.department_repository import DepartmentRepository
from app.repositories.promotion_stage_repository import PromotionStageRepository


class PromotionStageService:
    def __init__(
        self,
        stage_repo: PromotionStageRepository,
        department_repo: DepartmentRepository,
        branch_repo: BranchRepository,
    ):
        self._stages = stage_repo
        self._department = department_repo
        self._branch = branch_repo

    def list_for_branch(self, actor: ActorContext, branch_id: str) -> list[dict]:
        self._assert_branch(actor, branch_id)
        return [self._to_api(s) for s in self._stages.list_for_branch(branch_id)]

    def create(
        self,
        actor: ActorContext,
        *,
        branch_id: str,
        department_id: str,
        name: str,
        location_label: str = "",
        assignee_user_id: str | None = None,
        lead_product_name: str = "",
        stock_pct: float = 100.0,
        signage_status: str = "ok",
    ) -> dict:
        if not can_manage_departments(actor):
            raise PermissionError("אין הרשאה ליצור במת מבצע")
        self._assert_branch(actor, branch_id)
        self._assert_department_on_branch(department_id, branch_id)
        if not (name or "").strip():
            raise ValueError("נדרש שם במה")
        stage = self._stages.create(
            branch_id=branch_id,
            department_id=department_id,
            name=name,
            location_label=location_label,
            assignee_user_id=assignee_user_id or None,
            lead_product_name=lead_product_name,
            stock_pct=stock_pct,
            signage_status=signage_status,
        )
        return self._to_api(stage)

    def update_stock(
        self,
        actor: ActorContext,
        stage_id: str,
        *,
        stock_pct: float,
        signage_status: str | None = None,
    ) -> dict:
        stage = self._stages.find_by_id(stage_id)
        if not stage:
            raise ValueError("במה לא נמצאה")
        self._assert_branch(actor, stage.branch_id)
        updated = self._stages.update_stock(
            stage_id, stock_pct=stock_pct, signage_status=signage_status
        )
        assert updated is not None
        return self._to_api(updated)

    def analysis_rows(self, actor: ActorContext, branch_id: str) -> list[dict]:
        """שורות ניתוח מצב לפי במות (SPEC חלק ד')."""
        rows = self.list_for_branch(actor, branch_id)
        for row in rows:
            row["refill_suggested"] = can_create_refill_task(
                stock_pct=row.get("stock_pct"),
                open_refill_exists=False,
            )
            row["urgent"] = needs_urgent_refill(row.get("stock_pct"))
        return rows

    def _assert_branch(self, actor: ActorContext, branch_id: str) -> None:
        branch = self._branch.find_by_id(branch_id)
        if not branch:
            raise ValueError("סניף לא נמצא")
        assert_branch_visible(actor, branch.network_id, branch.id)

    def _assert_department_on_branch(self, department_id: str, branch_id: str) -> None:
        dept = self._department.find_by_id(department_id)
        if not dept:
            raise ValueError("מחלקה לא נמצאה")
        if dept.branch_id != branch_id:
            raise ValueError("המחלקה אינה שייכת לסניף")

    def _to_api(self, stage) -> dict:
        return mp.promotion_stage_domain_to_api(
            stage,
            department_name=self._stages.get_department_name(stage.department_id),
            assignee_name=self._stages.get_user_name(stage.assignee_user_id),
            open_tasks=self._stages.count_open_tasks_for_assignee(stage.assignee_user_id),
        )
