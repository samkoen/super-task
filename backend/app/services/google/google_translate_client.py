"""Client Google Cloud Translation (REST v2)."""
from __future__ import annotations

import logging

import httpx

from app.core import config
from app.services.google.google_cloud_errors import GoogleCloudError

logger = logging.getLogger(__name__)

_TRANSLATE_URL = "https://translation.googleapis.com/language/translate/v2"


def _api_key() -> str:
    return config.GOOGLE_CLOUD_API_KEY.strip()


def is_configured() -> bool:
    return bool(_api_key())


def _raise_if_not_configured() -> None:
    if not is_configured():
        raise GoogleCloudError(
            "Google Cloud Translation אינו מוגדר — הגדירו GOOGLE_CLOUD_API_KEY.",
            retryable=False,
        )


def _map_error(status: int, detail: str) -> GoogleCloudError:
    lowered = detail.lower()
    if status in (401, 403) or "api key not valid" in lowered:
        return GoogleCloudError("מפתח Google Cloud לא תקין לתרגום.", retryable=False)
    if status == 429 or "quota" in lowered:
        return GoogleCloudError("מכסת התרגום נגמרה — נסו שוב מאוחר יותר.", retryable=True)
    if status >= 500:
        return GoogleCloudError("שירות התרגום עמוס — נסו שוב.", retryable=True)
    return GoogleCloudError(detail[:300] or "שגיאה בשירות התרגום", retryable=False)


async def translate_texts(
    texts: list[str],
    *,
    target: str,
    source: str | None = None,
) -> list[str]:
    _raise_if_not_configured()
    cleaned = [text or "" for text in texts]
    if not cleaned:
        return []
    payload: dict = {
        "q": cleaned,
        "target": target,
        "format": "text",
    }
    if source:
        payload["source"] = source
    timeout = httpx.Timeout(connect=15.0, read=config.GOOGLE_TRANSLATE_TIMEOUT_SECONDS, write=30.0, pool=15.0)
    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.post(
                _TRANSLATE_URL,
                params={"key": _api_key()},
                json=payload,
            )
    except httpx.TimeoutException as exc:
        raise GoogleCloudError("התרגום ארך יותר מדי — נסו שוב.", retryable=True) from exc
    except httpx.RequestError as exc:
        logger.warning("Google Translate request failed: %s", exc)
        raise GoogleCloudError("לא ניתן להתחבר לשירות התרגום.", retryable=False) from exc

    if response.status_code >= 400:
        raise _map_error(response.status_code, response.text[:300])

    data = response.json().get("data") or {}
    translations = data.get("translations") or []
    if len(translations) != len(cleaned):
        raise GoogleCloudError("תשובת תרגום לא שלמה.", retryable=True)
    return [str(item.get("translatedText") or "") for item in translations]
