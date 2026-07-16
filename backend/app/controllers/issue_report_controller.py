import uuid
from pathlib import Path

from fastapi import APIRouter, Body, Depends, File, HTTPException, Request, UploadFile
from sqlalchemy.orm import Session

from app.auth.actor import load_actor
from app.controllers.controller_helpers import handle_controller_errors
from app.core.config import UPLOADS_DIR
from app.dependencies import get_db
from app.repositories.branch_repository import BranchRepository
from app.repositories.issue_report_repository import IssueReportRepository
from app.repositories.notification_repository import NotificationRepository
from app.repositories.user_repository import UserRepository
from app.services.issue_report_service import IssueReportService
from app.services.notification_service import NotificationService

router = APIRouter()

ISSUE_PHOTO_DIR = UPLOADS_DIR / "issue_photos"
ISSUE_VIDEO_DIR = UPLOADS_DIR / "issue_videos"
ISSUE_AUDIO_DIR = UPLOADS_DIR / "issue_audio"
PHOTO_MAX_BYTES = 10 * 1024 * 1024
VIDEO_MAX_BYTES = 50 * 1024 * 1024
AUDIO_MAX_BYTES = 20 * 1024 * 1024
PHOTO_ALLOWED_EXT = {".jpg", ".jpeg", ".png", ".gif", ".webp"}
VIDEO_ALLOWED_EXT = {".mp4", ".webm", ".mov", ".mpeg", ".mpg"}
AUDIO_ALLOWED_EXT = {".mp3", ".wav", ".ogg", ".webm", ".m4a", ".aac"}
ATTACHMENT_DIRS = {
    "photo": (ISSUE_PHOTO_DIR, PHOTO_ALLOWED_EXT, PHOTO_MAX_BYTES, "issue_photos"),
    "video": (ISSUE_VIDEO_DIR, VIDEO_ALLOWED_EXT, VIDEO_MAX_BYTES, "issue_videos"),
    "audio": (ISSUE_AUDIO_DIR, AUDIO_ALLOWED_EXT, AUDIO_MAX_BYTES, "issue_audio"),
}


def get_issue_report_service(db: Session = Depends(get_db)) -> IssueReportService:
    return IssueReportService(
        IssueReportRepository(db),
        UserRepository(db),
        BranchRepository(db),
        NotificationRepository(db),
    )


async def _upload_issue_attachment(kind: str, file: UploadFile) -> dict:
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


@router.post("")
@handle_controller_errors
def create_issue_report(
    request: Request,
    body: dict = Body(...),
    db: Session = Depends(get_db),
    service: IssueReportService = Depends(get_issue_report_service),
):
    actor = load_actor(request, UserRepository(db))
    report, pending = service.create_report(
        actor,
        text=body.get("text"),
        photo_url=body.get("photo_url"),
        video_url=body.get("video_url"),
        audio_url=body.get("audio_url"),
    )
    db.commit()
    NotificationService.push_task_event_sse(pending)
    return {"report": report}


@router.get("")
@handle_controller_errors
def list_issue_reports(
    request: Request,
    db: Session = Depends(get_db),
    service: IssueReportService = Depends(get_issue_report_service),
):
    actor = load_actor(request, UserRepository(db))
    items = service.list_for_manager(actor)
    return {"items": items}


@router.get("/{report_id}")
@handle_controller_errors
def get_issue_report(
    report_id: str,
    request: Request,
    db: Session = Depends(get_db),
    service: IssueReportService = Depends(get_issue_report_service),
):
    actor = load_actor(request, UserRepository(db))
    report = service.get_report(actor, report_id)
    return {"report": report}


@router.delete("/{report_id}")
@handle_controller_errors
def delete_issue_report(
    report_id: str,
    request: Request,
    db: Session = Depends(get_db),
    service: IssueReportService = Depends(get_issue_report_service),
):
    actor = load_actor(request, UserRepository(db))
    service.delete_report(actor, report_id)
    db.commit()
    return {"ok": True, "message": "הדיווח נמחק"}


@router.post("/upload-photo")
async def upload_issue_photo(file: UploadFile = File(...)):
    return await _upload_issue_attachment("photo", file)


@router.post("/upload-video")
async def upload_issue_video(file: UploadFile = File(...)):
    return await _upload_issue_attachment("video", file)


@router.post("/upload-audio")
async def upload_issue_audio(file: UploadFile = File(...)):
    return await _upload_issue_attachment("audio", file)
