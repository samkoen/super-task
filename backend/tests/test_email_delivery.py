from app.services import email_delivery


def test_deliver_html_email_simulation_mode(capsys, monkeypatch):
    monkeypatch.setattr(email_delivery, "brevo_force_simulation", lambda: True)
    monkeypatch.setattr(email_delivery, "brevo_sandbox_recipient", lambda: "")
    monkeypatch.setattr(email_delivery, "brevo_credentials_ok", lambda: False)

    ok = email_delivery.deliver_html_email(
        to_email="user@example.com",
        subject="Test",
        html_content='<a href="http://localhost/verify-email?token=abc">x</a>',
        kind="test",
    )

    captured = capsys.readouterr()
    assert ok is True
    assert "SIMULATION" in captured.out
    assert "verify-email" in captured.out


def test_deliver_html_email_real_required_sends_despite_simulation(monkeypatch):
    calls = []
    monkeypatch.setattr(email_delivery, "brevo_force_simulation", lambda: True)
    monkeypatch.setattr(email_delivery, "brevo_sandbox_recipient", lambda: "")
    monkeypatch.setattr(email_delivery, "brevo_credentials_ok", lambda: True)
    monkeypatch.setattr(
        email_delivery,
        "send_transactional_html_email",
        lambda **kwargs: calls.append(kwargs) or {"messageId": "1"},
    )

    ok = email_delivery.deliver_html_email(
        to_email=["skoen7665210@gmail.com", "Bircat9172@gmail.com"],
        subject="תקלה",
        html_content="<p>x</p>",
        kind="system-bug",
        attachments=[("screenshot.png", b"png")],
        allow_simulation=False,
    )

    assert ok is True
    assert calls[0]["to_email"] == ["skoen7665210@gmail.com", "Bircat9172@gmail.com"]
    assert calls[0]["attachments"][0][0] == "screenshot.png"


def test_deliver_html_email_real_required_fails_without_brevo(monkeypatch):
    monkeypatch.setattr(email_delivery, "brevo_force_simulation", lambda: True)
    monkeypatch.setattr(email_delivery, "brevo_sandbox_recipient", lambda: "")
    monkeypatch.setattr(email_delivery, "brevo_credentials_ok", lambda: False)

    ok = email_delivery.deliver_html_email(
        to_email="skoen7665210@gmail.com",
        subject="תקלה",
        html_content="<p>x</p>",
        kind="system-bug",
        allow_simulation=False,
    )

    assert ok is False
