import uuid

import pytest

from app.core import config
from app.core.security import (
    create_email_verification_token,
    decode_email_verification_token,
)


def test_email_verification_token_roundtrip():
    user_id = str(uuid.uuid4())
    token = create_email_verification_token(user_id)
    assert decode_email_verification_token(token) == user_id


def test_email_verification_token_invalid():
    assert decode_email_verification_token("not-a-jwt") is None


def test_email_verification_token_wrong_secret():
    user_id = str(uuid.uuid4())
    token = create_email_verification_token(user_id)
    old = config.SECRET_KEY
    config.SECRET_KEY = "other-secret"
    try:
        assert decode_email_verification_token(token) is None
    finally:
        config.SECRET_KEY = old
