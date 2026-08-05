from sqlalchemy import select
from sqlalchemy.orm import Session

import app.db.models as orm
from app.db import mappers as mp
from app.models.promotion_stage import PromotionStage


class PromotionStageRepository:
    def __init__(self, db: Session):
        self._db = db

    def find_by_id(self, id_: str) -> PromotionStage | None:
        try:
            return mp.promotion_stage_orm_to_domain(
                self._db.get(orm.PromotionStage, mp.parse_uuid(id_))
            )
        except ValueError:
            return None

    def list_for_branch(self, branch_id: str, *, active_only: bool = True) -> list[PromotionStage]:
        q = (
            select(orm.PromotionStage)
            .where(orm.PromotionStage.branch_id == mp.parse_uuid(branch_id))
            .order_by(orm.PromotionStage.name.asc())
        )
        if active_only:
            q = q.where(orm.PromotionStage.is_active.is_(True))
        rows = self._db.execute(q).scalars().all()
        return [s for row in rows if (s := mp.promotion_stage_orm_to_domain(row))]

    def create(
        self,
        *,
        branch_id: str,
        department_id: str,
        name: str,
        location_label: str = "",
        assignee_user_id: str | None = None,
        lead_product_name: str = "",
        stock_pct: float = 100.0,
        signage_status: str = "ok",
    ) -> PromotionStage:
        import uuid

        row = orm.PromotionStage(
            id=uuid.uuid4(),
            branch_id=mp.parse_uuid(branch_id),
            department_id=mp.parse_uuid(department_id),
            name=name.strip(),
            location_label=(location_label or "").strip(),
            assignee_user_id=mp.parse_uuid(assignee_user_id) if assignee_user_id else None,
            lead_product_name=(lead_product_name or "").strip(),
            stock_pct=float(stock_pct),
            signage_status=signage_status or "ok",
            is_active=True,
        )
        self._db.add(row)
        self._db.flush()
        out = mp.promotion_stage_orm_to_domain(row)
        assert out is not None
        return out

    def update_stock(self, id_: str, *, stock_pct: float, signage_status: str | None = None) -> PromotionStage | None:
        row = self._db.get(orm.PromotionStage, mp.parse_uuid(id_))
        if not row:
            return None
        row.stock_pct = float(stock_pct)
        if signage_status is not None:
            row.signage_status = signage_status
        self._db.flush()
        return mp.promotion_stage_orm_to_domain(row)

    def get_department_name(self, department_id: str) -> str | None:
        row = self._db.get(orm.Department, mp.parse_uuid(department_id))
        return row.name if row else None

    def get_user_name(self, user_id: str | None) -> str | None:
        if not user_id:
            return None
        row = self._db.get(orm.User, mp.parse_uuid(user_id))
        if not row:
            return None
        return f"{row.first_name} {row.last_name}".strip()

    def count_open_tasks_for_assignee(self, assignee_user_id: str | None) -> int:
        if not assignee_user_id:
            return 0
        q = select(orm.TaskOccurrence).where(
            orm.TaskOccurrence.assignee_user_id == mp.parse_uuid(assignee_user_id),
            orm.TaskOccurrence.status.in_(["pending", "in_progress", "overdue", "awaiting_response"]),
        )
        return len(self._db.execute(q).scalars().all())
