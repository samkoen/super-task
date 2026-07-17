"""Rules for media attached when completing a task."""


def has_required_completion_visual_media(
    photo_path: str | None,
    video_path: str | None,
) -> bool:
    """Employee completion requires a photo or a video; audio alone is not enough."""
    return any((p or "").strip() for p in (photo_path, video_path))
