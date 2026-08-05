from typing import Any

from fastapi import APIRouter, Body, Depends, Query, Request
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from app.auth.actor import load_actor
from app.controllers.controller_helpers import handle_controller_errors
from app.dependencies import get_db
from app.repositories.branch_repository import BranchRepository
from app.repositories.department_repository import DepartmentRepository
from app.repositories.promotion_stage_repository import PromotionStageRepository
from app.repositories.user_repository import UserRepository
from app.services.promotion_stage_service import PromotionStageService

router = APIRouter()


def get_service(db: Session = Depends(get_db)) -> PromotionStageService:
    return PromotionStageService(
        PromotionStageRepository(db),
        DepartmentRepository(db),
        BranchRepository(db),
    )


@router.get("")
@handle_controller_errors
def list_stages(
    request: Request,
    branch_id: str = Query(...),
    service: PromotionStageService = Depends(get_service),
    db: Session = Depends(get_db),
):
    actor = load_actor(request, UserRepository(db))
    return service.list_for_branch(actor, branch_id)


@router.get("/analysis")
@handle_controller_errors
def analysis(
    request: Request,
    branch_id: str = Query(...),
    service: PromotionStageService = Depends(get_service),
    db: Session = Depends(get_db),
):
    actor = load_actor(request, UserRepository(db))
    return service.analysis_rows(actor, branch_id)


@router.post("", status_code=201)
@handle_controller_errors
def create_stage(
    request: Request,
    data: dict[str, Any] | None = Body(default=None),
    service: PromotionStageService = Depends(get_service),
    db: Session = Depends(get_db),
):
    actor = load_actor(request, UserRepository(db))
    if not data:
        return JSONResponse({"error": "חסרים נתונים"}, status_code=400)
    item = service.create(
        actor,
        branch_id=str(data.get("branch_id") or ""),
        department_id=str(data.get("department_id") or ""),
        name=str(data.get("name") or ""),
        location_label=str(data.get("location_label") or ""),
        assignee_user_id=str(data.get("assignee_user_id") or "") or None,
        lead_product_name=str(data.get("lead_product_name") or ""),
        stock_pct=float(data.get("stock_pct") if data.get("stock_pct") is not None else 100),
        signage_status=str(data.get("signage_status") or "ok"),
    )
    return {"message": "במת המבצע נוצרה", "stage": item}


@router.patch("/{stage_id}/stock")
@handle_controller_errors
def update_stock(
    stage_id: str,
    request: Request,
    data: dict[str, Any] | None = Body(default=None),
    service: PromotionStageService = Depends(get_service),
    db: Session = Depends(get_db),
):
    actor = load_actor(request, UserRepository(db))
    payload = data or {}
    if "stock_pct" not in payload:
        return JSONResponse({"error": "חסר אחוז מלאי"}, status_code=400)
    item = service.update_stock(
        actor,
        stage_id,
        stock_pct=float(payload["stock_pct"]),
        signage_status=str(payload["signage_status"]) if "signage_status" in payload else None,
    )
    return {"message": "מלאי הבמה עודכן", "stage": item}
