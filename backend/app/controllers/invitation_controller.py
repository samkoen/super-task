"""Invitations utilisateurs (flux B)."""

from typing import Any

from fastapi import APIRouter, Body, Depends, HTTPException, Query, Request
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from app.auth.session_roles import require_manager
from app.dependencies import get_db
from app.repositories.branch_repository import BranchRepository
from app.repositories.invitation_repository import InvitationRepository
from app.repositories.network_repository import NetworkRepository
from app.repositories.user_repository import UserRepository
from app.services.invitation_service import InvitationService
from app.services.user_scope_service import UserScopeService

router = APIRouter()


def get_invitation_service(db: Session = Depends(get_db)) -> InvitationService:
    branch_repo = BranchRepository(db)
    network_repo = NetworkRepository(db)
    scope = UserScopeService(branch_repo, network_repo)
    return InvitationService(
        InvitationRepository(db),
        UserRepository(db),
        scope,
        branch_repo,
        network_repo,
    )


@router.get("")
def list_invitations(
    request: Request,
    service: InvitationService = Depends(get_invitation_service),
):
    try:
        inviter_id, inviter_role = require_manager(request)
        return service.list_invitations(inviter_id=inviter_id, inviter_role=inviter_role)
    except HTTPException as e:
        return JSONResponse({"error": e.detail}, status_code=e.status_code)


@router.post("", status_code=201)
def create_invitation(
    request: Request,
    data: dict[str, Any] | None = Body(default=None),
    service: InvitationService = Depends(get_invitation_service),
):
    try:
        inviter_id, inviter_role = require_manager(request)
        if not data:
            return JSONResponse({"error": "חסרים נתונים"}, status_code=400)
        inv = service.create_invitation(
            inviter_id=inviter_id,
            inviter_role=inviter_role,
            email=str(data.get("email") or "").strip(),
            role=str(data.get("role") or "").strip(),
            job_function=(str(data.get("job_function")).strip() if data.get("job_function") else None),
            network_id=(str(data.get("network_id")).strip() if data.get("network_id") else None),
            branch_id=(str(data.get("branch_id")).strip() if data.get("branch_id") else None),
        )
        return {"message": "ההזמנה נשלחה לאימייל", "invitation": inv}
    except HTTPException as e:
        return JSONResponse({"error": e.detail}, status_code=e.status_code)
    except ValueError as e:
        return JSONResponse({"error": str(e)}, status_code=400)


@router.delete("/{invitation_id}")
def cancel_invitation(
    invitation_id: str,
    request: Request,
    service: InvitationService = Depends(get_invitation_service),
):
    try:
        inviter_id, inviter_role = require_manager(request)
        service.cancel_invitation(
            invitation_id,
            inviter_id=inviter_id,
            inviter_role=inviter_role,
        )
        return {"message": "ההזמנה בוטלה"}
    except HTTPException as e:
        return JSONResponse({"error": e.detail}, status_code=e.status_code)
    except ValueError as e:
        return JSONResponse({"error": str(e)}, status_code=400)


@router.get("/preview")
def preview_invitation(
    token: str = Query(...),
    service: InvitationService = Depends(get_invitation_service),
):
    try:
        return service.preview(token)
    except ValueError as e:
        return JSONResponse({"error": str(e)}, status_code=400)
