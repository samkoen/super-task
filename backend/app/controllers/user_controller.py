"""Gestion des utilisateurs (admin)."""

from typing import Any

from fastapi import APIRouter, Body, Depends, Query, Request
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from app.auth.actor import load_actor
from app.auth.session_roles import require_admin_user_id
from app.controllers.controller_helpers import handle_controller_errors
from app.dependencies import get_db
from app.repositories.branch_repository import BranchRepository
from app.repositories.network_repository import NetworkRepository
from app.repositories.user_repository import UserRepository
from app.services.user_scope_service import UserScopeService
from app.services.user_service import UserService

router = APIRouter()


def get_user_service(db: Session = Depends(get_db)) -> UserService:
    branch_repo = BranchRepository(db)
    network_repo = NetworkRepository(db)
    scope = UserScopeService(branch_repo, network_repo)
    return UserService(UserRepository(db), scope, network_repo, branch_repo)


@router.get("")
@handle_controller_errors
def list_users(
    request: Request,
    role: str | None = Query(None),
    service: UserService = Depends(get_user_service),
):
    require_admin_user_id(request)
    return service.list_users(role=role)


@router.get("/team")
@handle_controller_errors
def list_team(
    request: Request,
    role: str | None = Query(None),
    service: UserService = Depends(get_user_service),
    db: Session = Depends(get_db),
):
    actor = load_actor(request, UserRepository(db))
    return service.list_team(actor, role=role)


@router.post("", status_code=201)
@handle_controller_errors
def create_user(
    request: Request,
    data: dict[str, Any] | None = Body(default=None),
    service: UserService = Depends(get_user_service),
):
    require_admin_user_id(request)
    if not data:
        return JSONResponse({"error": "חסרים נתונים"}, status_code=400)
    user = service.create_user(
        email=str(data.get("email") or "").strip(),
        password=str(data.get("password") or ""),
        first_name=str(data.get("first_name") or "").strip(),
        last_name=str(data.get("last_name") or "").strip(),
        role=str(data.get("role") or "").strip(),
        network_id=(str(data.get("network_id")).strip() if data.get("network_id") else None),
        branch_id=(str(data.get("branch_id")).strip() if data.get("branch_id") else None),
        skip_verification_email=bool(data.get("skip_verification_email")),
    )
    return {"message": "המשתמש נוצר — נשלח קישור אימות", "user": user}


@router.patch("/{user_id}/scope")
@handle_controller_errors
def update_user_scope(
    user_id: str,
    request: Request,
    data: dict[str, Any] | None = Body(default=None),
    service: UserService = Depends(get_user_service),
):
    require_admin_user_id(request)
    payload = data or {}
    user = service.update_user_scope(
        user_id,
        network_id=(str(payload.get("network_id")).strip() if payload.get("network_id") else None),
        branch_id=(str(payload.get("branch_id")).strip() if payload.get("branch_id") else None),
    )
    return {"message": "שיוך הרשת/סניף עודכן", "user": user}
