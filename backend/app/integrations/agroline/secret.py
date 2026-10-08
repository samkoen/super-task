"""Chiffrement du mot de passe Agroline. La clé vient de SECRET_KEY."""
from __future__ import annotations

import base64
import hashlib

from cryptography.fernet import Fernet, InvalidToken

from app.core.config import SECRET_KEY


def encrypt_password(password: str) -> str:
    return _fernet().encrypt(password.encode("utf-8")).decode("ascii")


def decrypt_password(stored: str) -> str:
    try:
        return _fernet().decrypt(stored.encode("ascii")).decode("utf-8")
    except InvalidToken as exc:
        raise ValueError("לא ניתן לקרוא את סיסמת אגרוליין") from exc


def _fernet() -> Fernet:
    digest = hashlib.sha256(SECRET_KEY.encode("utf-8")).digest()
    return Fernet(base64.urlsafe_b64encode(digest))
