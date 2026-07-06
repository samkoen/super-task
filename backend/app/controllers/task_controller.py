import uuid
from pathlib import Path
from typing import Any

from fastapi import APIRouter, Body, Depends, File, HTTPException, Query, Request, UploadFile
from sqlalchemy.orm import Session

from app.auth.actor import load_actor
from app.controllers.controller_helpers import handle_controller_errors
from app.dependencies import get_db
from app.repositories.branch_repository import BranchRepository
from app.repositories.department_repository import DepartmentRepository
from app.repositories.task_completion_repository import TaskCompletionRepository
from app.repositories.task_occurrence_repository import TaskOccurrenceRepository
from app.repositories.task_template_repository import TaskTemplateRepository
from app.repositories.user_repository import UserRepository
from app.realtime.task_events import notify_task_change
from app.repositories.notification_repository import NotificationRepository
from app.services.notification_service import NotificationService
from app.services.task_occurrence_service import TaskOccurrenceService
from app.services.task_scheduler_service import TaskSchedulerService
from app.core.config import UPLOADS_DIR
from app.services.task_template_service import TaskTemplateService

router = APIRouter()

TASK_PHOTO_DIR = UPLOADS_DIR / "task_photos"
TASK_VIDEO_DIR = UPLOADS_DIR / "task_videos"
TASK_AUDIO_DIR = UPLOADS_DIR / "task_audio"
PHOTO_MAX_BYTES = 10 * 1024 * 1024
VIDEO_MAX_BYTES = 50 * 1024 * 1024
AUDIO_MAX_BYTES = 20 * 1024 * 1024
PHOTO_ALLOWED_EXT = {".jpg", ".jpeg", ".png", ".gif", ".webp"}
VIDEO_ALLOWED_EXT = {".mp4", ".webm", ".mov", ".mpeg", ".mpg"}
AUDIO_ALLOWED_EXT = {".mp3", ".wav", ".ogg", ".webm", ".m4a", ".aac"}
ATTACHMENT_DIRS = {
    "photo": (TASK_PHOTO_DIR, PHOTO_ALLOWED_EXT, PHOTO_MAX_BYTES, "task_photos"),
    "video": (TASK_VIDEO_DIR, VIDEO_ALLOWED_EXT, VIDEO_MAX_BYTES, "task_videos"),
    "audio": (TASK_AUDIO_DIR, AUDIO_ALLOWED_EXT, AUDIO_MAX_BYTES, "task_audio"),
}


def _notify_occurrence(event_type: str, item: dict) -> None:
    notify_task_change(
        event_type=event_type,
        branch_id=str(item.get("branch_id") or ""),
        assignee_user_id=item.get("assignee_user_id"),
        occurrence_id=item.get("id"),
        status=item.get("status"),
    )


def _emit_task_event(db: Session, event_type: str, item: dict) -> None:
    """Commit DB changes before SSE so refetching clients see fresh data."""
    svc = NotificationService(NotificationRepository(db), UserRepository(db))
    pending_notifications = svc.publish_task_event(
        event_type=event_type,
        branch_id=str(item.get("branch_id") or ""),
        assignee_user_id=item.get("assignee_user_id"),
        occurrence_id=item.get("id"),
        task_title=item.get("title"),
    )
    db.commit()
    _notify_occurrence(event_type, item)
    NotificationService.push_task_event_sse(pending_notifications)


def get_template_service(db: Session = Depends(get_db)) -> TaskTemplateService:
    template_repo = TaskTemplateRepository(db)
    occurrence_repo = TaskOccurrenceRepository(db)
    scheduler = TaskSchedulerService(template_repo, occurrence_repo)
    return TaskTemplateService(
        template_repo,
        BranchRepository(db),
        DepartmentRepository(db),
        UserRepository(db),
        scheduler,
    )


def get_occurrence_service(db: Session = Depends(get_db)) -> TaskOccurrenceService:
    return TaskOccurrenceService(
        TaskOccurrenceRepository(db),
        TaskCompletionRepository(db),
        BranchRepository(db),
        UserRepository(db),
    )


def get_scheduler(db: Session = Depends(get_db)) -> TaskSchedulerService:
    template_repo = TaskTemplateRepository(db)
    return TaskSchedulerService(template_repo, TaskOccurrenceRepository(db))


