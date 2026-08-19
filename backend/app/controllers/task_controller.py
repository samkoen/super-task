from typing import Any

from fastapi import APIRouter, Body, Depends, File, Query, Request, UploadFile
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from app.auth.actor import load_actor
from app.controllers.controller_helpers import handle_controller_errors
from app.dependencies import get_db
from app.repositories.branch_repository import BranchRepository
from app.repositories.department_repository import DepartmentRepository
from app.repositories.notification_repository import NotificationRepository
from app.repositories.task_completion_repository import TaskCompletionRepository
from app.repositories.task_gallery_repository import TaskGalleryRepository
from app.repositories.task_message_repository import TaskMessageRepository
from app.repositories.task_occurrence_repository import TaskOccurrenceRepository
from app.repositories.task_template_repository import TaskTemplateRepository
from app.repositories.task_translation_repository import TaskTranslationRepository
from app.repositories.user_repository import UserRepository
from app.realtime.task_events import notify_task_change
from app.services.media_upload_service import upload_attachment
from app.services.employee_activity_service import EmployeeActivityService
from app.services.notification_service import NotificationService
from app.services.task_message_service import TaskMessageService
from app.services.task_occurrence_service import TaskOccurrenceService
from app.services.task_scheduler_service import TaskSchedulerService
from app.services.task_translation_service import TaskTranslationService
from app.services.task_template_service import TaskTemplateService

router = APIRouter()

_TASK_FOLDERS = {
    "photo": "task_photos",
    "video": "task_videos",
    "audio": "task_audio",
}


def _notify_occurrence(event_type: str, item: dict) -> None:
    notify_task_change(
        event_type=event_type,
        branch_id=str(item.get("branch_id") or ""),
        assignee_user_id=item.get("assignee_user_id"),
        occurrence_id=item.get("id"),
        status=item.get("status"),
    )


def _sse_payload_from_create_template(item: dict) -> dict:
    created = item.pop("_created_occurrence", None)
    if created:
        return created
    return {
        "id": item.get("id"),
        "branch_id": item.get("branch_id"),
        "assignee_user_id": item.get("assignee_user_id"),
        "title": item.get("title"),
        "status": "pending",
    }


def _parse_optional_ids(raw: Any) -> list[str] | None:
    if not isinstance(raw, list):
        return None
    ids = [str(i).strip() for i in raw if str(i).strip()]
    return ids or None


_UNSET = object()


def _emit_task_event(
    db: Session,
    event_type: str,
    item: dict,
    *,
    occurrence_id: str | None | object = _UNSET,
) -> None:
    """Commit DB changes before SSE so refetching clients see fresh data."""
    # Après hard-delete (ביטול), ne pas lier la notif à l'occurrence disparue (FK).
    linked_occurrence_id = item.get("id") if occurrence_id is _UNSET else occurrence_id
    svc = NotificationService(NotificationRepository(db), UserRepository(db))
    pending_notifications = svc.publish_task_event(
        event_type=event_type,
        branch_id=str(item.get("branch_id") or ""),
        assignee_user_id=item.get("assignee_user_id"),
        occurrence_id=linked_occurrence_id,
        task_title=item.get("title"),
        created_by_user_id=item.get("created_by_id"),
    )
    db.commit()
    _notify_occurrence(event_type, item)
    assignee = item.get("assignee_user_id")
    if assignee:
        activity = EmployeeActivityService(UserRepository(db), TaskOccurrenceRepository(db))
        if event_type == "task_started":
            activity.on_task_started(str(assignee))
            db.commit()
        elif event_type in {"task_completed", "task_cancelled", "task_approved"}:
            activity.on_left_in_progress(str(assignee))
            db.commit()
    NotificationService.push_task_event_sse(pending_notifications)


def get_template_service(db: Session = Depends(get_db)) -> TaskTemplateService:
    template_repo = TaskTemplateRepository(db)
    occurrence_repo = TaskOccurrenceRepository(db)
    scheduler = TaskSchedulerService(
        template_repo, occurrence_repo, TaskCompletionRepository(db)
    )
    return TaskTemplateService(
        template_repo,
        BranchRepository(db),
        DepartmentRepository(db),
        UserRepository(db),
        scheduler,
        occurrence_repo=occurrence_repo,
        completion_repo=TaskCompletionRepository(db),
        notification_repo=NotificationRepository(db),
    )


