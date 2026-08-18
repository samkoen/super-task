"""Rules for media attached when completing a task."""

from __future__ import annotations

VALID_KINDS = ("photo", "video", "audio")
MAX_MIN_VIDEO_SECONDS = 600
MAX_REQUIREMENTS = 10


def packed_media_fields(requirements: list[dict]) -> dict:
    photo_required, min_seconds = legacy_from_requirements(requirements)
    return {
        "completion_requirements": requirements,
        "photo_required": photo_required,
        "min_video_seconds": min_seconds,
    }


def has_required_completion_visual_media(
    photo_path: str | None,
    video_path: str | None,
) -> bool:
    """Employee completion requires a photo or a video; audio alone is not enough."""
    return any((p or "").strip() for p in (photo_path, video_path))


def normalize_min_video_seconds(value: object | None) -> int | None:
    """None / 0 / vide → pas d'exigence vidéo. 1–600 sinon."""
    if value is None or value is False:
        return None
    if isinstance(value, str) and not value.strip():
        return None
    try:
        n = int(value)  # type: ignore[arg-type]
    except (TypeError, ValueError):
        raise ValueError("משך וידאו לא תקין")
    if n <= 0:
        return None
    if n > MAX_MIN_VIDEO_SECONDS:
        raise ValueError("משך וידאו מקסימלי הוא 600 שניות")
    return n


def parse_video_duration_seconds(value: object | None) -> int:
    if value is None or value is False:
        return 0
    try:
        n = int(value)  # type: ignore[arg-type]
    except (TypeError, ValueError):
        return 0
    return max(0, n)


def assert_completion_media(
    *,
    photo_path: str | None,
    video_path: str | None,
    min_video_seconds: int | None,
    video_duration_seconds: object | None,
    requires_visual: bool,
) -> None:
    """Lève ValueError si la preuve média ne convient pas (modèle legacy)."""
    required = normalize_min_video_seconds(min_video_seconds)
    if required:
        if not (video_path or "").strip():
            raise ValueError("נדרשת וידאו לסיום המשימה")
        duration = parse_video_duration_seconds(video_duration_seconds)
        if duration < required:
            raise ValueError(f"נדרשת וידאו של לפחות {required} שניות")
        return
    if requires_visual and not has_required_completion_visual_media(photo_path, video_path):
        raise ValueError("נדרשת תמונה או וידאו לסיום המשימה (שמע אופציונלי)")


def requirements_from_legacy(
    photo_required: bool | None,
    min_video_seconds: object | None,
) -> list[dict]:
    """Convertit photo_required + min_video_seconds en liste AND."""
    seconds = normalize_min_video_seconds(min_video_seconds)
    if seconds:
        return [{"kind": "video", "min_seconds": seconds}]
    if photo_required:
        return [{"kind": "photo"}]
    return []


def legacy_from_requirements(requirements: list[dict]) -> tuple[bool, int | None]:
    """photo_required + premier min_video pour colonnes legacy."""
    photo_required = any(item["kind"] in {"photo", "video"} for item in requirements)
    first_video = next((item for item in requirements if item["kind"] == "video"), None)
    seconds = first_video.get("min_seconds") if first_video else None
    return photo_required, seconds


def normalize_requirements(raw: object | None) -> list[dict]:
    items = _as_item_list(raw)
    if len(items) > MAX_REQUIREMENTS:
        raise ValueError("יותר מדי דרישות מדיה לסיום")
    return [_normalize_requirement(item) for item in items]


def parse_requirements_input(
    raw: object | None,
    *,
    provided: bool,
    photo_required: bool | None = None,
    min_video_seconds: object | None = None,
) -> list[dict]:
    if provided:
        return normalize_requirements(raw)
    return requirements_from_legacy(bool(photo_required), min_video_seconds)


def effective_requirements(
    raw: object | None,
    *,
    photo_required: bool | None = None,
    min_video_seconds: object | None = None,
) -> list[dict]:
    """Liste persistée si présente, sinon legacy."""
    if raw is not None:
        return normalize_requirements(raw)
    return requirements_from_legacy(bool(photo_required), min_video_seconds)


def normalize_attachments(raw: object | None) -> list[dict]:
    items = _as_item_list(raw)
    return [_normalize_attachment(item) for item in items]


def attachments_from_legacy_paths(
    photo_path: str | None,
    video_path: str | None,
    audio_path: str | None,
    video_duration_seconds: object | None = None,
) -> list[dict]:
    out: list[dict] = []
    if (photo_path or "").strip():
        out.append({"kind": "photo", "url": photo_path.strip()})
    if (video_path or "").strip():
        out.append(
            {
                "kind": "video",
                "url": video_path.strip(),
                "duration_seconds": parse_video_duration_seconds(video_duration_seconds),
            }
        )
    if (audio_path or "").strip():
        out.append({"kind": "audio", "url": audio_path.strip()})
    return out


