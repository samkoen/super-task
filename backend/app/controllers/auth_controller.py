import traceback

from typing import Any

from fastapi import APIRouter, Body, Depends, Query, Request
from fastapi.responses import JSONResponse
from sqlalchemy.exc import OperationalError, SQLAlchemyError
from sqlalchemy.orm import Session

from app.dependencies import get_db
from app.repositories.invitation_repository import InvitationRepository
from app.repositories.user_repository import UserRepository
from app.services.auth_service import AuthService
from app.services.invitation_service import InvitationService

router = APIRouter()


def get_auth_service(db: Session = Depends(get_db)) -> AuthService:
    return AuthService(UserRepository(db))


def get_invitation_service(db: Session = Depends(get_db)) -> InvitationService:
    return InvitationService(InvitationRepository(db), UserRepository(db))


@router.get("/invitation-preview")
def invitation_preview(
    token: str = Query(...),
    service: InvitationService = Depends(get_invitation_service),
):
    try:
        return service.preview(token)
    except ValueError as e:
        return JSONResponse({"error": str(e)}, status_code=400)


@router.post("/accept-invitation")
def accept_invitation(
    data: dict[str, Any] | None = Body(default=None),
    service: InvitationService = Depends(get_invitation_service),
):
    try:
        if not data:
            return JSONResponse({"error": "חסרים נתונים"}, status_code=400)
        token = str(data.get("token") or "").strip()
        if not token:
            return JSONResponse({"error": "קישור ההזמנה חסר"}, status_code=400)
        user = service.accept_invitation(
            token=token,
            first_name=str(data.get("first_name") or "").strip(),
            last_name=str(data.get("last_name") or "").strip(),
            password=str(data.get("password") or ""),
        )
        return {"message": "החשבון נוצר בהצלחה — ניתן להתחבר", "user": user}
    except ValueError as e:
        return JSONResponse({"error": str(e)}, status_code=400)
    except Exception as e:
        traceback.print_exc()
        return JSONResponse({"error": f"שגיאת שרת: {str(e)}"}, status_code=500)


@router.post("/register")
def register_disabled():
    return JSONResponse(
        {"error": "ההרשמה מתבצעת רק דרך קישור הזמנה מהמנהל"},
        status_code=403,
    )


@router.get("/verify-email")
def verify_email(
    token: str = Query(...),
    service: AuthService = Depends(get_auth_service),
):
    try:
        found, already = service.verify_email_token(token)
        if not found:
            return JSONResponse({"error": "משתמש לא נמצא"}, status_code=404)
        return {"ok": True, "already_verified": already}
    except ValueError as e:
        return JSONResponse({"error": str(e)}, status_code=400)


@router.post("/resend-verification")
def resend_verification(
    data: dict[str, Any] | None = Body(default=None),
    service: AuthService = Depends(get_auth_service),
):
    email = str((data or {}).get("email") or "").strip()
    if not email:
        return JSONResponse({"error": "נדרש אימייל"}, status_code=400)
    service.resend_verification(email)
    return {"message": "אם החשבון קיים וטרם אומת, נשלח קישור אימות לאימייל"}


@router.post("/login")
def login(
    request: Request,
    data: dict[str, Any] | None = Body(default=None),
    service: AuthService = Depends(get_auth_service),
):
    try:
        if not data:
            return JSONResponse({"error": "חסרים נתונים"}, status_code=400)
        email = data.get("email")
        password = data.get("password")
        if not email:
            return JSONResponse({"error": "נדרש אימייל"}, status_code=400)
        if password is None or str(password).strip() == "":
            return JSONResponse({"error": "נדרשת סיסמה"}, status_code=400)
        user, err = service.try_login(str(email).strip(), str(password))
        if err == "unverified":
            return JSONResponse({"error": "יש לאמת את האימייל לפני ההתחברות"}, status_code=403)
        if err == "inactive":
            return JSONResponse({"error": "המשתמש אינו פעיל"}, status_code=403)
        if err or not user:
            return JSONResponse({"error": "אימייל או סיסמה שגויים"}, status_code=401)
        request.session["user_id"] = user["id"]
        request.session["user_role"] = user["role"]
        request.session["user_email"] = user["email"]
        return {"message": "התחברות הצליחה", "user": user}
    except OperationalError:
        traceback.print_exc()
        return JSONResponse(
            {"error": "מסד הנתונים לא זמין — בדקו את DATABASE_URL והפעילו מחדש את השרת"},
            status_code=503,
        )
    except SQLAlchemyError:
        traceback.print_exc()
        return JSONResponse({"error": "שגיאת מסד נתונים — נסו שוב"}, status_code=503)
    except Exception as e:
        traceback.print_exc()
        return JSONResponse({"error": f"שגיאת שרת: {str(e)}"}, status_code=500)


@router.post("/logout")
def logout(request: Request):
    request.session.clear()
    return {"message": "התנתקות הצליחה"}


@router.get("/logout")
def logout_get(request: Request):
    """Fallback for browsers that block POST logout (e.g. embedded preview)."""
    request.session.clear()
    return {"message": "התנתקות הצליחה"}


@router.get("/me")
def get_current_user(
    request: Request,
    service: AuthService = Depends(get_auth_service),
):
    user_id = request.session.get("user_id")
    if not user_id:
        return JSONResponse({"error": "לא מחובר"}, status_code=401)
    user = service.get_user_by_id(str(user_id))
    if not user:
        return JSONResponse({"error": "משתמש לא נמצא"}, status_code=404)
    return {"user": user}
