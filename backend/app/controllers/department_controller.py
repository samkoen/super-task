from typing import Any

from fastapi import APIRouter, Body, Depends, Query, Request
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from app.auth.actor import load_actor
from app.controllers.controller_helpers import handle_controller_errors
from app.dependencies import get_db
from app.repositories.branch_repository import BranchRepository
from app.repositories.department_repository import DepartmentRepository
from app.repositories.user_repository import UserRepository
from app.services.department_service import DepartmentService

router = APIRouter()


def get_service(db: Session = Depends(get_db)) -> DepartmentService:
    return DepartmentService(DepartmentRepository(db), BranchRepository(db))


@router.get("")
@handle_controller_errors
def list_departments(
    request: Request,
    branch_id: str | None = Query(None),
    name: str | None = Query(None),
    service: DepartmentService = Depends(get_service),
    db: Session = Depends(get_db),
):
    actor = load_actor(request, UserRepository(db))
    return service.list_departments(actor, branch_id=branch_id, name=name)


@router.post("", status_code=201)
@handle_controller_errors
def create_department(
    request: Request,
    data: dict[str, Any] | None = Body(default=None),
    service: DepartmentService = Depends(get_service),
    db: Session = Depends(get_db),
):
    actor = load_actor(request, UserRepository(db))
    if not data:
        return JSONResponse({"error": "חסרים נתונים"}, status_code=400)
    item = service.create_department(
        actor,
        branch_id=str(data.get("branch_id") or ""),
        name=str(data.get("name") or ""),
        sort_order=int(data.get("sort_order") or 0),
    )
    return {"message": "המחלקה נוצרה", "department": item}


@router.patch("/{department_id}")
@handle_controller_errors
def update_department(
    department_id: str,
    request: Request,
    data: dict[str, Any] | None = Body(default=None),
    service: DepartmentService = Depends(get_service),
    db: Session = Depends(get_db),
):
    actor = load_actor(request, UserRepository(db))
    payload = data or {}
    item = service.update_department(
        actor,
        department_id,
        name=str(payload.get("name") or ""),
        sort_order=int(payload.get("sort_order") or 0),
        is_active=bool(payload.get("is_active", True)),
    )
    return {"message": "המחלקה עודכנה", "department": item}
