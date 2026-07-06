"""Chargement du contexte acteur depuis la session."""

from fastapi import HTTPException, Request, status

from app.auth.session_roles import require_user_id, session_user_role
from app.domain.scope import ActorContext
from app.repositories.user_repository import UserRepository


def load_actor(request: Request, user_repo: UserRepository) -> ActorContext:
    user_id = require_user_id(request)
    user = user_repo.find_by_id(user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="לא מחובר")
    # Always use DB role — session may be stale after migrations or role changes.
    role = user.role
    if role != (session_user_role(request) or ""):
        request.session["user_role"] = role
    return ActorContext(
        user_id=user_id,
        role=role,
        network_id=user.network_id,
        branch_id=user.branch_id,
    )
