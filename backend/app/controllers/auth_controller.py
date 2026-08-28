import traceback

from typing import Any

from fastapi import APIRouter, Body, Depends, File, HTTPException, Query, Request, UploadFile
from fastapi.responses import JSONResponse
from sqlalchemy.exc import OperationalError, SQLAlchemyError
from sqlalchemy.orm import Session

from app.auth.actor import (
    SESSION_ACTIVE_BRANCH_KEY,
    SESSION_PREVIEW_AS_KEY,
    clear_preview_session,
    load_actor,
    load_real_actor,
)
from app.auth.session_roles import MANAGER_ROLES
from app.controllers.controller_helpers import handle_controller_errors
from app.dependencies import get_db
from app.domain.view_as import attach_preview_meta
from app.repositories.invitation_repository import InvitationRepository
from app.repositories.user_repository import UserRepository
from app.services.auth_service import AuthService
from app.services.invitation_service import InvitationService
from app.services.media_upload_service import upload_attachment
from app.services.view_as_service import ViewAsService

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
        clear_preview_session(request)
        if user.get("active_branch_id"):
            request.session[SESSION_ACTIVE_BRANCH_KEY] = user["active_branch_id"]
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
    if not request.session.get("user_id"):
        return JSONResponse({"error": "לא מחובר"}, status_code=401)
    try:
        user = _session_user_payload(request, service)
    except HTTPException as exc:
        return JSONResponse({"error": exc.detail}, status_code=exc.status_code)
    return {"user": user}


@router.patch("/me")
def update_current_user(
    request: Request,
    data: dict[str, Any] | None = Body(default=None),
    service: AuthService = Depends(get_auth_service),
):
    user_id = request.session.get("user_id")
    if not user_id:
        return JSONResponse({"error": "לא מחובר"}, status_code=401)
    if request.session.get(SESSION_PREVIEW_AS_KEY):
        return JSONResponse({"error": "לא ניתן לערוך פרופיל במצב צפייה כעובד"}, status_code=403)
    payload = data or {}
    try:
        user = service.update_me(
            str(user_id),
            first_name=str(payload.get("first_name") or ""),
            last_name=str(payload.get("last_name") or ""),
            phone=(str(payload.get("phone")).strip() if payload.get("phone") else None),
            email=str(payload.get("email") or ""),
            preferred_language=(
                str(payload.get("preferred_language"))
                if "preferred_language" in payload
                else None
            ),
            active_branch_id=request.session.get("active_branch_id"),
        )
    except ValueError as e:
        return JSONResponse({"error": str(e)}, status_code=400)
    request.session["user_email"] = user["email"]
    return {"message": "הפרופיל עודכן", "user": user}


@router.post("/me/avatar")
async def upload_my_avatar(
    request: Request,
    file: UploadFile = File(...),
    service: AuthService = Depends(get_auth_service),
):
    user_id = request.session.get("user_id")
    if not user_id:
        return JSONResponse({"error": "לא מחובר"}, status_code=401)
    if request.session.get(SESSION_PREVIEW_AS_KEY):
        return JSONResponse({"error": "לא ניתן לערוך פרופיל במצב צפייה כעובד"}, status_code=403)
    uploaded = await upload_attachment(kind="photo", folder="avatars", file=file)
    try:
        user = service.set_my_avatar(
            str(user_id),
            uploaded["url"],
            active_branch_id=request.session.get(SESSION_ACTIVE_BRANCH_KEY),
        )
    except ValueError as e:
        return JSONResponse({"error": str(e)}, status_code=400)
    return {"message": "התמונה עודכנה", "user": user, "url": uploaded["url"]}


