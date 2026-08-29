import base64

from app.domain.excellence_avatar import extract_inline_image, pick_excellence_slogan


def test_slogan_is_stable_for_the_same_user():
    a = pick_excellence_slogan("u-1", "דנה")
    b = pick_excellence_slogan("u-1", "דנה")
    assert a == b
    assert a
    assert len(a) <= 80


def test_slogan_can_include_first_name():
    for i in range(80):
        uid = f"u-{i}"
        if "יוסי" in pick_excellence_slogan(uid, "יוסי"):
            return
    raise AssertionError("named slogan template not reached")


def test_empty_first_name_uses_brand_in_named_slogan():
    for i in range(80):
        uid = f"u-{i}"
        if pick_excellence_slogan(uid, "TEST").startswith("TEST"):
            assert pick_excellence_slogan(uid, "") == "סופר-מן — מצוינות בפעולה"
            return
    raise AssertionError("named slogan template not reached")


def test_extract_inline_image_from_gemini_payload():
    raw = base64.b64encode(b"jpeg-bytes").decode("ascii")
    payload = {
        "candidates": [
            {
                "content": {
                    "parts": [
                        {"text": "ok"},
                        {"inlineData": {"mimeType": "image/jpeg", "data": raw}},
                    ]
                }
            }
        ]
    }
    data, mime = extract_inline_image(payload)
    assert data == b"jpeg-bytes"
    assert mime == "image/jpeg"


def test_extract_inline_image_missing_raises():
    try:
        extract_inline_image({"candidates": [{"content": {"parts": [{"text": "no"}]}}]})
        raise AssertionError("expected")
    except ValueError as exc:
        assert "תמונה" in str(exc)
