from typing import Any

from fastapi import APIRouter, Body, Depends, Request
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from app.auth.actor import load_actor
from app.controllers.controller_helpers import handle_controller_errors
from app.dependencies import get_db
from app.repositories.branch_repository import BranchRepository
from app.repositories.user_branch_membership_repository import UserBranchMembershipRepository
from app.repositories.user_repository import UserRepository
from app.repositories.whatsapp_message_repository import WhatsAppMessageRepository
from app.services.whatsapp_service import WhatsAppService, delivery_failed

router = APIRouter()


def get_whatsapp_service(db: Session = Depends(get_db)) -> WhatsAppService:
    return WhatsAppService(
        WhatsAppMessageRepository(db),
        UserRepository(db),
        BranchRepository(db),
        UserBranchMembershipRepository(db),
    )


@router.post("/messages", status_code=201)
@handle_controller_errors
def send_whatsapp_message(
    request: Request,
    data: dict[str, Any] = Body(...),
    db: Session = Depends(get_db),
    service: WhatsAppService = Depends(get_whatsapp_service),
):
    actor = load_actor(request, UserRepository(db))
    message = service.send(
        actor,
        recipient_user_id=data.get("recipient_user_id"),
        phone=data.get("phone"),
        recipient_name=data.get("recipient_name"),
        text_key=data.get("text_key"),
        consent_confirmed=data.get("consent_confirmed"),
    )
    db.commit()
    if delivery_failed(message):
        return JSONResponse(
            {"error": "שליחת הוואטסאפ נכשלה", "message": message.to_dict()}, status_code=502
        )
    return {"message": message.to_dict()}
