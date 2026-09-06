from app.integrations.brevo.client import _brevo_attachment


def test_screenshot_is_inline_cid_for_email_body():
    row = _brevo_attachment("screenshot.jpg", b"jpeg")
    assert row["name"] == "screenshot.jpg"
    assert row["contentId"] == "bug-screenshot"
    assert row["content"]


def test_audio_stays_regular_attachment():
    row = _brevo_attachment("explanation.webm", b"webm")
    assert "contentId" not in row
    assert row["name"] == "explanation.webm"
