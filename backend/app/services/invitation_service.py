from datetime import datetime, timezone, timedelta

from app.core import config
from app.core.security import decode_invitation_token
from app.db import mappers as mp
from app.domain import invitation_status, job_functions, roles
from app.repositories.branch_repository import BranchRepository
from app.repositories.invitation_repository import InvitationRepository
from app.repositories.network_repository import NetworkRepository
from app.repositories.user_repository import UserRepository
from app.services.email import send_invitation_email
from app.services.user_scope_service import UserScopeService


class InvitationService:
    def __init__(
        self,
        invitation_repository: InvitationRepository,
        user_repository: UserRepository,
        scope_service: UserScopeService,
        branch_repo: BranchRepository,
        network_repo: NetworkRepository,
    ):
        self._invites = invitation_repository
        self._users = user_repository
        self._scope = scope_service
        self._branch = branch_repo
        self._network = network_repo

    def create_invitation(
        self,
        *,
        inviter_id: str,
        inviter_role: str,
        email: str,
        role: str,
        job_function: str | None,
        network_id: str | None = None,
        branch_id: str | None = None,
    ) -> dict:
        inviter = self._users.find_by_id(inviter_id)
        if not inviter:
            raise ValueError("מזמין לא נמצא")
        self._validate_create(inviter_role, email, role, job_function)
        scope = self._scope.resolve_for_role(
            role,
            network_id=network_id,
            branch_id=branch_id,
            inviter_role=inviter_role,
            inviter_network_id=inviter.network_id,
            inviter_branch_id=inviter.branch_id,
        )
        if self._users.count_by_email(email) > 0:
            raise ValueError("האימייל כבר רשום במערכת")
        if self._invites.find_pending_by_email(email):
            raise ValueError("כבר קיימת הזמנה ממתינה לכתובת זו")
        expires_at = datetime.now(timezone.utc) + timedelta(hours=config.INVITE_EXPIRE_HOURS)
        inv = self._invites.create(
            email=email,
            role=role,
            job_function=job_function,
            invited_by_id=inviter_id,
            expires_at=expires_at,
            network_id=scope.network_id,
            branch_id=scope.branch_id,
        )
        send_invitation_email(inv.email, inv.id, inv.role, inv.job_function)
        return self._invitation_api(inv)

    def list_invitations(self, *, inviter_id: str, inviter_role: str) -> list[dict]:
        if inviter_role == roles.ADMIN:
            items = self._invites.list_invitations()
        else:
            items = self._invites.list_invitations(invited_by_id=inviter_id)
        return [self._invitation_api(inv) for inv in items]

    def cancel_invitation(self, invitation_id: str, *, inviter_id: str, inviter_role: str) -> None:
        inv = self._require_manageable(invitation_id, inviter_id, inviter_role)
        if inv.status != invitation_status.PENDING:
            raise ValueError("לא ניתן לבטל הזמנה זו")
        self._invites.update_status(inv.id, invitation_status.CANCELLED)

    def preview(self, token: str) -> dict:
        inv = self._resolve_pending_token(token)
        return self._invitation_api(inv)

    def accept_invitation(
        self,
        *,
        token: str,
        first_name: str,
        last_name: str,
        password: str,
    ) -> dict:
        inv = self._resolve_pending_token(token)
        if len((password or "").strip()) < config.PASSWORD_MIN_LENGTH:
            raise ValueError("הסיסמה קצרה מדי")
        if not (first_name or "").strip() or not (last_name or "").strip():
            raise ValueError("יש למלא שם פרטי ושם משפחה")
        if self._users.count_by_email(inv.email) > 0:
            raise ValueError("האימייל כבר רשום במערכת")
        user = self._users.create_user(
            email=inv.email,
            password=password,
            first_name=first_name.strip(),
            last_name=last_name.strip(),
            role=inv.role,
            job_function=inv.job_function,
            email_verified=True,
            network_id=inv.network_id,
            branch_id=inv.branch_id,
        )
        self._invites.update_status(inv.id, invitation_status.ACCEPTED)
        return mp.user_domain_to_api(user)

    def _invitation_api(self, inv) -> dict:
        data = mp.invitation_domain_to_api(inv)
        if inv.status == invitation_status.PENDING:
            expires = datetime.fromisoformat(inv.expires_at.replace("Z", "+00:00"))
            if expires.tzinfo is None:
                expires = expires.replace(tzinfo=timezone.utc)
            if datetime.now(timezone.utc) > expires:
                self._invites.update_status(inv.id, invitation_status.EXPIRED)
                data["status"] = invitation_status.EXPIRED
        if inv.network_id:
            network = self._network.find_by_id(inv.network_id)
            data["network_name"] = network.name if network else None
        if inv.branch_id:
            branch = self._branch.find_by_id(inv.branch_id)
            data["branch_name"] = branch.name if branch else None
        return data

    def _validate_create(
        self,
        inviter_role: str,
        email: str,
        role: str,
        job_function: str | None,
    ) -> None:
        if not (email or "").strip():
            raise ValueError("נדרש אימייל")
        if not roles.is_valid_role(role):
            raise ValueError("תפקיד לא תקין")
        roles.assert_can_invite(inviter_role, role)
        if role == roles.EMPLOYEE:
            if not job_function or not job_functions.is_valid_job_function(job_function):
                raise ValueError("יש לבחור תפקיד עובד")
        elif job_function:
            raise ValueError("תפקיד עובד רלוונטי לעובדים בלבד")

    def _resolve_pending_token(self, token: str):
        inv_id = decode_invitation_token(token)
        if not inv_id:
            raise ValueError("קישור ההזמנה לא תקין או שפג תוקפו")
        inv = self._invites.find_by_id(inv_id)
        if not inv:
            raise ValueError("ההזמנה לא נמצאה")
        if inv.status != invitation_status.PENDING:
            raise ValueError("ההזמנה כבר לא בתוקף")
        expires = datetime.fromisoformat(inv.expires_at.replace("Z", "+00:00"))
        if expires.tzinfo is None:
            expires = expires.replace(tzinfo=timezone.utc)
        if datetime.now(timezone.utc) > expires:
            self._invites.update_status(inv.id, invitation_status.EXPIRED)
            raise ValueError("קישור ההזמנה פג תוקף")
        return inv

    def _require_manageable(self, invitation_id: str, inviter_id: str, inviter_role: str):
        inv = self._invites.find_by_id(invitation_id)
        if not inv:
            raise ValueError("ההזמנה לא נמצאה")
        if inviter_role != roles.ADMIN and inv.invited_by_id != inviter_id:
            raise ValueError("אין הרשאה לנהל הזמנה זו")
        return inv
