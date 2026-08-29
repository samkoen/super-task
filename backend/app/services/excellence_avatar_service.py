"""Stylise le selfie oved (Gemini) et attribue un slogan d'excellence."""
from __future__ import annotations

from dataclasses import dataclass

from app.domain.excellence_avatar import AVATAR_STYLE_PROMPT, pick_excellence_slogan
from app.services.ai.gemini_client import GeminiError, generate_image_from_photo
from app.services.media_upload_service import save_photo_bytes


@dataclass(frozen=True)
class ExcellenceAvatarResult:
    url: str
    slogan: str
    used_ai: bool


class ExcellenceAvatarService:
    async def stylize(
        self,
        *,
        photo_bytes: bytes,
        mime_type: str,
        user_id: str,
        first_name: str,
    ) -> ExcellenceAvatarResult:
        slogan = pick_excellence_slogan(user_id, first_name)
        image_bytes, _out_mime, used_ai = await self._render(photo_bytes, mime_type)
        url = save_photo_bytes(folder="avatars", data=image_bytes)
        return ExcellenceAvatarResult(url=url, slogan=slogan, used_ai=used_ai)

    async def _render(
        self, photo_bytes: bytes, mime_type: str
    ) -> tuple[bytes, str, bool]:
        try:
            data, mime = await generate_image_from_photo(
                photo_bytes, mime_type, AVATAR_STYLE_PROMPT
            )
            return data, mime, True
        except GeminiError:
            return photo_bytes, mime_type, False