def resolve_completion_attachments(
    requirements: list[dict],
    *,
    attachments: object | None,
    photo_path: str | None,
    video_path: str | None,
    audio_path: str | None,
    video_duration_seconds: object | None,
) -> list[dict]:
    parsed = normalize_attachments(attachments)
    if parsed:
        return parsed
    if not requirements:
        return attachments_from_legacy_paths(
            photo_path, video_path, audio_path, video_duration_seconds
        )
    return _fill_slots_from_legacy(
        requirements, photo_path, video_path, audio_path, video_duration_seconds
    )


def first_path_of_kind(attachments: list[dict], kind: str) -> str | None:
    for item in attachments:
        if item.get("kind") == kind and (item.get("url") or "").strip():
            return item["url"].strip()
    return None


def attachment_urls(attachments: list[dict] | None) -> list[str]:
    if not attachments:
        return []
    return [item["url"].strip() for item in attachments if (item.get("url") or "").strip()]


def assert_attachments_match(requirements: list[dict], attachments: list[dict]) -> None:
    if not requirements:
        return
    if len(attachments) < len(requirements):
        raise ValueError(_missing_kind_message(requirements[len(attachments)]["kind"]))
    for req, att in zip(requirements, attachments, strict=False):
        _assert_slot_matches(req, att)


def _as_item_list(raw: object | None) -> list:
    if raw is None:
        return []
    if isinstance(raw, str):
        import json

        try:
            raw = json.loads(raw) if raw.strip() else []
        except json.JSONDecodeError as exc:
            raise ValueError("דרישות סיום לא תקינות") from exc
    if not isinstance(raw, list):
        raise ValueError("דרישות סיום לא תקינות")
    return raw


def _normalize_requirement(item: object) -> dict:
    if not isinstance(item, dict):
        raise ValueError("דרישות סיום לא תקינות")
    kind = str(item.get("kind") or "").strip()
    if kind not in VALID_KINDS:
        raise ValueError("סוג מדיה לא תקין")
    if kind != "video":
        return {"kind": kind}
    seconds = normalize_min_video_seconds(item.get("min_seconds"))
    if not seconds:
        raise ValueError("נדרש משך וידאו מינימלי")
    return {"kind": "video", "min_seconds": seconds}


def _normalize_attachment(item: object) -> dict:
    if not isinstance(item, dict):
        raise ValueError("קבצי סיום לא תקינים")
    kind = str(item.get("kind") or "").strip()
    if kind not in VALID_KINDS:
        raise ValueError("סוג מדיה לא תקין")
    url = str(item.get("url") or item.get("path") or "").strip()
    entry: dict = {"kind": kind, "url": url}
    if kind == "video":
        entry["duration_seconds"] = parse_video_duration_seconds(
            item.get("duration_seconds") or item.get("video_duration_seconds")
        )
    return entry


def _fill_slots_from_legacy(
    requirements: list[dict],
    photo_path: str | None,
    video_path: str | None,
    audio_path: str | None,
    video_duration_seconds: object | None,
) -> list[dict]:
    photo = (photo_path or "").strip()
    video = (video_path or "").strip()
    audio = (audio_path or "").strip()
    duration = parse_video_duration_seconds(video_duration_seconds)
    used = {"photo": False, "video": False, "audio": False}
    out: list[dict] = []
    for req in requirements:
        kind = req["kind"]
        if kind == "photo" and photo and not used["photo"]:
            used["photo"] = True
            out.append({"kind": "photo", "url": photo})
        elif kind == "video" and video and not used["video"]:
            used["video"] = True
            out.append({"kind": "video", "url": video, "duration_seconds": duration})
        elif kind == "audio" and audio and not used["audio"]:
            used["audio"] = True
            out.append({"kind": "audio", "url": audio})
        else:
            out.append({"kind": kind, "url": ""})
    return out


def _assert_slot_matches(req: dict, att: dict) -> None:
    kind = req["kind"]
    if att.get("kind") != kind or not (att.get("url") or "").strip():
        raise ValueError(_missing_kind_message(kind))
    if kind != "video":
        return
    required = int(req["min_seconds"])
    duration = parse_video_duration_seconds(att.get("duration_seconds"))
    if duration < required:
        raise ValueError(f"נדרשת וידאו של לפחות {required} שניות")


def _missing_kind_message(kind: str) -> str:
    if kind == "video":
        return "נדרשת וידאו לסיום המשימה"
    if kind == "audio":
        return "נדרש שמע לסיום המשימה"
    return "נדרשת תמונה לסיום המשימה"
