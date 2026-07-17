"""Legacy smoke checks kept for import compatibility; see test_completion_media.py."""

from app.domain.completion_media import has_required_completion_visual_media


def test_has_completion_media():
    assert not has_required_completion_visual_media("", None)
    assert has_required_completion_visual_media("/uploads/x.jpg", None)