def get_occurrence_service(db: Session = Depends(get_db)) -> TaskOccurrenceService:
    return TaskOccurrenceService(
        TaskOccurrenceRepository(db),
        TaskCompletionRepository(db),
        BranchRepository(db),
        UserRepository(db),
        TaskTranslationService(TaskTranslationRepository(db)),
        TaskTemplateRepository(db),
        notification_repo=NotificationRepository(db),
        gallery_repo=TaskGalleryRepository(db),
    )


def get_scheduler(db: Session = Depends(get_db)) -> TaskSchedulerService:
    template_repo = TaskTemplateRepository(db)
    occurrence_repo = TaskOccurrenceRepository(db)
    return TaskSchedulerService(
        template_repo, occurrence_repo, TaskCompletionRepository(db)
    )


def get_message_service(db: Session = Depends(get_db)) -> TaskMessageService:
    return TaskMessageService(
        TaskMessageRepository(db),
        TaskOccurrenceRepository(db),
        UserRepository(db),
        BranchRepository(db),
        TaskCompletionRepository(db),
    )


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
    if payload.get("apply_to_network"):
        result = service.create_templates_for_network(
            actor,
            title=str(payload.get("title") or ""),
            description=str(payload.get("description") or ""),
            recurrence=str(payload.get("recurrence") or "daily"),
            due_time=str(payload.get("due_time") or "23:59"),
            weekly_days=payload.get("weekly_days"),
            monthly_day=payload.get("monthly_day"),
            reference_photo_url=payload.get("reference_photo_url"),
            reference_video_url=payload.get("reference_video_url"),
            reference_audio_url=payload.get("reference_audio_url"),
            source_gallery_item_id=payload.get("source_gallery_item_id"),
            ops_category=payload.get("ops_category"),
            min_video_seconds=payload.get("min_video_seconds"),
            completion_requirements=payload.get("completion_requirements"),
            is_work_start=bool(payload.get("is_work_start")),
            branch_ids=_parse_optional_ids(payload.get("branch_ids")),
        )
        for item in result["templates"]:
            emit_item = _sse_payload_from_create_template(item)
            _emit_task_event(db, "task_created", emit_item)
        return {
            "message": f"נוצרו {len(result['templates'])} משימות קבועות ברשת",
            "templates": result["templates"],
            "skipped": result["skipped"],
        }
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
        reference_photo_url=payload.get("reference_photo_url"),
        reference_video_url=payload.get("reference_video_url"),
        reference_audio_url=payload.get("reference_audio_url"),
        source_gallery_item_id=payload.get("source_gallery_item_id"),
        ops_category=payload.get("ops_category"),
        min_video_seconds=payload.get("min_video_seconds"),
        completion_requirements=payload.get("completion_requirements"),
        is_work_start=bool(payload.get("is_work_start")),
    )
    emit_item = _sse_payload_from_create_template(item)
    _emit_task_event(db, "task_created", emit_item)
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
        reference_photo_url=payload.get("reference_photo_url"),
        reference_video_url=payload.get("reference_video_url"),
        reference_audio_url=payload.get("reference_audio_url"),
        ops_category=payload.get("ops_category"),
        update_ops_category="ops_category" in payload,
        min_video_seconds=payload.get("min_video_seconds"),
        update_min_video_seconds="min_video_seconds" in payload,
        completion_requirements=payload.get("completion_requirements"),
        update_completion_requirements="completion_requirements" in payload,
        is_work_start=payload.get("is_work_start") if "is_work_start" in payload else None,
        apply_to_network=bool(payload.get("apply_to_network")),
    )
    count = item.pop("updated_count", 1)
    if bool(payload.get("apply_to_network")) and count > 1:
        return {
            "message": f"עודכנו {count} משימות קבועות ברשת",
            "template": item,
            "updated_count": count,
        }
    return {"message": "המשימה עודכנה", "template": item, "updated_count": count}


