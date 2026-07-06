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
