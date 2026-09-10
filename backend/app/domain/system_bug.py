"""Règles pures — דיווח על תקלה במערכת."""
from __future__ import annotations

from dataclasses import dataclass

MAX_TRAIL = 8
MAX_NOTE_LEN = 4000
MAX_SCREENSHOT_BYTES = 3 * 1024 * 1024
MAX_AUDIO_BYTES = 5 * 1024 * 1024


@dataclass(frozen=True)
class SystemBugIdentity:
    user_name: str
    branch_name: str
    network_name: str


def clip_route_trail(paths: list[str], *, max_len: int = MAX_TRAIL) -> list[str]:
    cleaned = [str(p).strip() for p in paths if str(p).strip()]
    return cleaned[-max_len:]


def has_system_bug_explanation(note: str, *, has_audio: bool) -> bool:
    return bool((note or "").strip()) or has_audio


def system_bug_subject(*, route: str, role: str, version: str) -> str:
    path = (route or "/").strip() or "/"
    who = (role or "?").strip() or "?"
    ver = (version or "?").strip() or "?"
    return f"[סופר-מן] תקלה · {path} · {who} · {ver}"


def parse_trail(raw: str) -> list[str]:
    text = (raw or "").strip()
    if not text:
        return []
    if text.startswith("["):
        import json

        try:
            data = json.loads(text)
        except json.JSONDecodeError:
            return clip_route_trail(text.split(","))
        if isinstance(data, list):
            return clip_route_trail([str(item) for item in data])
    return clip_route_trail(text.split(","))


REQUIRED_SYSTEM_BUG_EMAILS = (
    "skoen7665210@gmail.com",
    "Bircat9172@gmail.com",
)


def parse_system_bug_emails(raw: str) -> list[str]:
    emails: list[str] = []
    seen: set[str] = set()
    for part in (raw or "").replace(";", ",").split(","):
        email = part.strip()
        if not email:
            continue
        key = email.lower()
        if key in seen:
            continue
        seen.add(key)
        emails.append(email)
    return emails


def mail_safe_audio_filename(data: bytes | None) -> str | None:
    if not data:
        return None
    if data.startswith(b"RIFF") and b"WAVE" in data[8:16]:
        return "explanation.wav"
    if data.startswith(b"ID3") or data[:2] in {b"\xff\xfb", b"\xff\xf3", b"\xff\xf2"}:
        return "explanation.mp3"
    if len(data) >= 12 and data[4:8] == b"ftyp":
        return "explanation.m4a"
    return None


def mail_safe_audio_attachment(data: bytes | None) -> tuple[str, bytes] | None:
    name = mail_safe_audio_filename(data)
    if not name or not data:
        return None
    return name, data


def system_bug_recipients(raw: str) -> list[str]:
    emails = parse_system_bug_emails(raw)
    have = {email.lower() for email in emails}
    for required in REQUIRED_SYSTEM_BUG_EMAILS:
        if required.lower() not in have:
            emails.append(required)
    return emails


def _md_cell(value: str) -> str:
    return (value or "—").replace("|", "\\|").replace("\n", " ")


def _label(value: str | None) -> str:
    return (value or "").strip() or "—"


def system_bug_meta_rows(
    *,
    identity: SystemBugIdentity,
    role: str,
    route: str,
    trail: list[str],
    version: str,
    extra: dict[str, str],
) -> list[tuple[str, str]]:
    rows = [
        ("משתמש", _label(identity.user_name)),
        ("תפקיד", _label(role)),
        ("סניף", _label(identity.branch_name)),
        ("רשת", _label(identity.network_name)),
        ("מסך", _label(route)),
        ("מסלול", " → ".join(trail) or "—"),
        ("גרסה", _label(version)),
    ]
    rows.extend((key, value) for key, value in extra.items() if value)
    return rows


