from fastapi import APIRouter, Body, Depends, File, Query, Request, UploadFile
from sqlalchemy.orm import Session

from app.auth.actor import load_actor
from app.controllers.controller_helpers import handle_controller_errors
from app.dependencies import get_db
from app.repositories.direct_chat_repository import (
    DirectConversationReadRepository,
    DirectConversationRepository,
    DirectMessageRepository,
)
from app.repositories.network_repository import NetworkRepository
from app.repositories.notification_repository import NotificationRepository
from app.repositories.user_repository import UserRepository
from app.services.direct_chat_service import DirectChatService
from app.services.media_upload_service import upload_attachment
from app.services.notification_service import NotificationService

router = APIRouter()

_CHAT_FOLDERS = {
    "photo": "direct_chat_photos",
    "video": "direct_chat_videos",
    "audio": "direct_chat_audio",
}


def get_direct_chat_service(db: Session = Depends(get_db)) -> DirectChatService:
    return DirectChatService(
        DirectConversationRepository(db),
        DirectMessageRepository(db),
        DirectConversationReadRepository(db),
        UserRepository(db),
        NotificationService(NotificationRepository(db), UserRepository(db)),
        NetworkRepository(db),
    )


@router.get("")
@handle_controller_errors
def list_direct_chats(
    request: Request,
    db: Session = Depends(get_db),
    service: DirectChatService = Depends(get_direct_chat_service),
):
    actor = load_actor(request, UserRepository(db))
    return service.inbox(actor)


@router.post("/mine")
@handle_controller_errors
def open_my_direct_chat(
    request: Request,
    db: Session = Depends(get_db),
    service: DirectChatService = Depends(get_direct_chat_service),
    scope: str | None = Query(None),
):
    actor = load_actor(request, UserRepository(db))
    opened = service.open_mine(actor, preferred_scope=scope)
    db.commit()
    return opened


@router.post("/with/{user_id}")
@handle_controller_errors
def open_direct_chat_with(
    user_id: str,
    request: Request,
    db: Session = Depends(get_db),
    service: DirectChatService = Depends(get_direct_chat_service),
):
    actor = load_actor(request, UserRepository(db))
    opened = service.open_with(actor, user_id)
    db.commit()
    return opened


@router.post("/broadcast")
@handle_controller_errors
def broadcast_direct_chat(
    request: Request,
    body: dict = Body(...),
    db: Session = Depends(get_db),
    service: DirectChatService = Depends(get_direct_chat_service),
):
    actor = load_actor(request, UserRepository(db))
    result = service.broadcast(
        actor,
        body=body.get("body"),
        photo_url=body.get("photo_url"),
        video_url=body.get("video_url"),
        audio_url=body.get("audio_url"),
    )
    pending = service.take_pending_notifications()
    db.commit()
    NotificationService.push_task_event_sse(pending)
    return result


@router.get("/{conversation_id}/messages")
@handle_controller_errors
def list_direct_messages(
    conversation_id: str,
    request: Request,
    db: Session = Depends(get_db),
    service: DirectChatService = Depends(get_direct_chat_service),
    limit: int | None = Query(None),
    before: str | None = Query(None),
):
    actor = load_actor(request, UserRepository(db))
    page = service.list_messages(actor, conversation_id, limit=limit, before=before)
    db.commit()
    return page


@router.post("/{conversation_id}/messages")
@handle_controller_errors
def post_direct_message(
    conversation_id: str,
    request: Request,
    body: dict = Body(...),
    db: Session = Depends(get_db),
    service: DirectChatService = Depends(get_direct_chat_service),
):
    actor = load_actor(request, UserRepository(db))
    result = service.post_message(
        actor,
        conversation_id,
        body=body.get("body"),
        photo_url=body.get("photo_url"),
        video_url=body.get("video_url"),
        audio_url=body.get("audio_url"),
    )
    pending = service.take_pending_notifications()
    db.commit()
    NotificationService.push_task_event_sse(pending)
    return result


@router.post("/upload-photo")
async def upload_direct_photo(
    request: Request,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    load_actor(request, UserRepository(db))
    return await upload_attachment(kind="photo", folder=_CHAT_FOLDERS["photo"], file=file)


@router.post("/upload-video")
async def upload_direct_video(
    request: Request,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    load_actor(request, UserRepository(db))
    return await upload_attachment(kind="video", folder=_CHAT_FOLDERS["video"], file=file)


@router.post("/upload-audio")
async def upload_direct_audio(
    request: Request,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    load_actor(request, UserRepository(db))
    return await upload_attachment(kind="audio", folder=_CHAT_FOLDERS["audio"], file=file)
