"""Jobs planifiés (Vercel Cron) — purge médias expirés."""
from __future__ import annotations

from fastapi import APIRouter, Depends, Header, HTTPException, Request
from sqlalchemy.orm import Session

from app.core import config
from app.dependencies import get_db
from app.repositories.task_completion_repository import TaskCompletionRepository
from app.repositories.task_occurrence_repository import TaskOccurrenceRepository
from app.repositories.task_template_repository import TaskTemplateRepository
from app.services.media_retention_service import MediaRetentionService

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
    _assert_cron_authorized(authorization)
    service = MediaRetentionService(
        TaskOccurrenceRepository(db),
        TaskCompletionRepository(db),
        template_repo=TaskTemplateRepository(db),
    )
    result = service.purge_due()
    db.commit()
    return {"ok": True, **result}