@router.delete("/templates/{template_id}")
@handle_controller_errors
def delete_template(
    template_id: str,
    request: Request,
    apply_to_network: bool = Query(False),
    service: TaskTemplateService = Depends(get_template_service),
    db: Session = Depends(get_db),
):
    actor = load_actor(request, UserRepository(db))
    result = service.delete_template(
        actor, template_id, apply_to_network=apply_to_network
    )
    for occ in result["cancelled_occurrences"]:
        _emit_task_event(db, "task_cancelled", occ, occurrence_id=None)
    if not result["cancelled_occurrences"]:
        db.commit()
    count = result["deleted_count"]
    if apply_to_network and count > 1:
        message = f"נמחקו {count} משימות קבועות ברשת"
    else:
        message = "המשימה הקבועה נמחקה"
    return {"message": message, "deleted_count": count}


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
    if payload.get("apply_to_network"):
        result = service.create_ad_hoc_for_network(
            actor,
            title=str(payload.get("title") or ""),
            description=str(payload.get("description") or ""),
            due_at=str(payload.get("due_at") or ""),
            photo_required=bool(payload.get("photo_required", True)),
            min_video_seconds=payload.get("min_video_seconds"),
            completion_requirements=payload.get("completion_requirements"),
            reference_photo_url=payload.get("reference_photo_url"),
            reference_video_url=payload.get("reference_video_url"),
            reference_audio_url=payload.get("reference_audio_url"),
            source_gallery_item_id=payload.get("source_gallery_item_id"),
            branch_ids=_parse_optional_ids(payload.get("branch_ids")),
        )
        for item in result["occurrences"]:
            _emit_task_event(db, "task_created", item)
        count = len(result["occurrences"])
        return {
            "message": f"נוצרו {count} משימות מזדמנות ברשת",
            "occurrences": result["occurrences"],
            "skipped": result["skipped"],
        }
    item = service.create_ad_hoc(
        actor,
        branch_id=str(payload.get("branch_id") or ""),
        title=str(payload.get("title") or ""),
        description=str(payload.get("description") or ""),
        due_at=str(payload.get("due_at") or ""),
        assignee_user_id=payload.get("assignee_user_id"),
        photo_required=bool(payload.get("photo_required", True)),
        min_video_seconds=payload.get("min_video_seconds"),
        completion_requirements=payload.get("completion_requirements"),
        reference_photo_url=payload.get("reference_photo_url"),
        reference_video_url=payload.get("reference_video_url"),
        reference_audio_url=payload.get("reference_audio_url"),
        source_gallery_item_id=payload.get("source_gallery_item_id"),
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
    due_from: str | None = Query(None),
    due_to: str | None = Query(None),
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
        due_from=due_from,
        due_to=due_to,
        pending_delegation=pending_delegation,
        task_kind=task_kind,
    )


@router.get("/mine")
@handle_controller_errors
async def list_my_tasks(
    request: Request,
    due_on: str | None = Query(None),
    due_from: str | None = Query(None),
    due_to: str | None = Query(None),
    service: TaskOccurrenceService = Depends(get_occurrence_service),
    db: Session = Depends(get_db),
):
    actor = load_actor(request, UserRepository(db))
    return await service.list_mine(actor, due_on=due_on, due_from=due_from, due_to=due_to)


@router.post("/mine/translate")
async def translate_my_tasks(
    request: Request,
    data: dict[str, Any] | None = Body(default=None),
    service: TaskOccurrenceService = Depends(get_occurrence_service),
    db: Session = Depends(get_db),
):
    actor = load_actor(request, UserRepository(db))
    payload = data or {}
    raw_ids = payload.get("occurrence_ids") or []
    if not isinstance(raw_ids, list):
        return JSONResponse({"error": "רשימת משימות לא תקינה"}, status_code=400)
    occurrence_ids = [str(item) for item in raw_ids if item]
    try:
        items = await service.translate_mine(actor, occurrence_ids)
    except PermissionError as exc:
        return JSONResponse({"error": str(exc)}, status_code=403)
    return {"translations": items}


