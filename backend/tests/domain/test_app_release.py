from app.domain.app_release import (
    is_newer_release,
    next_version_name,
    normalize_apk_content_type,
    parse_version_name,
    require_apk_filename,
    require_apk_size,
    require_apk_url,
    version_code_from_name,
)
import pytest


def test_parse_version_name_accepts_dotted_numbers():
    assert parse_version_name(" 1.1 ") == "1.1"
    assert parse_version_name("1.0") == "1.0"
    assert version_code_from_name("1.0") == 100
    assert version_code_from_name("1.1") == 101


def test_parse_version_name_rejects_invalid():
    with pytest.raises(ValueError):
        parse_version_name("")
    with pytest.raises(ValueError):
        parse_version_name("1")
    with pytest.raises(ValueError):
        parse_version_name("v1.1")


def test_next_version_name():
    assert next_version_name("1.0") == "1.1"
    assert next_version_name("1.1") == "1.2"
    assert next_version_name("1.99") == "2.0"


def test_is_newer_release():
    assert is_newer_release(100, 101) is True
    assert is_newer_release(101, 101) is False
    assert is_newer_release(102, 101) is False


def test_require_apk_size_and_name():
    assert require_apk_size(10) == 10
    with pytest.raises(ValueError):
        require_apk_size(0)
    assert require_apk_filename("super-release.apk") == "super-release.apk"
    with pytest.raises(ValueError):
        require_apk_filename("app.zip")


def test_apk_content_type_and_url():
    assert normalize_apk_content_type("") == "application/vnd.android.package-archive"
    assert normalize_apk_content_type("application/octet-stream") == (
        "application/vnd.android.package-archive"
    )
    with pytest.raises(ValueError):
        normalize_apk_content_type("application/zip")
    assert require_apk_url("/uploads/app_apks/a.apk").startswith("/uploads/")
    with pytest.raises(ValueError):
        require_apk_url("/uploads/../secret")
