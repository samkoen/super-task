import pytest

from app.domain.whatsapp_outreach import STATUS_FAILED, STATUS_SENT, STATUS_SIMULATED
from app.integrations.brevo import BrevoApiError
from app.services import whatsapp_delivery as wd

VARS = {"NAME": "דנה", "MESSAGE": "נא ליצור איתי קשר"}


@pytest.fixture
def brevo_calls(monkeypatch):
    calls = []

    def fake_send(**kwargs):
        calls.append(kwargs)
        return {"messageId": "msg-1"}

    monkeypatch.setattr(wd, "send_whatsapp_template", fake_send)
    return calls


def _configure(monkeypatch, *, simulation: bool, creds: bool):
    monkeypatch.setattr(wd, "brevo_force_simulation", lambda: simulation)
    monkeypatch.setattr(wd, "brevo_whatsapp_credentials_ok", lambda: creds)
    monkeypatch.setattr(wd, "brevo_whatsapp_sender_number", lambda: "972500000000")
    monkeypatch.setattr(wd, "brevo_whatsapp_template_id", lambda: 7)


def test_simulation_mode_does_not_call_brevo(monkeypatch, brevo_calls):
    _configure(monkeypatch, simulation=True, creds=True)
    result = wd.deliver_whatsapp_template(to_number="972501234567", variables=VARS)
    assert result.status == STATUS_SIMULATED
    assert brevo_calls == []


def test_missing_credentials_does_not_call_brevo(monkeypatch, brevo_calls):
    _configure(monkeypatch, simulation=False, creds=False)
    result = wd.deliver_whatsapp_template(to_number="972501234567", variables=VARS)
    assert result.status == STATUS_SIMULATED
    assert brevo_calls == []


def test_real_send_passes_template_and_variables(monkeypatch, brevo_calls):
    _configure(monkeypatch, simulation=False, creds=True)
    result = wd.deliver_whatsapp_template(to_number="972501234567", variables=VARS)
    assert result.status == STATUS_SENT
    assert result.brevo_message_id == "msg-1"
    assert brevo_calls == [
        {
            "to_number": "972501234567",
            "sender_number": "972500000000",
            "template_id": 7,
            "params": VARS,
        }
    ]


def test_brevo_error_marks_failed(monkeypatch):
    _configure(monkeypatch, simulation=False, creds=True)

    def boom(**_):
        raise BrevoApiError("Brevo HTTP 400: invalid")

    monkeypatch.setattr(wd, "send_whatsapp_template", boom)
    result = wd.deliver_whatsapp_template(to_number="972501234567", variables=VARS)
    assert result.status == STATUS_FAILED
    assert "400" in (result.error or "")
