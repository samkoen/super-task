"""API דוחות עובדים (menahel)."""
from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.orm import Session

from app.auth.actor import load_actor
from app.controllers.controller_helpers import handle_controller_errors
from app.dependencies import get_db
from app.repositories.branch_repository import BranchRepository
from app.repositories.employee_break_repository import EmployeeBreakRepository
from app.repositories.notification_repository import NotificationRepository
from app.repositories.task_completion_repository import TaskCompletionRepository
from app.repositories.task_occurrence_repository import TaskOccurrenceRepository
from app.repositories.user_repository import UserRepository
from app.services.attendance_report_service import AttendanceReportService
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


def get_attendance_service(db: Session = Depends(get_db)) -> AttendanceReportService:
    return AttendanceReportService(
        TaskOccurrenceRepository(db),
        TaskCompletionRepository(db),
        UserRepository(db),
        BranchRepository(db),
        EmployeeBreakRepository(db),
        NotificationRepository(db),
    )


@router.get("/attendance")
@handle_controller_errors
def employee_attendance_report(
    request: Request,
    branch_id: str | None = Query(None),
    period: str = Query("today"),
    service: AttendanceReportService = Depends(get_attendance_service),
    db: Session = Depends(get_db),
):
    actor = load_actor(request, UserRepository(db))
    return service.team_attendance_report(actor, branch_id=branch_id, period=period)
