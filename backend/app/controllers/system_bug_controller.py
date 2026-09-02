from fastapi import APIRouter, Depends, File, Form, Request, UploadFile
from sqlalchemy.orm import Session

from app.auth.actor import load_actor
from app.controllers.controller_helpers import handle_controller_errors
from app.dependencies import get_db
from app.repositories.branch_repository import BranchRepository
from app.repositories.user_repository import UserRepository
from app.services.system_bug_service import SystemBugService, resolve_system_bug_identity

router = APIRouter()


def get_system_bug_service() -> SystemBugService:
    return SystemBugService()


async def _read_upload(file: UploadFile | None) -> bytes | None:
    if file is None or not file.filename:
        return None
    data = await file.read()
    return data or None


def _bug_context(request: Request, db: Session, preview: str, branch_name: str):
    user_repo = UserRepository(db)
    actor = load_actor(request, user_repo)
    identity = resolve_system_bug_identity(
        actor, user_repo, BranchRepository(db), branch_name_hint=branch_name
    )
    extra = {k: v for k, v in (("צפייה כעובד", preview),) if v}
    return actor, identity, extra


@router.post("")
@handle_controller_errors
async def create_system_bug(
    request: Request,
    note: str = Form(""),
    route: str = Form(""),
    trail: str = Form(""),
    app_version: str = Form(""),
    preview: str = Form(""),
    branch_name: str = Form(""),
    screenshot: UploadFile | None = File(None),
    audio: UploadFile | None = File(None),
    db: Session = Depends(get_db),
    service: SystemBugService = Depends(get_system_bug_service),
):
    actor, identity, extra = _bug_context(request, db, preview, branch_name)
    return service.submit(
        actor,
        note=note,
        route=route,
        trail_raw=trail,
        app_version=app_version,
        screenshot=await _read_upload(screenshot),
        audio=await _read_upload(audio),
        identity=identity,
        extra=extra,
    )