@router.get("/occurrences/{occurrence_id}")
@handle_controller_errors
def get_occurrence(
    occurrence_id: str,
    request: Request,
    service: TaskOccurrenceService = Depends(get_occurrence_service),
    db: Session = Depends(get_db),
):
    actor = load_actor(request, UserRepository(db))
    return service.get_occurrence(actor, occurrence_id)


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


@router.post("/occurrences/{occurrence_id}/manager-next")
@handle_controller_errors
def set_manager_next(
    occurrence_id: str,
    request: Request,
    data: dict[str, Any] | None = Body(default=None),
    service: TaskOccurrenceService = Depends(get_occurrence_service),
    db: Session = Depends(get_db),
):
    actor = load_actor(request, UserRepository(db))
    payload = data or {}
    enabled = bool(payload.get("enabled", True))
    item = service.set_manager_next(actor, occurrence_id, enabled=enabled)
    _emit_task_event(db, "task_manager_next", item)
    return {
        "message": "המשימה סומנה כהבאה" if enabled else "סימון המשימה הבאה בוטל",
        "occurrence": item,
    }


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
async def complete_occurrence(
    occurrence_id: str,
    request: Request,
    data: dict[str, Any] | None = Body(default=None),
    service: TaskOccurrenceService = Depends(get_occurrence_service),
    db: Session = Depends(get_db),
):
    actor = load_actor(request, UserRepository(db))
    payload = data or {}
    item = await service.complete_occurrence(
        actor,
        occurrence_id,
        completion_status=str(payload.get("status") or "completed"),
        note=payload.get("note"),
        photo_path=payload.get("photo_path"),
        video_path=payload.get("video_path"),
        audio_path=payload.get("audio_path"),
        not_completed_reason=payload.get("not_completed_reason"),
        video_duration_seconds=payload.get("video_duration_seconds"),
        completion_attachments=payload.get("completion_attachments") or payload.get("attachments"),
    )
    _emit_task_event(db, "task_completed", item)
    return {"message": "המשימה עודכנה", "occurrence": item}


@router.post("/occurrences/{occurrence_id}/approve")
@handle_controller_errors
def approve_occurrence(
    occurrence_id: str,
    request: Request,
    service: TaskOccurrenceService = Depends(get_occurrence_service),
    db: Session = Depends(get_db),
):
    actor = load_actor(request, UserRepository(db))
    item = service.approve_occurrence(actor, occurrence_id)
    _emit_task_event(db, "task_approved", item)
    return {"message": "המשימה אושרה ונסגרה", "occurrence": item}


@router.post("/occurrences/{occurrence_id}/reopen")
@handle_controller_errors
async def reopen_occurrence(
    occurrence_id: str,
    request: Request,
    data: dict[str, Any] | None = Body(default=None),
    messages: TaskMessageService = Depends(get_message_service),
    db: Session = Depends(get_db),
):
    """Compat : reject photo → message chat + retour in_progress."""
    actor = load_actor(request, UserRepository(db))
    payload = data or {}
    note = (payload.get("rejection_note") or "").strip() or "נא לתקן לפי ההודעה"
    result = await messages.post_message(actor, occurrence_id, body=note)
    _emit_task_event(db, result["event_type"], result["occurrence"])
    return {
        "message": "הודעה נשלחה והמשימה נפתחה מחדש",
        "occurrence": result["occurrence"],
        "chat_message": result["message"],
    }


@router.get("/occurrences/{occurrence_id}/messages")
@handle_controller_errors
def list_task_messages(
    occurrence_id: str,
    request: Request,
    service: TaskMessageService = Depends(get_message_service),
    db: Session = Depends(get_db),
):
    actor = load_actor(request, UserRepository(db))
    return service.list_messages(actor, occurrence_id)


