"""Helpers réponses HTTP pour les controllers."""

import inspect
from functools import wraps

from fastapi import HTTPException
from fastapi.responses import JSONResponse


def _http_error_text(detail: object) -> str:
    if isinstance(detail, str) and detail.strip():
        return detail
    if isinstance(detail, dict):
        for key in ("error", "detail", "message", "msg"):
            value = detail.get(key)
            if isinstance(value, str) and value.strip():
                return value
    return str(detail)


def _error_response(exc: Exception) -> JSONResponse:
    if isinstance(exc, HTTPException):
        return JSONResponse({"error": _http_error_text(exc.detail)}, status_code=exc.status_code)
    if isinstance(exc, PermissionError):
        return JSONResponse({"error": str(exc)}, status_code=403)
    if isinstance(exc, ValueError):
        return JSONResponse({"error": str(exc)}, status_code=400)
    return JSONResponse({"error": f"שגיאת שרת: {str(exc)}"}, status_code=500)


def handle_controller_errors(fn):
    """Préserve signature + annotations évaluées pour l'injection FastAPI."""
    sig = inspect.signature(fn)

    if inspect.iscoroutinefunction(fn):
        @wraps(fn)
        async def async_wrapper(*args, **kwargs):
            try:
                return await fn(*args, **kwargs)
            except Exception as exc:
                return _error_response(exc)

        return _bind_fastapi_metadata(async_wrapper, fn, sig)

    @wraps(fn)
    def sync_wrapper(*args, **kwargs):
        try:
            return fn(*args, **kwargs)
        except Exception as exc:
            return _error_response(exc)

    return _bind_fastapi_metadata(sync_wrapper, fn, sig)


def _bind_fastapi_metadata(wrapper, fn, sig):
    try:
        annotations = inspect.get_annotations(fn, eval_str=True)
    except Exception:
        annotations = dict(getattr(fn, "__annotations__", {}))
    wrapper.__annotations__ = annotations
    # inspect.signature garde les annotations en str si from __future__ import annotations
    params = [
        param.replace(annotation=annotations.get(name, param.annotation))
        for name, param in sig.parameters.items()
    ]
    wrapper.__signature__ = sig.replace(parameters=params)
    return wrapper
