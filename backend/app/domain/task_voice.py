"""Prompt et parsing pour création de tâche depuis message vocal."""
from __future__ import annotations

import json
import re
from dataclasses import dataclass


@dataclass
class TaskVoiceDraft:
    title: str
    description: str
    assignee_user_id: str | None
    assignee_name: str | None


def build_task_voice_prompt(
    *,
    employees: list[dict],
    task_kind: str,
    manager_language: str = "he",
) -> str:
    from app.domain.employee_language import LANGUAGE_NAMES_EN, normalize_employee_language

    lang = normalize_employee_language(manager_language)
    lang_name = LANGUAGE_NAMES_EN[lang]
    kind_meta = "recurring/fixed" if task_kind == "fixed" else "one-off/ad-hoc"
    roster = "\n".join(
        f'- id="{e["id"]}", name="{e["full_name"]}"'
        + (f', job="{e["job_function"]}"' if e.get("job_function") else "")
        for e in employees
    ) or "- (אין עובדים ברשימה)"
    return f"""You transcribe a voice message from a supermarket branch manager creating a {kind_meta} task.
The manager speaks {lang_name}. Your job is to capture ONLY what was actually said in the audio — nothing more.

Employees in this branch:
{roster}

Return ONLY valid JSON (no markdown, no extra text):
{{
  "title": "short operational task title in {lang_name} summarizing WHAT TO DO (from the spoken content)",
  "description": "text in {lang_name}: only details explicitly spoken in the audio",
  "assignee_name": "exact employee full name from the roster above, or empty string",
  "assignee_user_id": "id from the roster above when an employee was named, or empty string"
}}

Strict rules (critical):
- TRANSCRIBE, do not invent. Do not add tasks, steps, requirements, or details that were not spoken.
- Do not guess, assume, complete, or "improve" the manager's instructions.
- Do not add standard supermarket procedures unless the manager said them aloud.
- description: verbatim or lightly cleaned transcript of spoken task details; required when the manager described the work
- title: ALWAYS a short operational title (3–8 words, max ~80 chars) in {lang_name} that summarizes the work described — e.g. "ניקוי מדף חלב", NOT the task type
- FORBIDDEN as title: "משימה מזדמנת", "משימה קבועה", "ad hoc", "fixed task", or any generic task-kind label
- ASSIGNEE (critical): if the manager says who should do the task — e.g. "תן ליוסי", "לדנה", "עבור כהן", "לעובד …", "assign to …" — you MUST set assignee_name to the matching roster full name AND assignee_user_id to that roster id
- Prefer the clearest roster match (full name > first name). If several first names match, leave assignee empty rather than guessing
- If no employee was named, leave assignee_name and assignee_user_id as ""
- If audio is unclear, transcribe what you hear; do not fill gaps with invented content
"""


def _extract_json_block(text: str) -> dict:
    raw = (text or "").strip()
    if not raw:
        raise ValueError("תשובה ריקה מהמודל")
    fence = re.search(r"```(?:json)?\s*([\s\S]*?)```", raw)
    if fence:
        raw = fence.group(1).strip()
    start = raw.find("{")
    end = raw.rfind("}")
    if start < 0 or end <= start:
        raise ValueError("לא ניתן לפרש את תשובת ה-AI")
    payload = json.loads(raw[start : end + 1])
    if not isinstance(payload, dict):
        raise ValueError("פורמט תשובה לא תקין")
    return payload


def _normalize_name(value: str) -> str:
    return re.sub(r"\s+", " ", (value or "").strip()).lower()


def resolve_assignee(assignee_name: str, employees: list[dict]) -> tuple[str | None, str | None]:
    name = (assignee_name or "").strip()
    if not name:
        return None, None
    normalized = _normalize_name(name)
    for employee in employees:
        full = (employee.get("full_name") or "").strip()
        if _normalize_name(full) == normalized:
            return str(employee["id"]), full
    for employee in employees:
        full = (employee.get("full_name") or "").strip()
        fn = _normalize_name(full)
        if normalized in fn or fn in normalized:
            return str(employee["id"]), full
    parts = normalized.split()
    if parts:
        for employee in employees:
            full = _normalize_name(employee.get("full_name") or "")
            if all(part in full for part in parts):
                return str(employee["id"]), employee.get("full_name")
    return None, name