@router.get("/templates")
@handle_controller_errors
def list_templates(
    request: Request,
    branch_id: str | None = Query(None),
    service: TaskTemplateService = Depends(get_template_service),
    db: Session = Depends(get_db),
):
    actor = load_actor(request, UserRepository(db))
    return service.list_templates(actor, branch_id=branch_id)


@router.post("/templates", status_code=201)
@handle_controller_errors
def create_template(
    request: Request,
    data: dict[str, Any] | None = Body(default=None),
    service: TaskTemplateService = Depends(get_template_service),
    db: Session = Depends(get_db),
):
    actor = load_actor(request, UserRepository(db))
    payload = data or {}
    item = service.create_template(
        actor,
        branch_id=str(payload.get("branch_id") or ""),
        title=str(payload.get("title") or ""),
        description=str(payload.get("description") or ""),
        recurrence=str(payload.get("recurrence") or "daily"),
        due_time=str(payload.get("due_time") or "23:59"),
        weekly_days=payload.get("weekly_days"),
        monthly_day=payload.get("monthly_day"),
        assignee_user_id=payload.get("assignee_user_id"),
        department_id=payload.get("department_id"),
        due_at=payload.get("due_at"),
    )
    _emit_task_event(
        db,
        "task_created",
        {
            "branch_id": item.get("branch_id"),
            "assignee_user_id": item.get("assignee_user_id"),
            "title": item.get("title"),
        },
    )
    return {"message": "משימה קבועה נוצרה", "template": item}


@router.patch("/templates/{template_id}")
@handle_controller_errors
def update_template(
    template_id: str,
    request: Request,
    data: dict[str, Any] | None = Body(default=None),
    service: TaskTemplateService = Depends(get_template_service),
    db: Session = Depends(get_db),
):
    actor = load_actor(request, UserRepository(db))
    payload = data or {}
    item = service.update_template(
        actor,
        template_id,
        title=str(payload.get("title") or ""),
        description=str(payload.get("description") or ""),
        due_time=str(payload.get("due_time") or "23:59"),
        weekly_days=payload.get("weekly_days"),
        assignee_user_id=payload.get("assignee_user_id"),
        department_id=payload.get("department_id"),
        is_active=bool(payload.get("is_active", True)),
    )
    return {"message": "המשימה עודכנה", "template": item}


@router.post("/ad-hoc", status_code=201)
@handle_controller_errors
def create_ad_hoc_task(
    request: Request,
    data: dict[str, Any] | None = Body(default=None),
    service: TaskOccurrenceService = Depends(get_occurrence_service),
    db: Session = Depends(get_db),
):
    actor = load_actor(request, UserRepository(db))
    payload = data or {}
    item = service.create_ad_hoc(
        actor,
        branch_id=str(payload.get("branch_id") or ""),
        title=str(payload.get("title") or ""),
        description=str(payload.get("description") or ""),
        due_at=str(payload.get("due_at") or ""),
        assignee_user_id=payload.get("assignee_user_id"),
        photo_required=bool(payload.get("photo_required", True)),
    )
    _emit_task_event(db, "task_created", item)
    return {"message": "משימה מזדמנת נוצרה", "occurrence": item}


@router.get("/occurrences")
@handle_controller_errors
def list_occurrences(
    request: Request,
    branch_id: str | None = Query(None),
    status: str | None = Query(None),
    due_on: str | None = Query(None),
    pending_delegation: bool | None = Query(None),
    task_kind: str | None = Query(None),
    service: TaskOccurrenceService = Depends(get_occurrence_service),
    db: Session = Depends(get_db),
):
    actor = load_actor(request, UserRepository(db))
    return service.list_occurrences(
        actor,
        branch_id=branch_id,
        status=status,
        due_on=due_on,
        pending_delegation=pending_delegation,
        task_kind=task_kind,
    )


@router.get("/mine")
@handle_controller_errors
def list_my_tasks(
    request: Request,
    due_on: str | None = Query(None),
    service: TaskOccurrenceService = Depends(get_occurrence_service),
    db: Session = Depends(get_db),
):
    actor = load_actor(request, UserRepository(db))
    return service.list_mine(actor, due_on=due_on)


