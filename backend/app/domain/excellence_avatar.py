"""Style avatar excellence סופר-מן + slogan."""

from __future__ import annotations

import base64
import zlib

SLOGANS = (
    "מצוינות כל יום",
    "סטנדרט גבוה, חיוך גדול",
    "מחויבות שרואים",
    "סופר-מן של הסניף",
    "{name} — מצוינות בפעולה",
    "גאים בסטנדרט",
    "כל משימה, ברמה",
)

AVATAR_STYLE_PROMPT = (
    "Restyle this employee selfie as a professional retail-excellence portrait "
    "for the Super-Man supermarket operations app. Keep the same person, face, "
    "and identity. Head-and-shoulders, circular-crop friendly. Confident, committed "
    "workplace look. Unified illustrated-realistic campaign style with teal #1A9B86 "
    "and navy #0B1220 accents. Soft gold light only — no Superman costume, no cape, "
    "no S shield, no logos, no text, no watermark."
)

SLOGAN_MAX_LEN = 80


def pick_excellence_slogan(user_id: str, first_name: str) -> str:
    idx = zlib.crc32((user_id or "").encode("utf-8")) % len(SLOGANS)
    name = (first_name or "").strip() or "סופר-מן"
    return SLOGANS[idx].replace("{name}", name)[:SLOGAN_MAX_LEN]


def extract_inline_image(payload: dict) -> tuple[bytes, str]:
    for candidate in payload.get("candidates") or []:
        parts = (candidate.get("content") or {}).get("parts") or []
        for part in parts:
            inline = part.get("inlineData") or part.get("inline_data")
            if not isinstance(inline, dict):
                continue
            raw = inline.get("data")
            if not isinstance(raw, str) or not raw.strip():
                continue
            mime = str(inline.get("mimeType") or inline.get("mime_type") or "image/png")
            return base64.b64decode(raw), mime.split(";")[0].strip()
    raise ValueError("המודל לא החזיר תמונה")
