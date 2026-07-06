"""Helpers réponses HTTP pour les controllers."""

from functools import wraps

from fastapi import HTTPException
from fastapi.responses import JSONResponse


def handle_controller_errors(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        try:
            return fn(*args, **kwargs)
        except HTTPException as e:
            return JSONResponse({"error": e.detail}, status_code=e.status_code)
        except PermissionError as e:
            return JSONResponse({"error": str(e)}, status_code=403)
        except ValueError as e:
            return JSONResponse({"error": str(e)}, status_code=400)
        except Exception as e:
            return JSONResponse({"error": f"שגיאת שרת: {str(e)}"}, status_code=500)

    return wrapper
