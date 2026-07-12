from app.core import config
from app.db import mappers as mp
from app.domain import job_functions, roles
from app.domain.employee_language import normalize_employee_language
from app.domain.scope import ActorContext, assert_branch_visible
from app.domain.task_scope import can_manage_tasks, visible_branch_ids_for_tasks
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

    def create_team_employee(
        self,
        actor: ActorContext,
        *,
        email: str,
        password: str,
        first_name: str,
        last_name: str,
        phone: str | None = None,
        job_function: str | None = None,
        branch_id: str | None = None,
        preferred_language: str | None = None,
    ) -> dict:
        if not can_manage_tasks(actor):
            raise PermissionError("אין הרשאה ליצור עובד")
        roles.assert_can_invite(actor.role, roles.EMPLOYEE)
        self._validate_team_employee_fields(
            email, password, first_name, last_name, job_function, require_job_function=True
        )
        if self._repo.count_by_email(email) > 0:
            raise ValueError("המזהה כבר קיים")
        scope = self._scope.resolve_for_role(
            roles.EMPLOYEE,
            network_id=None,
            branch_id=branch_id,
            inviter_role=actor.role,
            inviter_network_id=actor.network_id,
            inviter_branch_id=actor.branch_id,
        )
        user = self._repo.create_user(
            email=email,
            password=password,
            first_name=first_name.strip(),
            last_name=last_name.strip(),
            role=roles.EMPLOYEE,
            phone=(phone or "").strip() or None,
            job_function=job_function,
            network_id=scope.network_id,
            branch_id=scope.branch_id,
            preferred_language=normalize_employee_language(preferred_language),
            email_verified=True,
        )
        return self._to_api(user)

    def update_team_employee(
        self,
        actor: ActorContext,
        user_id: str,
        *,
        email: str,
        first_name: str,
        last_name: str,
        phone: str | None = None,
        job_function: str | None = None,
        password: str | None = None,
        preferred_language: str | None = None,
    ) -> dict:
        target = self._repo.find_by_id(user_id)
        if not target:
            raise ValueError("משתמש לא נמצא")
        self._assert_can_manage_team_member(actor, target)
        self._validate_team_employee_fields(
            email,
            password or "123456",
            first_name,
            last_name,
            job_function,
            require_job_function=True,
            password_required=bool((password or "").strip()),
        )
        existing = self._repo.find_by_email(email)
        if existing and existing.id != user_id:
            raise ValueError("המזהה כבר קיים")
        updated = self._repo.update_employee(
            user_id,
            first_name=first_name.strip(),
            last_name=last_name.strip(),
            email=email,
            phone=(phone or "").strip() or None,
            job_function=job_function,
            password=(password or "").strip() or None,
            preferred_language=normalize_employee_language(preferred_language)
            if preferred_language is not None
            else None,
        )
        assert updated is not None
        return self._to_api(updated)

    def deactivate_team_employee(self, actor: ActorContext, user_id: str) -> dict:
        return self.set_team_employee_access(actor, user_id, is_active=False)

    def set_team_employee_access(
        self, actor: ActorContext, user_id: str, *, is_active: bool
    ) -> dict:
        if not is_active and actor.user_id == user_id:
            raise ValueError("לא ניתן להשבית את עצמך")
        target = self._repo.find_by_id(user_id)
        if not target:
            raise ValueError("משתמש לא נמצא")
        self._assert_can_manage_team_member(actor, target)
        updated = self._repo.set_active(user_id, is_active)
        assert updated is not None
        return self._to_api(updated)

    def reset_team_employee_password(
        self, actor: ActorContext, user_id: str, *, password: str
    ) -> dict:
        if len((password or "").strip()) < config.PASSWORD_MIN_LENGTH:
            raise ValueError("הסיסמה קצרה מדי")
        target = self._repo.find_by_id(user_id)
        if not target:
            raise ValueError("משתמש לא נמצא")
        self._assert_can_manage_team_member(actor, target)
        updated = self._repo.update_password(user_id, password.strip())
        assert updated is not None
        return self._to_api(updated)

    def _assert_can_manage_team_member(self, actor: ActorContext, target) -> None:
        if not can_manage_tasks(actor):
            raise PermissionError("אין הרשאה לנהל עובד זה")
        if target.role != roles.EMPLOYEE:
            raise PermissionError("ניתן לנהל רק עובדים")
        if not target.branch_id:
            raise PermissionError("אין הרשאה לנהל עובד זה")
        branch_ids = visible_branch_ids_for_tasks(actor, self._branch)
        if branch_ids is not None and target.branch_id not in branch_ids:
            raise PermissionError("אין הרשאה לנהל עובד זה")
        branch = self._branch.find_by_id(target.branch_id)
        if branch:
            assert_branch_visible(actor, branch.network_id, branch.id)

    def _validate_team_employee_fields(
        self,
        email: str,
        password: str,
        first_name: str,
        last_name: str,
        job_function: str | None,
        *,
        require_job_function: bool = False,
        password_required: bool = True,
    ) -> None:
        if not (email or "").strip():
            raise ValueError("נדרש מזהה")
        if password_required and len((password or "").strip()) < config.PASSWORD_MIN_LENGTH:
            raise ValueError("הסיסמה קצרה מדי")
        if not (first_name or "").strip() or not (last_name or "").strip():
            raise ValueError("יש למלא שם פרטי ושם משפחה")
        if require_job_function and not job_functions.is_valid_job_function(job_function):
            raise ValueError("נדרש תפקיד עובד")

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
