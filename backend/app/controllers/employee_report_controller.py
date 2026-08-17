"""API דוחות עובדים (menahel)."""
from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.orm import Session

from app.auth.actor import load_actor
from app.controllers.controller_helpers import handle_controller_errors
from app.dependencies import get_db
from app.repositories.branch_repository import BranchRepository
from app.repositories.task_completion_repository import TaskCompletionRepository
from app.repositories.task_occurrence_repository import TaskOccurrenceRepository
from app.repositories.user_repository import UserRepository
from app.services.employee_report_service import EmployeeReportService

router = APIRouter()


def get_service(db: Session = Depends(get_db)) -> EmployeeReportService:
    return EmployeeReportService(
        TaskOccurrenceRepository(db),
        TaskCompletionRepository(db),
        UserRepository(db),
        BranchRepository(db),
    )


@router.get("/employees")
@handle_controller_errors
def employee_work_report(
    request: Request,
    branch_id: str | None = Query(None),
    period: str = Query("today"),
    service: EmployeeReportService = Depends(get_service),
    db: Session = Depends(get_db),
):
    actor = load_actor(request, UserRepository(db))
    return service.team_work_report(actor, branch_id=branch_id, period=period)
