"""Client Google Cloud Text-to-Speech (REST)."""
from __future__ import annotations

import base64
import logging

import httpx

from app.core import config
from app.domain.google_cloud_languages import tts_language_code, tts_voice_for
from app.services.google.google_cloud_errors import GoogleCloudError

logger = logging.getLogger(__name__)

_TTS_URL = "https://texttospeech.googleapis.com/v1/text:synthesize"


def _api_key() -> str:
    return config.GOOGLE_CLOUD_API_KEY.strip()


def is_configured() -> bool:
    return bool(_api_key())


def _raise_if_not_configured() -> None:
    if not is_configured():
        raise GoogleCloudError(
            "Google Cloud TTS אינו מוגדר — הגדירו GOOGLE_CLOUD_API_KEY.",
            retryable=False,
        )


def _map_error(status: int, detail: str) -> GoogleCloudError:
    lowered = detail.lower()
    if status in (401, 403) or "api key not valid" in lowered:
        return GoogleCloudError("מפתח Google Cloud לא תקין להקראה.", retryable=False)
    if status == 429 or "quota" in lowered:
        return GoogleCloudError("מכסת ההקראה נגמרה — נסו שוב מאוחר יותר.", retryable=True)
    if status >= 500:
        return GoogleCloudError("שירות ההקראה עמוס — נסו שוב.", retryable=True)
    return GoogleCloudError(detail[:300] or "שגיאה בשירות ההקראה", retryable=False)


async def synthesize_speech(text: str, *, language: str | None) -> bytes:
    _raise_if_not_configured()
    voice_name = tts_voice_for(language)
    payload = {
        "input": {"text": text},
        "voice": {
            "languageCode": tts_language_code(voice_name),
            "name": voice_name,
        },
        "audioConfig": {
            "audioEncoding": config.GOOGLE_TTS_AUDIO_ENCODING,
            "speakingRate": config.GOOGLE_TTS_SPEAKING_RATE,
            "pitch": config.GOOGLE_TTS_PITCH,
        },
    }
    timeout = httpx.Timeout(connect=15.0, read=config.GOOGLE_TTS_TIMEOUT_SECONDS, write=30.0, pool=15.0)
    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.post(
                _TTS_URL,
                params={"key": _api_key()},
                json=payload,
            )
    except httpx.TimeoutException as exc:
        raise GoogleCloudError("ההקראה ארכה יותר מדי — נסו שוב.", retryable=True) from exc
    except httpx.RequestError as exc:
        logger.warning("Google TTS request failed: %s", exc)
        raise GoogleCloudError("לא ניתן להתחבר לשירות ההקראה.", retryable=False) from exc

    if response.status_code >= 400:
        raise _map_error(response.status_code, response.text[:300])

    audio_b64 = (response.json() or {}).get("audioContent") or ""
    if not audio_b64:
        raise GoogleCloudError("לא התקבל קובץ שמע מהשירות.", retryable=False)
    try:
        return base64.b64decode(audio_b64)
    except (ValueError, TypeError) as exc:
        raise GoogleCloudError("פורמט שמע לא תקין מהשירות.", retryable=False) from exc
