from typing import Any

from fastapi import APIRouter, Body, Depends, Query, Request
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from app.auth.actor import load_actor
from app.controllers.controller_helpers import handle_controller_errors
from app.dependencies import get_db
from app.repositories.branch_repository import BranchRepository
from app.repositories.network_repository import NetworkRepository
from app.repositories.user_repository import UserRepository
from app.services.branch_service import BranchService

router = APIRouter()


def get_service(db: Session = Depends(get_db)) -> BranchService:
    return BranchService(BranchRepository(db), NetworkRepository(db))


@router.get("")
@handle_controller_errors
def list_branches(
    request: Request,
    network_id: str | None = Query(None),
    name: str | None = Query(None),
    service: BranchService = Depends(get_service),
    db: Session = Depends(get_db),
):
    actor = load_actor(request, UserRepository(db))
    return service.list_branches(actor, network_id=network_id, name=name)


@router.post("", status_code=201)
@handle_controller_errors
def create_branch(
    request: Request,
    data: dict[str, Any] | None = Body(default=None),
    service: BranchService = Depends(get_service),
    db: Session = Depends(get_db),
):
    actor = load_actor(request, UserRepository(db))
    if not data:
        return JSONResponse({"error": "חסרים נתונים"}, status_code=400)
    item = service.create_branch(
        actor,
        network_id=str(data.get("network_id") or ""),
        name=str(data.get("name") or ""),
        address=str(data.get("address") or ""),
        city=str(data.get("city") or ""),
        postal_code=str(data.get("postal_code") or ""),
    )
    return {"message": "הסניף נוצר", "branch": item}


@router.patch("/{branch_id}")
@handle_controller_errors
def update_branch(
    branch_id: str,
    request: Request,
    data: dict[str, Any] | None = Body(default=None),
    service: BranchService = Depends(get_service),
    db: Session = Depends(get_db),
):
    actor = load_actor(request, UserRepository(db))
    payload = data or {}
    item = service.update_branch(
        actor,
        branch_id,
        name=str(payload.get("name") or ""),
        address=str(payload.get("address") or ""),
        city=str(payload.get("city") or ""),
        postal_code=str(payload.get("postal_code") or ""),
        is_active=bool(payload.get("is_active", True)),
    )
    return {"message": "הסניף עודכן", "branch": item}