def system_bug_issue_body(
    *,
    note: str,
    route: str,
    trail: list[str],
    version: str,
    identity: SystemBugIdentity,
    role: str,
    extra: dict[str, str],
    has_audio: bool,
    has_screenshot: bool = False,
) -> str:
    table = "\n".join(
        f"| {_md_cell(k)} | {_md_cell(v)} |"
        for k, v in system_bug_meta_rows(
            identity=identity, role=role, route=route, trail=trail, version=version, extra=extra
        )
    )
    notes = []
    if has_audio:
        notes.append("_הקלטה מצורפת למייל._")
    if has_screenshot:
        notes.append("_צילום מסך מצורף למייל._")
    extra_notes = ("\n\n" + "\n".join(notes)) if notes else ""
    text = (note or "").strip() or "—"
    return f"## תקלה במערכת\n\n{text}\n\n| שדה | ערך |\n| --- | --- |\n{table}{extra_notes}\n"


def system_bug_screenshot_markdown(image_url: str) -> str:
    return f"\n\n## צילום מסך\n\n![screenshot]({image_url})\n"


_GERESH_CHARS = "'׳'`’"
SYSTEM_BUG_INBOX_NAMES = frozenset({"יצחק ריצרד"})


def normalize_person_name(name: str) -> str:
    cleaned = (name or "").translate({ord(ch): None for ch in _GERESH_CHARS})
    return " ".join(cleaned.split())


def parse_inbox_user_ids(raw: str) -> tuple[str, ...]:
    return tuple(part.strip() for part in (raw or "").split(",") if part.strip())


def can_view_system_bug_inbox(
    *,
    full_name: str,
    user_id: str = "",
    extra_user_ids: tuple[str, ...] = (),
) -> bool:
    if user_id and user_id in extra_user_ids:
        return True
    return normalize_person_name(full_name) in SYSTEM_BUG_INBOX_NAMES


def audio_blob_meta(data: bytes | None) -> tuple[str, str] | None:
    if not data:
        return None
    name = mail_safe_audio_filename(data)
    if name == "explanation.wav":
        return ".wav", "audio/wav"
    if name == "explanation.mp3":
        return ".mp3", "audio/mpeg"
    if name == "explanation.m4a":
        return ".m4a", "audio/mp4"
    return ".webm", "audio/webm"


SYSTEM_BUG_STATUS_OPEN = "open"
SYSTEM_BUG_STATUS_CLOSED = "closed"
SYSTEM_BUG_STATUSES = frozenset({SYSTEM_BUG_STATUS_OPEN, SYSTEM_BUG_STATUS_CLOSED})
MAX_COMMENT_LEN = 2000
MAX_COMMENTS = 50


def parse_system_bug_status(raw: str | None) -> str:
    value = (raw or SYSTEM_BUG_STATUS_OPEN).strip().lower()
    if value not in SYSTEM_BUG_STATUSES:
        raise ValueError("סטטוס לא תקין")
    return value


def clip_system_bug_comment(body: str) -> str:
    return (body or "").strip()[:MAX_COMMENT_LEN]


def parse_system_bug_comments(raw) -> list[dict]:
    items = _comments_list(raw)
    out: list[dict] = []
    for item in items:
        if not isinstance(item, dict):
            continue
        body = clip_system_bug_comment(str(item.get("body") or ""))
        if not body:
            continue
        out.append(
            {
                "author_name": str(item.get("author_name") or "").strip() or "—",
                "body": body,
                "created_at": str(item.get("created_at") or ""),
            }
        )
    return out[-MAX_COMMENTS:]


def append_system_bug_comment(
    existing: list[dict],
    *,
    author_name: str,
    body: str,
    created_at: str,
) -> list[dict]:
    text = clip_system_bug_comment(body)
    if not text:
        raise ValueError("נא לכתוב הערה")
    next_item = {
        "author_name": (author_name or "").strip() or "—",
        "body": text,
        "created_at": created_at,
    }
    return parse_system_bug_comments([*existing, next_item])


def _comments_list(raw) -> list:
    if raw is None:
        return []
    if isinstance(raw, list):
        return raw
    text = str(raw).strip()
    if not text:
        return []
    import json

    try:
        data = json.loads(text)
    except json.JSONDecodeError:
        return []
    return data if isinstance(data, list) else []
