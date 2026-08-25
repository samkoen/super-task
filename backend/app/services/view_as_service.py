"""Démarrage / arrêt du mode test « צפייה כעובד »."""

from app.domain.scope import ActorContext
from app.domain.task_scope import visible_branch_ids_for_tasks
from app.domain.view_as import can_view_as_employee
from app.repositories.branch_repository import BranchRepository
from app.repositories.user_branch_membership_repository import UserBranchMembershipRepository
from app.repositories.user_repository import UserRepository
from app.services.auth_service import AuthService


class ViewAsService:
    def __init__(self, user_repository: UserRepository):
        self._users = user_repository
        self._auth = AuthService(user_repository)
        self._memberships = UserBranchMembershipRepository(user_repository._db)
        self._branches = BranchRepository(user_repository._db)

    def start(self, actor: ActorContext, employee_id: str) -> dict:
        target = self._users.find_by_id((employee_id or "").strip())
        if not target:
            raise ValueError("משתמש לא נמצא")
        if not self._allowed(actor, target):
            raise PermissionError("אין הרשאה לצפות כעובד זה")
        payload = self._auth.get_user_by_id(target.id)
        if not payload:
            raise ValueError("משתמש לא נמצא")
        return payload

    def _allowed(self, actor: ActorContext, target) -> bool:
        member_ids = self._memberships.list_branch_ids_for_user(target.id)
        if target.branch_id and target.branch_id not in member_ids:
            member_ids = [target.branch_id, *member_ids]
        visible = visible_branch_ids_for_tasks(actor, self._branches)
        return can_view_as_employee(
            actor_role=actor.role,
            visible_branch_ids=visible,
            target_role=target.role,
            target_is_active=bool(target.is_active),
            target_branch_ids=member_ids,
        )
