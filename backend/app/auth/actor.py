"""Chargement du contexte acteur depuis la session + DB (source de vérité)."""

from fastapi import HTTPException, Request, status

from app.auth.session_roles import MANAGER_ROLES, require_user_id, session_user_role
from app.domain import roles
from app.domain.scope import ActorContext
from app.domain.user_membership import resolve_active_branch_id
from app.repositories.user_branch_membership_repository import UserBranchMembershipRepository
from app.repositories.user_repository import UserRepository

SESSION_ACTIVE_BRANCH_KEY = "active_branch_id"


def load_actor(request: Request, user_repo: UserRepository) -> ActorContext:
    user_id = require_user_id(request)
    user = user_repo.find_by_id(user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="לא מחובר")
    if not user.is_active:
        request.session.clear()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="החשבון אינו פעיל",
        )
    role = user.role
    if role != (session_user_role(request) or ""):
        request.session["user_role"] = role

    membership_ids: tuple[str, ...] = ()
    active_branch = user.branch_id
    if role == roles.EMPLOYEE:
        membership_repo = UserBranchMembershipRepository(user_repo._db)
        ids = membership_repo.list_branch_ids_for_user(user_id)
        if user.branch_id and user.branch_id not in ids:
            ids = [user.branch_id, *ids]
        membership_ids = tuple(ids)
        active_branch = resolve_active_branch_id(
            membership_branch_ids=list(membership_ids),
            primary_branch_id=user.branch_id,
            requested_branch_id=request.session.get(SESSION_ACTIVE_BRANCH_KEY),
        )
        if active_branch:
            request.session[SESSION_ACTIVE_BRANCH_KEY] = active_branch

    return ActorContext(
        user_id=user_id,
        role=role,
        network_id=user.network_id,
        branch_id=active_branch,
        membership_branch_ids=membership_ids,
    )


def require_admin_actor(request: Request, user_repo: UserRepository) -> ActorContext:
    actor = load_actor(request, user_repo)
    if actor.role != roles.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="למנהלי מערכת בלבד",
        )
    return actor


def require_manager_actor(request: Request, user_repo: UserRepository) -> ActorContext:
    actor = load_actor(request, user_repo)
    if actor.role not in MANAGER_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="למנהלים בלבד",
        )
    return actor
