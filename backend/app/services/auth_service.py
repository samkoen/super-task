from typing import Literal, Optional

from app.core.security import verify_password
from app.db import mappers as mp
from app.repositories.user_repository import UserRepository
from app.services.email import send_verification_email

LoginError = Literal["invalid", "unverified", "inactive"]


class AuthService:
    def __init__(self, user_repository: UserRepository):
        self.user_repository = user_repository

    def try_login(self, email: str, password: str) -> tuple[Optional[dict], Optional[LoginError]]:
        plain = (password or "").strip()
        if not plain:
            return None, "invalid"

        user, pwd_hash = self.user_repository.get_user_and_password_hash((email or "").strip())
        if not user or not pwd_hash or not verify_password(plain, pwd_hash):
            return None, "invalid"
        if not user.is_active:
            return None, "inactive"
        if not user.email_verified:
            return None, "unverified"
        return mp.user_domain_to_api(user), None

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

    def get_user_by_id(self, user_id: str) -> Optional[dict]:
        user = self.user_repository.find_by_id(user_id)
        if not user or not user.is_active:
            return None
        return mp.user_domain_to_api(user)
