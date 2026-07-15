"""Helpers réponses HTTP pour les controllers."""

import inspect
from functools import wraps

from fastapi import HTTPException
from fastapi.responses import JSONResponse


def _error_response(exc: Exception) -> JSONResponse:
    if isinstance(exc, HTTPException):
        return JSONResponse({"error": exc.detail}, status_code=exc.status_code)
    if isinstance(exc, PermissionError):
        return JSONResponse({"error": str(exc)}, status_code=403)
    if isinstance(exc, ValueError):
        return JSONResponse({"error": str(exc)}, status_code=400)
    return JSONResponse({"error": f"שגיאת שרת: {str(exc)}"}, status_code=500)


def handle_controller_errors(fn):
    if inspect.iscoroutinefunction(fn):
        @wraps(fn)
        async def async_wrapper(*args, **kwargs):
            try:
                return await fn(*args, **kwargs)
            except Exception as exc:
                return _error_response(exc)

        return async_wrapper

    @wraps(fn)
    def sync_wrapper(*args, **kwargs):
        try:
            return fn(*args, **kwargs)
        except Exception as exc:
            return _error_response(exc)

    return sync_wrapper
