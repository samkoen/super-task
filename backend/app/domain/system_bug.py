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
        notes.append("_הקלטה מצורפת למייל בלבד._")
    if has_screenshot:
        notes.append("_צילום מסך מצורף למייל._")
    extra_notes = ("\n\n" + "\n".join(notes)) if notes else ""
    text = (note or "").strip() or "—"
    return f"## תקלה במערכת\n\n{text}\n\n| שדה | ערך |\n| --- | --- |\n{table}{extra_notes}\n"


def system_bug_screenshot_markdown(image_url: str) -> str:
    return f"\n\n## צילום מסך\n\n![screenshot]({image_url})\n"
