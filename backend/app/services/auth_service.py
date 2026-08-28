from typing import Literal, Optional

from app.core import config
from app.core.security import verify_password
from app.db import mappers as mp
from app.domain import roles
from app.domain.phone_login import login_key
from app.domain.user_membership import resolve_active_branch_id
from app.repositories.network_repository import NetworkRepository
from app.repositories.user_branch_membership_repository import UserBranchMembershipRepository
from app.repositories.user_repository import UserRepository
from app.services.email import send_verification_email

LoginError = Literal["invalid", "unverified", "inactive"]


class AuthService:
    def __init__(self, user_repository: UserRepository):
        self.user_repository = user_repository
        self._memberships = UserBranchMembershipRepository(user_repository._db)
        self._networks = NetworkRepository(user_repository._db)

    def try_login(self, email: str, password: str) -> tuple[Optional[dict], Optional[LoginError]]:
        plain = (password or "").strip()
        if not plain:
            return None, "invalid"

        user, pwd_hash = self.user_repository.get_user_and_password_hash(login_key(email or ""))
        if not user or not pwd_hash or not verify_password(plain, pwd_hash):
            return None, "invalid"
        if not user.is_active:
            return None, "inactive"
        if not user.email_verified:
            return None, "unverified"
        return self._user_api(user), None

    def resend_verification(self, email: str) -> None:
        user = self.user_repository.find_by_email(email)
        if not user or not user.is_active or user.email_verified:
            return
        send_verification_email(user.email, user.id, user.full_name)

    def verify_email_token(self, token: str) -> tuple[bool, bool]:
        from app.core.security import decode_email_verification_token

        user_id = decode_email_verification_token(token)
        if not user_id:
            raise ValueError("קישור האימות לא תקין או שפג תוקפו")
        user = self.user_repository.find_by_id(user_id)
        if not user:
            raise ValueError("משתמש לא נמצא")
        if user.email_verified:
            return True, True
        self.user_repository.mark_email_verified(user_id)
        return True, False

    def get_user_by_id(self, user_id: str, *, active_branch_id: str | None = None) -> Optional[dict]:
        user = self.user_repository.find_by_id(user_id)
        if not user or not user.is_active:
            return None
        return self._user_api(user, active_branch_id=active_branch_id)

    def update_me(
        self,
        user_id: str,
        *,
        first_name: str,
        last_name: str,
        phone: str | None = None,
        email: str,
        preferred_language: str | None = None,
        active_branch_id: str | None = None,
    ) -> dict:
        user = self.user_repository.find_by_id(user_id)
        if not user or not user.is_active:
            raise ValueError("משתמש לא נמצא")
        fn = (first_name or "").strip()
        ln = (last_name or "").strip()
        if not fn or not ln:
            raise ValueError("יש למלא שם פרטי ושם משפחה")
        login = login_key(email or "")
        if not login:
            raise ValueError("נדרש מזהה")
        other = self.user_repository.find_by_email(login)
        if other and other.id != user_id:
            raise ValueError("המזהה כבר קיים")
        phone_val = (phone or "").strip() or None
        language = None
        if preferred_language is not None:
            from app.domain.employee_language import normalize_employee_language

            language = normalize_employee_language(preferred_language)
        updated = self.user_repository.update_profile(
            user_id,
            first_name=fn,
            last_name=ln,
            phone=phone_val,
            email=login,
            preferred_language=language,
        )
        assert updated is not None
        return self._user_api(updated, active_branch_id=active_branch_id)

    def set_my_avatar(
        self,
        user_id: str,
        avatar_url: str | None,
        *,
        excellence_slogan: str | None = None,
        active_branch_id: str | None = None,
    ) -> dict:
        from app.domain.avatar_url import normalize_avatar_url

        user = self.user_repository.find_by_id(user_id)
        if not user or not user.is_active:
            raise ValueError("משתמש לא נמצא")
        cleaned = normalize_avatar_url(avatar_url)
        updated = self.user_repository.update_avatar(
            user_id, cleaned, excellence_slogan=excellence_slogan
        )
        assert updated is not None
        return self._user_api(updated, active_branch_id=active_branch_id)

    def change_password(
        self, user_id: str, *, current_password: str, new_password: str
    ) -> None:
        user = self.user_repository.find_by_id(user_id)
        if not user or not user.is_active:
            raise ValueError("משתמש לא נמצא")
        current = (current_password or "").strip()
        new = (new_password or "").strip()
        if len(new) < config.PASSWORD_MIN_LENGTH:
            raise ValueError("הסיסמה קצרה מדי")
        _, pwd_hash = self.user_repository.get_user_and_password_hash(user.email)
        if not pwd_hash or not verify_password(current, pwd_hash):
            raise PermissionError("הסיסמה הנוכחית שגויה")
        self.user_repository.update_password(user_id, new)

    def set_active_branch(self, user_id: str, branch_id: str) -> dict:
        user = self.user_repository.find_by_id(user_id)
        if not user or not user.is_active:
            raise ValueError("משתמש לא נמצא")
        if user.role != roles.EMPLOYEE:
            raise ValueError("בחירת סניף זמינה לעובדים בלבד")
        bid = (branch_id or "").strip()
        memberships = self._memberships.list_for_user(user_id)
        member_ids = [m["branch_id"] for m in memberships]
        if user.branch_id and user.branch_id not in member_ids:
            member_ids = [user.branch_id, *member_ids]
        if bid not in member_ids:
            raise PermissionError("אין הרשאה לסניף זה")
        return self._user_api(user, active_branch_id=bid)

    def _user_api(self, user, *, active_branch_id: str | None = None) -> dict:
        payload = mp.user_domain_to_api(user)
        if user.network_id:
            network = self._networks.find_by_id(user.network_id)
            payload["network_name"] = network.name if network else None
        else:
            payload["network_name"] = None
        if user.role != roles.EMPLOYEE:
            payload["branches"] = []
            payload["active_branch_id"] = user.branch_id
            return payload
        branches = self._memberships.list_for_user(user.id)
        if user.branch_id and not any(b["branch_id"] == user.branch_id for b in branches):
            branches = [
                {
                    "branch_id": user.branch_id,
                    "branch_name": "",
                    "is_primary": True,
                },
                *branches,
            ]
        member_ids = [b["branch_id"] for b in branches]
        active = resolve_active_branch_id(
            membership_branch_ids=member_ids,
            primary_branch_id=user.branch_id,
            requested_branch_id=active_branch_id,
        )
        payload["branches"] = branches
        payload["active_branch_id"] = active
        payload["branch_id"] = active or user.branch_id
        return payload
