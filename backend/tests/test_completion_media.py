from app.domain.completion_media import has_required_completion_visual_media


def test_photo_alone_satisfies_requirement():
    assert has_required_completion_visual_media("/uploads/a.jpg", None) is True


def test_video_alone_satisfies_requirement():
    assert has_required_completion_visual_media(None, "/uploads/a.mp4") is True


def test_audio_alone_does_not_satisfy_requirement():
    # audio is optional and must not count as the required visual proof
    assert has_required_completion_visual_media("", "") is False
    assert has_required_completion_visual_media(None, None) is False
    assert has_required_completion_visual_media("  ", "  ") is False


def test_whitespace_paths_are_ignored():
    assert has_required_completion_visual_media("   ", "/uploads/v.mp4") is True