def resolve_assignee_id(assignee_user_id: str, employees: list[dict]) -> tuple[str | None, str | None]:
    uid = (assignee_user_id or "").strip()
    if not uid:
        return None, None
    for employee in employees:
        if str(employee.get("id")) == uid:
            return uid, (employee.get("full_name") or "").strip() or None
    return None, None


def infer_assignee_from_text(text: str, employees: list[dict]) -> tuple[str | None, str | None]:
    """Si l'AI omet assignee_name : cherche un nom du roster dans le texte parlé."""
    hay = _normalize_name(text or "")
    if not hay or not employees:
        return None, None
    scored: list[tuple[int, str, str]] = []
    for employee in employees:
        full = (employee.get("full_name") or "").strip()
        if not full:
            continue
        fn = _normalize_name(full)
        eid = str(employee["id"])
        if fn and fn in hay:
            scored.append((len(fn) + 100, eid, full))  # full name wins
            continue
        first = fn.split()[0] if fn else ""
        # Préfixes hébreu courants collés au prénom : ליוסי / לדנה / …
        if len(first) >= 3 and re.search(
            rf"(?:^|[\s,.:;\"'])(?:[לבמהוש])?{re.escape(first)}(?:[\s,.:;\"']|$)",
            hay,
        ):
            scored.append((len(first), eid, full))
    if not scored:
        return None, None
    scored.sort(key=lambda row: row[0], reverse=True)
    best_score = scored[0][0]
    top = [row for row in scored if row[0] == best_score]
    if len(top) > 1:
        return None, None  # ambigu
    return top[0][1], top[0][2]


def title_from_description(description: str, *, max_len: int = 80) -> str:
    """Titre de secours : première ligne / début de la description."""
    first = (description or "").strip().splitlines()[0].strip() if description else ""
    if not first:
        return ""
    if len(first) <= max_len:
        return first
    return first[: max_len - 1].rstrip() + "…"


_GENERIC_TITLES = {
    "משימה מזדמנת",
    "משימה קבועה",
    "משימה מזדמנת (חד-פעמית)",
    "משימה קבועה (חוזרת)",
    "משימה חדשה",
    "ad hoc",
    "ad-hoc",
    "fixed task",
    "new task",
}


def is_generic_task_title(title: str | None) -> bool:
    cleaned = re.sub(r"\s+", " ", (title or "").strip()).lower()
    if not cleaned:
        return True
    if cleaned in {t.lower() for t in _GENERIC_TITLES}:
        return True
    if re.match(r"^משימה\s+(מזדמנת|קבועה)\b", cleaned) and len(cleaned) <= 24:
        return True
    return False


def parse_task_voice_response(text: str, employees: list[dict]) -> TaskVoiceDraft:
    payload = _extract_json_block(text)
    title = str(payload.get("title") or "").strip()
    description = str(payload.get("description") or "").strip()
    assignee_name = str(payload.get("assignee_name") or "").strip()
    assignee_user_id_raw = str(payload.get("assignee_user_id") or "").strip()
    if is_generic_task_title(title) and description:
        title = title_from_description(description)
    elif not title and description:
        title = title_from_description(description)
    if not title and not description:
        raise ValueError("ה-AI לא הצליח לחלץ כותרת או תיאור — נסו שוב")
    if not title or is_generic_task_title(title):
        raise ValueError("ה-AI לא הצליח לחלץ כותרת — נסו שוב")

    assignee_id, resolved_name = resolve_assignee_id(assignee_user_id_raw, employees)
    if not assignee_id:
        assignee_id, resolved_name = resolve_assignee(assignee_name, employees)
    if not assignee_id:
        assignee_id, resolved_name = infer_assignee_from_text(
            f"{title}\n{description}\n{assignee_name}",
            employees,
        )
    return TaskVoiceDraft(
        title=title,
        description=description,
        assignee_user_id=assignee_id,
        assignee_name=resolved_name if assignee_id else (assignee_name or None),
    )
