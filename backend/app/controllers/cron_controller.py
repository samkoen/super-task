"""Jobs planifiés (Vercel Cron) — purge médias + inactivité employés."""
from __future__ import annotations

from fastapi import APIRouter, Depends, Header, HTTPException, Request
from sqlalchemy.orm import Session

from app.core import config
from app.dependencies import get_db
from app.domain.notification_retention import notification_purge_cutoff
from app.repositories.notification_repository import NotificationRepository
from app.repositories.task_completion_repository import TaskCompletionRepository
from app.repositories.task_occurrence_repository import TaskOccurrenceRepository
from app.repositories.task_template_repository import TaskTemplateRepository
from app.repositories.user_repository import UserRepository
from app.services.employee_activity_service import EmployeeActivityService
from app.services.media_retention_service import MediaRetentionService
from app.services.notification_service import NotificationService

router = APIRouter()


def _assert_cron_authorized(authorization: str | None) -> None:
    secret = config.CRON_SECRET
    if not secret:
        # Uniquement en local pur — jamais sur Vercel / production.
        if config.ENVIRONMENT == "development" and not config.IS_PRODUCTION:
            return
        raise HTTPException(status_code=503, detail="CRON_SECRET not configured")
    expected = f"Bearer {secret}"
    if authorization != expected:
        raise HTTPException(status_code=401, detail="Unauthorized")


@router.get("/purge-media")
@router.post("/purge-media")
def purge_expired_media(
    request: Request,
    db: Session = Depends(get_db),
    authorization: str | None = Header(default=None),
):
    """Ménage quotidien : médias expirés + alertes > 7 jours."""
    _assert_cron_authorized(authorization)
    service = MediaRetentionService(
        TaskOccurrenceRepository(db),
        TaskCompletionRepository(db),
        template_repo=TaskTemplateRepository(db),
    )
    media_result = service.purge_due()
    notifications_deleted = NotificationRepository(db).delete_older_than(
        notification_purge_cutoff()
    )
    db.commit()
    return {
        "ok": True,
        **media_result,
        "notifications_deleted": notifications_deleted,
    }


@router.get("/employee-inactivity")
@router.post("/employee-inactivity")
def scan_employee_inactivity(
    request: Request,
    db: Session = Depends(get_db),
    authorization: str | None = Header(default=None),
):
    _assert_cron_authorized(authorization)
    activity = EmployeeActivityService(
        UserRepository(db),
        TaskOccurrenceRepository(db),
        NotificationRepository(db),
    )
    result = activity.run_inactivity_scan()
    pending = result.pop("pending", [])
    db.commit()
    NotificationService.push_task_event_sse(pending)
    return {"ok": True, **result}