@router.post("/occurrences/{occurrence_id}/messages", status_code=201)
@handle_controller_errors
async def post_task_message(
    occurrence_id: str,
    request: Request,
    data: dict[str, Any] | None = Body(default=None),
    service: TaskMessageService = Depends(get_message_service),
    db: Session = Depends(get_db),
):
    actor = load_actor(request, UserRepository(db))
    payload = data or {}
    result = await service.post_message(
        actor,
        occurrence_id,
        body=payload.get("body"),
        photo_url=payload.get("photo_url"),
        video_url=payload.get("video_url"),
        audio_url=payload.get("audio_url"),
    )
    _emit_task_event(db, result["event_type"], result["occurrence"])
    return {
        "message": "ההודעה נשלחה",
        "chat_message": result["message"],
        "occurrence": result["occurrence"],
    }


@router.post("/occurrences/{occurrence_id}/update")
@handle_controller_errors
def update_occurrence(
    occurrence_id: str,
    request: Request,
    data: dict[str, Any] | None = Body(default=None),
    service: TaskOccurrenceService = Depends(get_occurrence_service),
    db: Session = Depends(get_db),
):
    actor = load_actor(request, UserRepository(db))
    payload = data or {}
    ref_kwargs: dict[str, str | None] = {}
    for field in ("reference_photo_url", "reference_video_url", "reference_audio_url"):
        if field in payload:
            value = payload.get(field)
            ref_kwargs[field] = value if value is not None else None
    item = service.update_occurrence(
        actor,
        occurrence_id,
        title=str(payload.get("title") or ""),
        description=str(payload.get("description") or ""),
        due_at=str(payload.get("due_at") or ""),
        assignee_user_id=payload.get("assignee_user_id"),
        photo_required=payload.get("photo_required"),
        min_video_seconds=payload.get("min_video_seconds") if "min_video_seconds" in payload else None,
        update_min_video_seconds="min_video_seconds" in payload,
        completion_requirements=payload.get("completion_requirements"),
        update_completion_requirements="completion_requirements" in payload,
        apply_to_network=bool(payload.get("apply_to_network")),
        **ref_kwargs,
    )
    count = item.pop("updated_count", 1)
    event_type = "task_delegated" if item.get("assignee_user_id") else "task_updated"
    _emit_task_event(db, event_type, item)
    if bool(payload.get("apply_to_network")) and count > 1:
        return {
            "message": f"עודכנו {count} משימות מזדמנות ברשת",
            "occurrence": item,
            "updated_count": count,
        }
    return {"message": "המשימה עודכנה", "occurrence": item, "updated_count": count}


@router.post("/occurrences/{occurrence_id}/cancel")
@handle_controller_errors
def cancel_occurrence(
    occurrence_id: str,
    request: Request,
    apply_to_network: bool = Query(False),
    service: TaskOccurrenceService = Depends(get_occurrence_service),
    db: Session = Depends(get_db),
):
    actor = load_actor(request, UserRepository(db))
    item = service.cancel_occurrence(
        actor, occurrence_id, apply_to_network=apply_to_network
    )
    media_to_delete = item.pop("_media_to_delete", []) or []
    snaps = item.pop("cancelled_occurrences", None) or [item]
    for snap in snaps:
        _emit_task_event(db, "task_cancelled", snap, occurrence_id=None)
    from app.services import blob_storage

    for url in media_to_delete:
        blob_storage.delete_media_url(url)
    count = item.get("deleted_count", len(snaps))
    if apply_to_network and count > 1:
        message = f"נמחקו {count} משימות מזדמנות ברשת"
    else:
        message = "המשימה נמחקה"
    return {
        "message": message,
        "occurrence": snaps[0],
        "deleted": True,
        "deleted_count": count,
    }


@router.post("/upload-photo")
async def upload_task_photo(
    request: Request,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    load_actor(request, UserRepository(db))
    return await upload_attachment(kind="photo", folder=_TASK_FOLDERS["photo"], file=file)


@router.post("/upload-video")
async def upload_task_video(
    request: Request,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    load_actor(request, UserRepository(db))
    return await upload_attachment(kind="video", folder=_TASK_FOLDERS["video"], file=file)


@router.post("/upload-audio")
async def upload_task_audio(
    request: Request,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    load_actor(request, UserRepository(db))
    return await upload_attachment(kind="audio", folder=_TASK_FOLDERS["audio"], file=file)


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
