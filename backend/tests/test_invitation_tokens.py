import uuid

from app.core.security import create_invitation_token, decode_invitation_token


def test_invitation_token_roundtrip():
    inv_id = str(uuid.uuid4())
    token = create_invitation_token(inv_id)
    assert decode_invitation_token(token) == inv_id


def test_invitation_token_invalid():
    assert decode_invitation_token("not-a-jwt") is None
