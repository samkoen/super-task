"""Gestion des utilisateurs (admin)."""

from typing import Any

from fastapi import APIRouter, Body, Depends, Query, Request
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from app.auth.actor import load_actor, require_admin_actor
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
    db: Session = Depends(get_db),
):
    require_admin_actor(request, UserRepository(db))
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


@router.post("/team", status_code=201)
@handle_controller_errors
def create_team_employee(
    request: Request,
    data: dict[str, Any] | None = Body(default=None),
    service: UserService = Depends(get_user_service),
    db: Session = Depends(get_db),
):
    actor = load_actor(request, UserRepository(db))
    if not data:
        return JSONResponse({"error": "חסרים נתונים"}, status_code=400)
    user = service.create_team_employee(
        actor,
        email=str(data.get("email") or "").strip(),
        password=str(data.get("password") or ""),
        first_name=str(data.get("first_name") or "").strip(),
        last_name=str(data.get("last_name") or "").strip(),
        phone=(str(data.get("phone")).strip() if data.get("phone") else None),
        job_function=(str(data.get("job_function")).strip() if data.get("job_function") else None),
        branch_id=(str(data.get("branch_id")).strip() if data.get("branch_id") else None),
        preferred_language=(str(data.get("preferred_language")).strip() if data.get("preferred_language") else None),
    )
    return {"message": "העובד נוצר — נשלח קישור אימות", "user": user}


@router.patch("/team/{user_id}")
@handle_controller_errors
def update_team_employee(
    user_id: str,
    request: Request,
    data: dict[str, Any] | None = Body(default=None),
    service: UserService = Depends(get_user_service),
    db: Session = Depends(get_db),
):
    actor = load_actor(request, UserRepository(db))
    payload = data or {}
    user = service.update_team_employee(
        actor,
        user_id,
        email=str(payload.get("email") or "").strip(),
        first_name=str(payload.get("first_name") or "").strip(),
        last_name=str(payload.get("last_name") or "").strip(),
        phone=(str(payload.get("phone")).strip() if payload.get("phone") else None),
        job_function=(str(payload.get("job_function")).strip() if payload.get("job_function") else None),
        password=(str(payload.get("password")) if payload.get("password") else None),
        preferred_language=(str(payload.get("preferred_language")).strip() if payload.get("preferred_language") else None),
    )
    return {"message": "פרטי העובד עודכנו", "user": user}


@router.delete("/team/{user_id}")
@handle_controller_errors
def deactivate_team_employee(
    user_id: str,
    request: Request,
    service: UserService = Depends(get_user_service),
    db: Session = Depends(get_db),
):
    actor = load_actor(request, UserRepository(db))
    user = service.deactivate_team_employee(actor, user_id)
    return {"message": "העובד הושבת", "user": user}


@router.patch("/team/{user_id}/access")
@handle_controller_errors
def set_team_employee_access(
    user_id: str,
    request: Request,
    data: dict[str, Any] | None = Body(default=None),
    service: UserService = Depends(get_user_service),
    db: Session = Depends(get_db),
):
    actor = load_actor(request, UserRepository(db))
    payload = data or {}
    is_active = payload.get("is_active")
    if not isinstance(is_active, bool):
        return JSONResponse({"error": "חסר סטטוס גישה"}, status_code=400)
    user = service.set_team_employee_access(actor, user_id, is_active=is_active)
    message = "הגישה לאפליקציה הופעלה" if is_active else "הגישה לאפליקציה הושבתה"
    return {"message": message, "user": user}


@router.post("/team/{user_id}/reset-password")
@handle_controller_errors
def reset_team_employee_password(
    user_id: str,
    request: Request,
    data: dict[str, Any] | None = Body(default=None),
    service: UserService = Depends(get_user_service),
    db: Session = Depends(get_db),
):
    actor = load_actor(request, UserRepository(db))
    payload = data or {}
    user = service.reset_team_employee_password(
        actor,
        user_id,
        password=str(payload.get("password") or ""),
    )
    return {"message": "סיסמת העובד עודכנה", "user": user}


@router.post("", status_code=201)
@handle_controller_errors
def create_user(
    request: Request,
    data: dict[str, Any] | None = Body(default=None),
    service: UserService = Depends(get_user_service),
    db: Session = Depends(get_db),
):
    require_admin_actor(request, UserRepository(db))
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
    db: Session = Depends(get_db),
):
    require_admin_actor(request, UserRepository(db))
    payload = data or {}
    user = service.update_user_scope(
        user_id,
        network_id=(str(payload.get("network_id")).strip() if payload.get("network_id") else None),
        branch_id=(str(payload.get("branch_id")).strip() if payload.get("branch_id") else None),
    )
    return {"message": "שיוך הרשת/סניף עודכן", "user": user}
