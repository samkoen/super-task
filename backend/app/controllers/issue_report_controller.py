from fastapi import APIRouter, Body, Depends, File, Request, UploadFile
from sqlalchemy.orm import Session

from app.auth.actor import load_actor
from app.controllers.controller_helpers import handle_controller_errors
from app.dependencies import get_db
from app.repositories.branch_repository import BranchRepository
from app.repositories.issue_report_repository import IssueReportRepository
from app.repositories.notification_repository import NotificationRepository
from app.repositories.user_repository import UserRepository
from app.services.issue_report_service import IssueReportService
from app.services.media_upload_service import upload_attachment
from app.services.notification_service import NotificationService

router = APIRouter()

_ISSUE_FOLDERS = {
    "photo": "issue_photos",
    "video": "issue_videos",
    "audio": "issue_audio",
}


def get_issue_report_service(db: Session = Depends(get_db)) -> IssueReportService:
    return IssueReportService(
        IssueReportRepository(db),
        UserRepository(db),
        BranchRepository(db),
        NotificationRepository(db),
    )


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
async def upload_issue_photo(
    request: Request,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    load_actor(request, UserRepository(db))
    return await upload_attachment(kind="photo", folder=_ISSUE_FOLDERS["photo"], file=file)


@router.post("/upload-video")
async def upload_issue_video(
    request: Request,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    load_actor(request, UserRepository(db))
    return await upload_attachment(kind="video", folder=_ISSUE_FOLDERS["video"], file=file)


@router.post("/upload-audio")
async def upload_issue_audio(
    request: Request,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    load_actor(request, UserRepository(db))
    return await upload_attachment(kind="audio", folder=_ISSUE_FOLDERS["audio"], file=file)
