import pytest

from app.domain import roles
from app.domain.scope import ActorContext
from app.domain.whatsapp_outreach import (
    VAR_MESSAGE,
    VAR_NAME,
    assert_can_send,
    build_template_variables,
    clean_recipient_name,
    employee_in_actor_scope,
    normalize_whatsapp_number,
    require_consent,
    resolve_short_text,
)


@pytest.mark.parametrize(
    "raw",
    ["0501234567", "050-123-4567", "050 123 4567", "+972501234567", "972501234567", "00972501234567"],
)
def test_israeli_mobile_converted_to_972(raw):
    assert normalize_whatsapp_number(raw) == "972501234567"


def test_international_number_with_plus_kept():
    assert normalize_whatsapp_number("+66 81 234 5678") == "66812345678"


@pytest.mark.parametrize(
    "raw",
    ["", None, "abc", "12345", "021234567", "0401234567", "05012345", "+972212345678", "66812345678", "+0123456789"],
)
def test_invalid_number_rejected(raw):
    with pytest.raises(ValueError, match="מספר וואטסאפ לא תקין"):
        normalize_whatsapp_number(raw)


def test_template_variables_filled():
    variables = build_template_variables("  דנה כהן ", "call_me")
    assert variables == {VAR_NAME: "דנה כהן", VAR_MESSAGE: resolve_short_text("call_me")}


def test_free_text_key_rejected():
    with pytest.raises(ValueError):
        build_template_variables("דנה", "שלום, הודעה חופשית")


def test_empty_or_too_long_name_rejected():
    with pytest.raises(ValueError):
        clean_recipient_name("  ")
    with pytest.raises(ValueError):
        clean_recipient_name("x" * 61)


def test_name_strips_control_characters():
    assert clean_recipient_name("דנה\n\u202e") == "דנה"


@pytest.mark.parametrize("role", [roles.ADMIN, roles.NETWORK_MANAGER, roles.BRANCH_MANAGER])
def test_managers_can_send(role):
    assert_can_send(ActorContext(user_id="u1", role=role))


def test_employee_cannot_send():
    with pytest.raises(PermissionError):
        assert_can_send(ActorContext(user_id="u1", role=roles.EMPLOYEE))


@pytest.mark.parametrize("value", [None, False, "true", 1])
def test_consent_must_be_true_boolean(value):
    with pytest.raises(ValueError):
        require_consent(value)


def test_consent_true_accepted():
    require_consent(True)


def test_scope_helper():
    assert employee_in_actor_scope(None, ["b1"])
    assert employee_in_actor_scope(["b1"], ["b2", "b1"])
    assert not employee_in_actor_scope(["b1"], ["b2"])
    assert not employee_in_actor_scope([], ["b1"])
