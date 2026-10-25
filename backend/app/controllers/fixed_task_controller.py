"""Tâches קבועות groupées par tâche : lecture, réglages généraux, adaptation d'un snif."""
from typing import Any

from fastapi import APIRouter, Body, Depends, Query, Request
from sqlalchemy.orm import Session

from app.auth.actor import load_actor
from app.controllers.controller_helpers import handle_controller_errors
from app.controllers.task_controller import get_template_service
from app.dependencies import get_db
from app.repositories.branch_repository import BranchRepository
from app.repositories.task_template_repository import TaskTemplateRepository
from app.repositories.user_repository import UserRepository
from app.services.fixed_task_group_service import FixedTaskGroupService
from app.services.task_template_service import TaskTemplateService

router = APIRouter()


def get_group_service(
    templates: TaskTemplateService = Depends(get_template_service),
    db: Session = Depends(get_db),
) -> FixedTaskGroupService:
    return FixedTaskGroupService(templates, TaskTemplateRepository(db), BranchRepository(db))


@router.get("")
@handle_controller_errors
def list_fixed_tasks(
    request: Request,
    branch_id: str | None = Query(None),
    service: FixedTaskGroupService = Depends(get_group_service),
    db: Session = Depends(get_db),
):
    actor = load_actor(request, UserRepository(db))
    return service.list_groups(actor, branch_id=branch_id)


@router.get("/{key}")
@handle_controller_errors
def get_fixed_task(
    key: str,
    request: Request,
    service: FixedTaskGroupService = Depends(get_group_service),
    db: Session = Depends(get_db),
):
    actor = load_actor(request, UserRepository(db))
    return service.get_group(actor, key)


@router.patch("/{key}/defaults")
@handle_controller_errors
def update_fixed_task_defaults(
    key: str,
    request: Request,
    data: dict[str, Any] | None = Body(default=None),
    service: FixedTaskGroupService = Depends(get_group_service),
    db: Session = Depends(get_db),
):
    actor = load_actor(request, UserRepository(db))
    return service.update_group(actor, key, data or {})


@router.patch("/branches/{template_id}")
@handle_controller_errors
def update_fixed_task_branch(
    template_id: str,
    request: Request,
    data: dict[str, Any] | None = Body(default=None),
    service: FixedTaskGroupService = Depends(get_group_service),
    db: Session = Depends(get_db),
):
    actor = load_actor(request, UserRepository(db))
    body = data or {}
    reset = body.get("reset") if isinstance(body.get("reset"), list) else []
    changes = body.get("changes") if isinstance(body.get("changes"), dict) else {}
    return service.update_branch(actor, template_id, changes=changes, reset=reset)
