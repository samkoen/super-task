from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.orm import Session

from app.auth.actor import load_actor
from app.controllers.controller_helpers import handle_controller_errors
from app.dependencies import get_db
from app.repositories.branch_repository import BranchRepository
from app.repositories.department_repository import DepartmentRepository
from app.repositories.task_completion_repository import TaskCompletionRepository
from app.repositories.task_occurrence_repository import TaskOccurrenceRepository
from app.repositories.task_template_repository import TaskTemplateRepository
from app.repositories.task_translation_repository import TaskTranslationRepository
from app.repositories.user_repository import UserRepository
from app.services.dashboard_service import DashboardService
from app.services.task_translation_service import TaskTranslationService

router = APIRouter()


def get_service(db: Session = Depends(get_db)) -> DashboardService:
    return DashboardService(
        TaskOccurrenceRepository(db),
        BranchRepository(db),
        DepartmentRepository(db),
        UserRepository(db),
        TaskCompletionRepository(db),
        TaskTranslationService(TaskTranslationRepository(db)),
        TaskTemplateRepository(db),
    )


@router.get("/manager")
@handle_controller_errors
def manager_dashboard(
    request: Request,
    branch_id: str | None = Query(None),
    due_on: str | None = Query(None),
    service: DashboardService = Depends(get_service),
    db: Session = Depends(get_db),
):
    actor = load_actor(request, UserRepository(db))
    return service.manager_dashboard(actor, branch_id=branch_id, due_on=due_on)


@router.get("/employee")
@handle_controller_errors
async def employee_dashboard(
    request: Request,
    due_on: str | None = Query(None),
    service: DashboardService = Depends(get_service),
    db: Session = Depends(get_db),
):
    actor = load_actor(request, UserRepository(db))
    return await service.employee_dashboard(actor, due_on=due_on)
