from app.core.config import APP_NAME
from app.services.email_templates import verification_email_html


def test_default_app_name_is_hebrew_super_man():
    assert APP_NAME == "סופר-מן"


def test_verification_email_includes_brand_name():
    html = verification_email_html(
        app_name="סופר-מן",
        full_name="דוד",
        verify_url="https://example.com/verify",
    )
    assert "סופר-מן" in html
    assert "https://example.com/verify" in html
