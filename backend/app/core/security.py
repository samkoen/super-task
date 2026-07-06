"""Hachage des mots de passe et jetons JWT (vérification e-mail)."""

from datetime import datetime, timedelta, timezone

import bcrypt
from jose import JWTError, jwt

from app.core import config

ALGORITHM = "HS256"
EMAIL_VERIFY_PURPOSE = "email_verify"
INVITE_PURPOSE = "user_invite"


def hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    if not hashed:
        return False
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


def create_email_verification_token(user_id: str) -> str:
    hours = config.EMAIL_VERIFY_EXPIRE_HOURS
    expire = datetime.now(timezone.utc) + timedelta(hours=hours)
    payload = {"sub": str(user_id), "purpose": EMAIL_VERIFY_PURPOSE, "exp": expire}
    return jwt.encode(payload, config.SECRET_KEY, algorithm=ALGORITHM)


def decode_email_verification_token(token: str) -> str | None:
    try:
        data = jwt.decode(token, config.SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        return None
    if data.get("purpose") != EMAIL_VERIFY_PURPOSE:
        return None
    sub = data.get("sub")
    return str(sub) if sub else None


def create_invitation_token(invitation_id: str) -> str:
    hours = config.INVITE_EXPIRE_HOURS
    expire = datetime.now(timezone.utc) + timedelta(hours=hours)
    payload = {"sub": str(invitation_id), "purpose": INVITE_PURPOSE, "exp": expire}
    return jwt.encode(payload, config.SECRET_KEY, algorithm=ALGORITHM)


def decode_invitation_token(token: str) -> str | None:
    try:
        data = jwt.decode(token, config.SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        return None
    if data.get("purpose") != INVITE_PURPOSE:
        return None
    sub = data.get("sub")
    return str(sub) if sub else None
