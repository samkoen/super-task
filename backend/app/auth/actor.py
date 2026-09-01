"""Chargement du contexte acteur depuis la session + DB (source de vérité)."""

from fastapi import HTTPException, Request, status

from app.auth.session_roles import MANAGER_ROLES, require_user_id, session_user_role
from app.domain import roles
from app.domain.scope import ActorContext
from app.domain.task_scope import visible_branch_ids_for_tasks
from app.domain.user_membership import resolve_active_branch_id
from app.domain.view_as import can_view_as_employee
from app.repositories.branch_repository import BranchRepository
from app.repositories.user_branch_membership_repository import UserBranchMembershipRepository
from app.repositories.user_repository import UserRepository

SESSION_ACTIVE_BRANCH_KEY = "active_branch_id"
SESSION_PREVIEW_AS_KEY = "preview_as_user_id"


def load_real_actor(request: Request, user_repo: UserRepository) -> ActorContext:
    """Acteur réellement connecté (ignore le mode צפייה כעובד)."""
    user = _session_user(request, user_repo)
    return _actor_for_user(request, user_repo, user, sync_session_role=True)


def load_actor(request: Request, user_repo: UserRepository) -> ActorContext:
    real = load_real_actor(request, user_repo)
    preview = _preview_employee_actor(request, user_repo, real)
    return preview or real


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


def clear_preview_session(request: Request) -> None:
    request.session.pop(SESSION_PREVIEW_AS_KEY, None)


def session_acting_user_id(request: Request) -> str | None:
    """Utilisateur effectif : oved en צפייה כעובד, sinon le compte connecté."""
    preview = request.session.get(SESSION_PREVIEW_AS_KEY)
    if preview:
        return str(preview)
    uid = request.session.get("user_id")
    return str(uid) if uid else None


def _session_user(request: Request, user_repo: UserRepository):
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
    return user


def _actor_for_user(
    request: Request,
    user_repo: UserRepository,
    user,
    *,
    sync_session_role: bool,
) -> ActorContext:
    role = user.role
    if sync_session_role and role != (session_user_role(request) or ""):
        request.session["user_role"] = role
    membership_ids: tuple[str, ...] = ()
    active_branch = user.branch_id
    if role == roles.EMPLOYEE:
        membership_ids, active_branch = _resolve_employee_branch(request, user_repo, user)
    return ActorContext(
        user_id=user.id,
        role=role,
        network_id=user.network_id,
        branch_id=active_branch,
        membership_branch_ids=membership_ids,
    )


def _resolve_employee_branch(request: Request, user_repo: UserRepository, user):
    membership_ids = _employee_membership_ids(user_repo, user)
    active_branch = resolve_active_branch_id(
        membership_branch_ids=list(membership_ids),
        primary_branch_id=user.branch_id,
        requested_branch_id=request.session.get(SESSION_ACTIVE_BRANCH_KEY),
    )
    if active_branch:
        request.session[SESSION_ACTIVE_BRANCH_KEY] = active_branch
    return membership_ids, active_branch


def _employee_membership_ids(user_repo: UserRepository, user) -> tuple[str, ...]:
    membership_repo = UserBranchMembershipRepository(user_repo._db)
    ids = membership_repo.list_branch_ids_for_user(user.id)
    if user.branch_id and user.branch_id not in ids:
        ids = [user.branch_id, *ids]
    return tuple(ids)


def _preview_employee_actor(
    request: Request,
    user_repo: UserRepository,
    real: ActorContext,
) -> ActorContext | None:
    preview_id = request.session.get(SESSION_PREVIEW_AS_KEY)
    if not preview_id:
        return None
    target = user_repo.find_by_id(str(preview_id))
    if not _preview_still_allowed(real, user_repo, target):
        clear_preview_session(request)
        return None
    return _actor_for_user(request, user_repo, target, sync_session_role=False)


def _preview_still_allowed(real: ActorContext, user_repo: UserRepository, target) -> bool:
    if real.role not in MANAGER_ROLES or not target:
        return False
    member_ids = list(_employee_membership_ids(user_repo, target))
    visible = visible_branch_ids_for_tasks(real, BranchRepository(user_repo._db))
    return can_view_as_employee(
        actor_role=real.role,
        visible_branch_ids=visible,
        target_role=target.role,
        target_is_active=bool(target.is_active),
        target_branch_ids=member_ids,
    )
