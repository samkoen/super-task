"""Vérification du rôle via session Starlette."""
from __future__ import annotations

from fastapi import HTTPException, Request, status

ADMIN = "admin"
MANAGER_ROLES = frozenset({"admin", "network_manager", "branch_manager"})


def session_user_role(request: Request) -> str | None:
    role = request.session.get("user_role")
    return str(role) if role else None


def require_user_id(request: Request) -> str:
    uid = request.session.get("user_id")
    if not uid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="לא מחובר",
        )
    return str(uid)


def require_admin_user_id(request: Request) -> str:
    if session_user_role(request) != ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="למנהלי מערכת בלבד",
        )
    uid = request.session.get("user_id")
    if not uid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="סשן לא תקין",
        )
    return str(uid)


def require_manager(request: Request) -> tuple[str, str]:
    role = session_user_role(request)
    if role not in MANAGER_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="למנהלים בלבד",
        )
    uid = request.session.get("user_id")
    if not uid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="לא מחובר",
        )
    return str(uid), role