@router.post("/occurrences/{occurrence_id}/start")
@handle_controller_errors
def start_occurrence(
    occurrence_id: str,
    request: Request,
    service: TaskOccurrenceService = Depends(get_occurrence_service),
    db: Session = Depends(get_db),
):
    actor = load_actor(request, UserRepository(db))
    item = service.start_occurrence(actor, occurrence_id)
    _emit_task_event(db, "task_started", item)
    return {"message": "המשימה התחילה", "occurrence": item}


@router.post("/occurrences/{occurrence_id}/delegate")
@handle_controller_errors
def delegate_occurrence(
    occurrence_id: str,
    request: Request,
    data: dict[str, Any] | None = Body(default=None),
    service: TaskOccurrenceService = Depends(get_occurrence_service),
    db: Session = Depends(get_db),
):
    actor = load_actor(request, UserRepository(db))
    payload = data or {}
    item = service.delegate_occurrence(
        actor, occurrence_id, assignee_user_id=str(payload.get("assignee_user_id") or "")
    )
    _emit_task_event(db, "task_delegated", item)
    return {"message": "המשימה שויכה לעובד", "occurrence": item}


@router.post("/occurrences/{occurrence_id}/complete")
@handle_controller_errors
def complete_occurrence(
    occurrence_id: str,
    request: Request,
    data: dict[str, Any] | None = Body(default=None),
    service: TaskOccurrenceService = Depends(get_occurrence_service),
    db: Session = Depends(get_db),
):
    actor = load_actor(request, UserRepository(db))
    payload = data or {}
    item = service.complete_occurrence(
        actor,
        occurrence_id,
        completion_status=str(payload.get("status") or "completed"),
        note=payload.get("note"),
        photo_path=payload.get("photo_path"),
        video_path=payload.get("video_path"),
        audio_path=payload.get("audio_path"),
        not_completed_reason=payload.get("not_completed_reason"),
    )
    _emit_task_event(db, "task_completed", item)
    return {"message": "המשימה עודכנה", "occurrence": item}


@router.post("/occurrences/{occurrence_id}/cancel")
@handle_controller_errors
def cancel_occurrence(
    occurrence_id: str,
    request: Request,
    service: TaskOccurrenceService = Depends(get_occurrence_service),
    db: Session = Depends(get_db),
):
    actor = load_actor(request, UserRepository(db))
    item = service.cancel_occurrence(actor, occurrence_id)
    _emit_task_event(db, "task_cancelled", item)
    return {"message": "המשימה בוטלה", "occurrence": item}


@router.post("/upload-photo")
async def upload_task_photo(file: UploadFile = File(...)):
    return await _upload_task_attachment("photo", file)


@router.post("/upload-video")
async def upload_task_video(file: UploadFile = File(...)):
    return await _upload_task_attachment("video", file)


@router.post("/upload-audio")
async def upload_task_audio(file: UploadFile = File(...)):
    return await _upload_task_attachment("audio", file)


async def _upload_task_attachment(kind: str, file: UploadFile) -> dict:
    config = ATTACHMENT_DIRS.get(kind)
    if not config:
        raise HTTPException(status_code=400, detail="סוג קובץ לא נתמך")
    target_dir, allowed_ext, max_bytes, url_folder = config
    ext = Path(file.filename or "").suffix.lower()
    if ext not in allowed_ext:
        raise HTTPException(status_code=400, detail="סוג קובץ לא נתמך")
    target_dir.mkdir(parents=True, exist_ok=True)
    name = f"{uuid.uuid4().hex}{ext}"
    path = target_dir / name
    data = await file.read()
    if len(data) > max_bytes:
        limit_mb = max_bytes // (1024 * 1024)
        raise HTTPException(status_code=400, detail=f"הקובץ גדול מדי (מקסימום {limit_mb}MB)")
    path.write_bytes(data)
    return {"url": f"/uploads/{url_folder}/{name}", "kind": kind}


@router.post("/run-scheduler")
@handle_controller_errors
def run_scheduler(
    request: Request,
    scheduler: TaskSchedulerService = Depends(get_scheduler),
    db: Session = Depends(get_db),
):
    actor = load_actor(request, UserRepository(db))
    from app.domain.task_scope import can_manage_tasks

    if not can_manage_tasks(actor):
        raise PermissionError("אין הרשאה")
    result = scheduler.run_for_date()
    return {"message": "תזמון הושלם", **result}
