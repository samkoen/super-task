"""Rules for media attached when completing a task."""

from __future__ import annotations

VALID_KINDS = ("photo", "video", "audio")
MAX_MIN_VIDEO_SECONDS = 600
MAX_REQUIREMENTS = 10
MAX_SLOT_TITLE = 80
MAX_SLOT_HINT = 300
MAX_EXAMPLE_URL = 1024


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


def requirement_example_urls(requirements: list[dict] | None) -> list[str]:
    if not isinstance(requirements, list):
        return []
    urls: list[str] = []
    for item in requirements:
        if not isinstance(item, dict) or item.get("kind") == "audio":
            continue
        url = str(item.get("example_url") or "").strip()
        if url:
            urls.append(url)
    return urls


_GUIDE_KEYS = ("title", "hint", "example_url")


def _has_slot_guides(requirements: list | None) -> bool:
    if not isinstance(requirements, list):
        return False
    for item in requirements:
        if not isinstance(item, dict) or item.get("kind") == "audio":
            continue
        if any(str(item.get(key) or "").strip() for key in _GUIDE_KEYS):
            return True
    return False


def _fill_missing_guides(item: dict, extra: dict) -> dict:
    if item.get("kind") == "audio" or extra.get("kind") == "audio":
        return item
    next_item = dict(item)
    for key in _GUIDE_KEYS:
        if str(next_item.get(key) or "").strip():
            continue
        value = extra.get(key)
        if value:
            next_item[key] = value
    return next_item


def merge_completion_requirements(
    occurrence_reqs: list | None,
    template_reqs: list | None,
) -> list | None:
    """Complète les guides de cases depuis le template si l'occurrence est en retard."""
    occ = occurrence_reqs if isinstance(occurrence_reqs, list) else []
    tpl = template_reqs if isinstance(template_reqs, list) else []
    if not tpl:
        return occurrence_reqs
    if not occ or (_has_slot_guides(tpl) and not _has_slot_guides(occ)):
        return template_reqs
    merged: list = []
    for index, item in enumerate(occ):
        extra = tpl[index] if index < len(tpl) and isinstance(tpl[index], dict) else {}
        merged.append(_fill_missing_guides(item, extra) if isinstance(item, dict) else item)
    return merged


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


def _optional_text(value: object | None, *, max_len: int) -> str | None:
    text = str(value or "").strip()
    if not text:
        return None
    return text[:max_len]


def _slot_guide_fields(item: dict) -> dict:
    title = _optional_text(item.get("title"), max_len=MAX_SLOT_TITLE)
    hint = _optional_text(item.get("hint"), max_len=MAX_SLOT_HINT)
    example_url = _optional_text(item.get("example_url"), max_len=MAX_EXAMPLE_URL)
    extra: dict = {}
    if title:
        extra["title"] = title
    if hint:
        extra["hint"] = hint
    if example_url:
        extra["example_url"] = example_url
    return extra


def _normalize_requirement(item: object) -> dict:
    if not isinstance(item, dict):
        raise ValueError("דרישות סיום לא תקינות")
    kind = str(item.get("kind") or "").strip()
    if kind not in VALID_KINDS:
        raise ValueError("סוג מדיה לא תקין")
    if kind == "audio":
        return {"kind": "audio"}
    entry = {"kind": kind, **_slot_guide_fields(item)}
    if kind != "video":
        return entry
    seconds = normalize_min_video_seconds(item.get("min_seconds"))
    if not seconds:
        raise ValueError("נדרש משך וידאו מינימלי")
    entry["min_seconds"] = seconds
    return entry


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
