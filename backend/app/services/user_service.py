from app.core import config
from app.db import mappers as mp
from app.domain import roles
from app.domain.scope import ActorContext
from app.domain.task_scope import visible_branch_ids_for_tasks
from app.repositories.branch_repository import BranchRepository
from app.repositories.network_repository import NetworkRepository
from app.repositories.user_repository import UserRepository
from app.services.email import send_verification_email
from app.services.user_scope_service import UserScopeService


class UserService:
    def __init__(
        self,
        repository: UserRepository,
        scope_service: UserScopeService,
        network_repo: NetworkRepository,
        branch_repo: BranchRepository,
    ):
        self._repo = repository
        self._scope = scope_service
        self._network = network_repo
        self._branch = branch_repo

    def list_users(self, role: str | None = None) -> list[dict]:
        if role and not roles.is_valid_role(role):
            raise ValueError("תפקיד לא תקין")
        users = self._repo.list_users(role=role or None)
        return [self._to_api(u) for u in users]

    def list_team(self, actor: ActorContext, role: str | None = None) -> list[dict]:
        from app.domain.task_scope import can_manage_tasks

        if not can_manage_tasks(actor):
            raise PermissionError("אין הרשאה לצפות בצוות")
        if role and not roles.is_valid_role(role):
            raise ValueError("תפקיד לא תקין")
        branch_ids = visible_branch_ids_for_tasks(actor, self._branch)
        if branch_ids == []:
            return []
        users = self._repo.list_users(role=role or None, branch_ids=branch_ids)
        return [self._to_api(u) for u in users]

    def create_user(
        self,
        *,
        email: str,
        password: str,
        first_name: str,
        last_name: str,
        role: str,
        network_id: str | None = None,
        branch_id: str | None = None,
        skip_verification_email: bool = False,
    ) -> dict:
        self._validate_new_user(email, password, first_name, last_name, role)
        roles.assert_admin_creatable(role)
        scope = self._scope.resolve_for_role(role, network_id=network_id, branch_id=branch_id)
        user = self._repo.create_user(
            email=email,
            password=password,
            first_name=first_name.strip(),
            last_name=last_name.strip(),
            role=role,
            email_verified=False,
            network_id=scope.network_id,
            branch_id=scope.branch_id,
        )
        if not skip_verification_email:
            send_verification_email(user.email, user.id, user.full_name)
        return self._to_api(user)

    def update_user_scope(
        self,
        user_id: str,
        *,
        network_id: str | None = None,
        branch_id: str | None = None,
    ) -> dict:
        user = self._repo.find_by_id(user_id)
        if not user:
            raise ValueError("משתמש לא נמצא")
        if user.role == roles.ADMIN:
            raise ValueError("לא ניתן לשייך רשת/סניף למנהל מערכת")
        scope = self._scope.resolve_for_role(
            user.role, network_id=network_id, branch_id=branch_id
        )
        updated = self._repo.update_scope(
            user_id, network_id=scope.network_id, branch_id=scope.branch_id
        )
        assert updated is not None
        return self._to_api(updated)

    def resend_verification(self, email: str) -> bool:
        user = self._repo.find_by_email(email)
        if not user or not user.is_active or user.email_verified:
            return False
        return send_verification_email(user.email, user.id, user.full_name)

    def _to_api(self, user) -> dict:
        data = mp.user_domain_to_api(user)
        if user.network_id:
            network = self._network.find_by_id(user.network_id)
            data["network_name"] = network.name if network else None
        if user.branch_id:
            branch = self._branch.find_by_id(user.branch_id)
            data["branch_name"] = branch.name if branch else None
        return data

    def _validate_new_user(
        self,
        email: str,
        password: str,
        first_name: str,
        last_name: str,
        role: str,
    ) -> None:
        if not (email or "").strip():
            raise ValueError("נדרש אימייל")
        if len((password or "").strip()) < config.PASSWORD_MIN_LENGTH:
            raise ValueError("הסיסמה קצרה מדי")
        if not (first_name or "").strip() or not (last_name or "").strip():
            raise ValueError("יש למלא שם פרטי ושם משפחה")
        if not roles.is_valid_role(role):
            raise ValueError("תפקיד לא תקין")
        if self._repo.count_by_email(email) > 0:
            raise ValueError("האימייל כבר קיים")
