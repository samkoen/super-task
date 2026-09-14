import pytest

from app.domain.video_upload_intent import video_extension, video_folder_for_purpose


def test_video_folder_for_purpose():
    assert video_folder_for_purpose("task") == "task_videos"
    assert video_folder_for_purpose("chat") == "direct_chat_videos"
    assert video_folder_for_purpose("issue") == "issue_videos"


def test_video_folder_rejects_unknown_purpose():
    with pytest.raises(ValueError):
        video_folder_for_purpose("avatar")


def test_video_extension_from_mime():
    assert video_extension("video/mp4") == ".mp4"
    assert video_extension("video/webm;codecs=vp8") == ".webm"
    assert video_extension("application/octet-stream") == ".mp4"


def test_require_video_byte_size():
    from app.domain.video_upload_intent import require_video_byte_size

    assert require_video_byte_size(12, 50 * 1024 * 1024) == 12
    with pytest.raises(ValueError, match="גדול"):
        require_video_byte_size(50 * 1024 * 1024 + 1, 50 * 1024 * 1024)
    with pytest.raises(ValueError, match="חסר"):
        require_video_byte_size(None, 50 * 1024 * 1024)
    with pytest.raises(ValueError, match="חסר"):
        require_video_byte_size("nope", 50 * 1024 * 1024)
