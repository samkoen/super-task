"""Analyse vocale manager → brouillon de tâche."""
from __future__ import annotations

from app.domain.employee_language import LANGUAGE_NAMES_EN, normalize_employee_language
from app.domain.ai_provider import is_voice_ai_configured
from app.domain import roles
from app.domain.scope import ActorContext
from app.domain.task_scope import can_manage_tasks, visible_branch_ids_for_tasks
from app.domain.task_voice import TaskVoiceDraft, build_task_voice_prompt, parse_task_voice_response
from app.repositories.branch_repository import BranchRepository
from app.repositories.user_repository import UserRepository
from app.services.ai.gemini_client import GeminiError, generate_from_audio

AUDIO_MAX_BYTES = 20 * 1024 * 1024
ALLOWED_AUDIO_MIME = {
    "audio/webm",
    "audio/ogg",
    "audio/mpeg",
    "audio/mp3",
    "audio/wav",
    "audio/x-wav",
    "audio/mp4",
    "audio/m4a",
    "audio/aac",
}


class TaskVoiceAiService:
    def __init__(self, user_repo: UserRepository, branch_repo: BranchRepository):
        self._users = user_repo
        self._branches = branch_repo

    async def parse_voice_message(
        self,
        actor: ActorContext,
        *,
        branch_id: str,
        task_kind: str,
        audio_bytes: bytes,
        mime_type: str,
    ) -> TaskVoiceDraft:
        if not can_manage_tasks(actor):
            raise PermissionError("אין הרשאה")
        if task_kind not in {"fixed", "ad_hoc"}:
            raise ValueError("סוג משימה לא תקין")
        if not branch_id:
            raise ValueError("נדרש סניף")
        if not audio_bytes:
            raise ValueError("קובץ שמע ריק")
        if len(audio_bytes) > AUDIO_MAX_BYTES:
            raise ValueError("קובץ השמע גדול מדי")
        if not is_voice_ai_configured():
            raise ValueError(
                "הודעה קולית דורשת GEMINI_API_KEY (מולטימדיה Gemini) — "
                "ללא קשר ל-AI_PROVIDER. הוסיפו מפתח Gemini ב-backend/.env"
            )

        self._assert_branch_access(actor, branch_id)
        employees = self._branch_employees(actor, branch_id)
        manager = self._users.find_by_id(actor.user_id)
        manager_language = normalize_employee_language(manager.preferred_language if manager else None)
        lang_name = LANGUAGE_NAMES_EN[manager_language]
        prompt = build_task_voice_prompt(
            employees=employees,
            task_kind=task_kind,
            manager_language=manager_language,
        )
        mime = self._normalize_mime(mime_type)
        try:
            raw = await generate_from_audio(
                audio_bytes,
                mime,
                prompt,
                system_instruction=(
                    f"You transcribe supermarket task instructions from audio. "
                    f"The manager speaks {lang_name}. "
                    "Reply with JSON only. Never invent or add content that was not spoken. "
                    "Do not add extra requirements, steps, or assumptions."
                ),
            )
        except GeminiError as exc:
            raise ValueError(str(exc)) from exc
        return parse_task_voice_response(raw, employees)

    def _assert_branch_access(self, actor: ActorContext, branch_id: str) -> None:
        branch_ids = visible_branch_ids_for_tasks(actor, self._branches)
        if branch_ids is not None and branch_id not in branch_ids:
            raise PermissionError("אין גישה לסניף זה")

    def _branch_employees(self, actor: ActorContext, branch_id: str) -> list[dict]:
        branch_ids = visible_branch_ids_for_tasks(actor, self._branches)
        users = self._users.list_users(role=roles.EMPLOYEE, branch_ids=[branch_id] if branch_id else branch_ids)
        return [
            {
                "id": u.id,
                "full_name": u.full_name,
                "job_function": u.job_function,
            }
            for u in users
            if not branch_id or u.branch_id == branch_id
        ]

    def _normalize_mime(self, mime_type: str) -> str:
        mime = (mime_type or "audio/webm").split(";")[0].strip().lower()
        if mime not in ALLOWED_AUDIO_MIME:
            raise ValueError("פורמט שמע לא נתמך")
        return mime

