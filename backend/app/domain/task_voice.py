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
    kind_label = "משימה קבועה (חוזרת)" if task_kind == "fixed" else "משימה מזדמנת (חד-פעמית)"
    roster = "\n".join(
        f'- id="{e["id"]}", name="{e["full_name"]}"'
        + (f', job="{e["job_function"]}"' if e.get("job_function") else "")
        for e in employees
    ) or "- (אין עובדים ברשימה)"
    return f"""You transcribe a voice message from a supermarket branch manager creating a {kind_label}.
The manager speaks {lang_name}. Your job is to capture ONLY what was actually said in the audio — nothing more.

Employees in this branch:
{roster}

Return ONLY valid JSON (no markdown, no extra text):
{{
  "title": "short task title in {lang_name} taken from the spoken words",
  "description": "text in {lang_name}: only details explicitly spoken in the audio",
  "assignee_name": "exact employee full name from the roster above, or empty string"
}}

Strict rules (critical):
- TRANSCRIBE, do not invent. Do not add tasks, steps, requirements, or details that were not spoken.
- Do not guess, assume, complete, or "improve" the manager's instructions.
- Do not add standard supermarket procedures unless the manager said them aloud.
- title: concise summary of what was said (max ~80 chars), in {lang_name}
- description: verbatim or lightly cleaned transcript of spoken task details; if the manager said little, keep it short; leave "" if nothing beyond the title was said
- assignee_name: only if the manager clearly named someone from the roster; otherwise ""
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


def parse_task_voice_response(text: str, employees: list[dict]) -> TaskVoiceDraft:
    payload = _extract_json_block(text)
    title = str(payload.get("title") or "").strip()
    description = str(payload.get("description") or "").strip()
    assignee_name = str(payload.get("assignee_name") or "").strip()
    if not title:
        raise ValueError("ה-AI לא הצליח לחלץ כותרת — נסו שוב")
    assignee_id, resolved_name = resolve_assignee(assignee_name, employees)
    return TaskVoiceDraft(
        title=title,
        description=description,
        assignee_user_id=assignee_id,
        assignee_name=resolved_name if assignee_id else (assignee_name or None),
    )
