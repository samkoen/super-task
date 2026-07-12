"""API HTTP — infrastructure AI (Gemini / OpenCode Go)."""
from __future__ import annotations

from typing import Literal

from fastapi import APIRouter, Depends, File, Form, Request, UploadFile
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.auth.actor import load_actor
from app.dependencies import get_db
from app.repositories.branch_repository import BranchRepository
from app.repositories.user_repository import UserRepository
from app.services.ai_service import AiChatMessage, AiService
from app.services.task_voice_ai_service import TaskVoiceAiService

router = APIRouter()
_ai_service = AiService()


def _voice_service(db: Session = Depends(get_db)) -> TaskVoiceAiService:
    return TaskVoiceAiService(UserRepository(db), BranchRepository(db))


class AiChatMessageBody(BaseModel):
    role: Literal["user", "assistant"] = "user"
    content: str = Field(min_length=1, max_length=32_000)


class AiChatRequest(BaseModel):
    messages: list[AiChatMessageBody] = Field(min_length=1, max_length=40)
    provider: Literal["gemini", "opencode"] | None = None
    system: str | None = Field(default=None, max_length=8_000)
    for_generation: bool = False


class AiCompleteRequest(BaseModel):
    prompt: str = Field(min_length=1, max_length=32_000)
    provider: Literal["gemini", "opencode"] | None = None
    system: str | None = Field(default=None, max_length=8_000)
    for_generation: bool = False


def _require_actor(request: Request, db: Session):
    return load_actor(request, UserRepository(db))


@router.get("/status")
def ai_status(request: Request, db: Session = Depends(get_db)):
    _require_actor(request, db)
    return _ai_service.status()


@router.post("/chat")
async def ai_chat(body: AiChatRequest, request: Request, db: Session = Depends(get_db)):
    _require_actor(request, db)
    try:
        result = await _ai_service.chat(
            [AiChatMessage(role=m.role, content=m.content) for m in body.messages],
            provider=body.provider,
            system=body.system,
            for_generation=body.for_generation,
        )
    except ValueError as exc:
        return JSONResponse({"error": str(exc)}, status_code=400)
    return {"reply": result.reply, "provider": result.provider}


@router.post("/task-from-voice")
async def ai_task_from_voice(
    request: Request,
    branch_id: str = Form(...),
    task_kind: Literal["fixed", "ad_hoc"] = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    service: TaskVoiceAiService = Depends(_voice_service),
):
    actor = _require_actor(request, db)
    try:
        audio_bytes = await file.read()
        if not audio_bytes:
            return JSONResponse({"error": "הקלטה ריקה — נסו שוב"}, status_code=400)
        draft = await service.parse_voice_message(
            actor,
            branch_id=branch_id,
            task_kind=task_kind,
            audio_bytes=audio_bytes,
            mime_type=file.content_type or "audio/webm",
        )
    except PermissionError as exc:
        return JSONResponse({"error": str(exc)}, status_code=403)
    except ValueError as exc:
        return JSONResponse({"error": str(exc)}, status_code=400)
    return {
        "title": draft.title,
        "description": draft.description,
        "assignee_user_id": draft.assignee_user_id,
        "assignee_name": draft.assignee_name,
    }


@router.post("/complete")
async def ai_complete(body: AiCompleteRequest, request: Request, db: Session = Depends(get_db)):
    _require_actor(request, db)
    try:
        result = await _ai_service.complete(
            body.prompt,
            provider=body.provider,
            system=body.system,
            for_generation=body.for_generation,
        )
    except ValueError as exc:
        return JSONResponse({"error": str(exc)}, status_code=400)
    return {"reply": result.reply, "provider": result.provider}
