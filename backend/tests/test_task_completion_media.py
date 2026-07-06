def test_has_completion_media():
    assert not any((p or "").strip() for p in ("", None, "  "))
    assert any((p or "").strip() for p in ("", "/uploads/x.jpg", None))