@router.post("/change-password")
def change_password(
    request: Request,
    data: dict[str, Any] | None = Body(default=None),
    service: AuthService = Depends(get_auth_service),
):
    user_id = request.session.get("user_id")
    if not user_id:
        return JSONResponse({"error": "לא מחובר"}, status_code=401)
    if request.session.get(SESSION_PREVIEW_AS_KEY):
        return JSONResponse({"error": "לא ניתן לערוך פרופיל במצב צפייה כעובד"}, status_code=403)
    payload = data or {}
    try:
        service.change_password(
            str(user_id),
            current_password=str(payload.get("current_password") or ""),
            new_password=str(payload.get("new_password") or ""),
        )
    except PermissionError as e:
        return JSONResponse({"error": str(e)}, status_code=403)
    except ValueError as e:
        return JSONResponse({"error": str(e)}, status_code=400)
    return {"message": "הסיסמה עודכנה"}


@router.post("/active-branch")
def set_active_branch(
    request: Request,
    data: dict[str, Any] | None = Body(default=None),
    service: AuthService = Depends(get_auth_service),
):
    if not request.session.get("user_id"):
        return JSONResponse({"error": "לא מחובר"}, status_code=401)
    branch_id = str((data or {}).get("branch_id") or "").strip()
    if not branch_id:
        return JSONResponse({"error": "נדרש סניף"}, status_code=400)
    try:
        actor = load_actor(request, service.user_repository)
        user = service.set_active_branch(actor.user_id, branch_id)
    except PermissionError as e:
        return JSONResponse({"error": str(e)}, status_code=403)
    except ValueError as e:
        return JSONResponse({"error": str(e)}, status_code=400)
    request.session[SESSION_ACTIVE_BRANCH_KEY] = user["active_branch_id"]
    preview_id = request.session.get(SESSION_PREVIEW_AS_KEY)
    if preview_id:
        real = service.get_user_by_id(str(request.session["user_id"]))
        if real:
            user = attach_preview_meta(user, real)
    return {"user": user}


@router.post("/view-as")
@handle_controller_errors
def start_view_as(
    request: Request,
    data: dict[str, Any] | None = Body(default=None),
    service: AuthService = Depends(get_auth_service),
):
    actor = load_real_actor(request, service.user_repository)
    if actor.role not in MANAGER_ROLES:
        raise PermissionError("למנהלים בלבד")
    employee_id = str((data or {}).get("user_id") or "").strip()
    if not employee_id:
        raise ValueError("נדרש עובד")
    preview = ViewAsService(service.user_repository).start(actor, employee_id)
    request.session[SESSION_PREVIEW_AS_KEY] = employee_id
    if preview.get("active_branch_id"):
        request.session[SESSION_ACTIVE_BRANCH_KEY] = preview["active_branch_id"]
    real = service.get_user_by_id(actor.user_id)
    return {"user": attach_preview_meta(preview, real or {})}


@router.post("/exit-view-as")
@handle_controller_errors
def exit_view_as(
    request: Request,
    service: AuthService = Depends(get_auth_service),
):
    actor = load_real_actor(request, service.user_repository)
    clear_preview_session(request)
    user = service.get_user_by_id(actor.user_id, active_branch_id=actor.branch_id)
    if not user:
        raise ValueError("משתמש לא נמצא")
    if user.get("active_branch_id"):
        request.session[SESSION_ACTIVE_BRANCH_KEY] = user["active_branch_id"]
    else:
        request.session.pop(SESSION_ACTIVE_BRANCH_KEY, None)
    user["is_preview"] = False
    return {"user": user}


def _session_user_payload(request: Request, service: AuthService) -> dict:
    actor = load_actor(request, service.user_repository)
    user = service.get_user_by_id(
        actor.user_id,
        active_branch_id=request.session.get(SESSION_ACTIVE_BRANCH_KEY),
    )
    if not user:
        raise HTTPException(status_code=404, detail="משתמש לא נמצא")
    preview_id = request.session.get(SESSION_PREVIEW_AS_KEY)
    real_id = str(request.session.get("user_id") or "")
    if preview_id and real_id:
        real = service.get_user_by_id(real_id)
        if real:
            user = attach_preview_meta(user, real)
    if user.get("active_branch_id"):
        request.session[SESSION_ACTIVE_BRANCH_KEY] = user["active_branch_id"]
    return user
