"""Tests parsing vocal → brouillon tâche."""
from __future__ import annotations

import pytest

from app.domain.task_voice import (
    build_task_voice_prompt,
    parse_task_voice_response,
    resolve_assignee,
)

EMPLOYEES = [
    {"id": "u1", "full_name": "יוסי כהן", "job_function": "stockers"},
    {"id": "u2", "full_name": "דנה לוי", "job_function": "head_cashier"},
]


def test_build_task_voice_prompt_lists_employees():
    prompt = build_task_voice_prompt(employees=EMPLOYEES, task_kind="ad_hoc")
    assert "יוסי כהן" in prompt
    assert "משימה מזדמנת" in prompt
    assert "do not invent" in prompt.lower() or "invented content" in prompt.lower()
    assert "TRANSCRIBE" in prompt
    assert "speaks Hebrew" in prompt


def test_build_task_voice_prompt_uses_manager_language():
    prompt = build_task_voice_prompt(employees=EMPLOYEES, task_kind="ad_hoc", manager_language="fr")
    assert "French" in prompt
    assert "in French" in prompt


def test_resolve_assignee_exact_match():
    user_id, name = resolve_assignee("יוסי כהן", EMPLOYEES)
    assert user_id == "u1"
    assert name == "יוסי כהן"


def test_resolve_assignee_partial_match():
    user_id, _ = resolve_assignee("דנה", EMPLOYEES)
    assert user_id == "u2"


def test_resolve_assignee_unknown():
    user_id, name = resolve_assignee("אנונימי", EMPLOYEES)
    assert user_id is None
    assert name == "אנונימי"


def test_parse_task_voice_response_json():
    raw = """```json
    {"title": "לנקות מדף", "description": "מדף חלב", "assignee_name": "יוסי כהן"}
    ```"""
    draft = parse_task_voice_response(raw, EMPLOYEES)
    assert draft.title == "לנקות מדף"
    assert draft.description == "מדף חלב"
    assert draft.assignee_user_id == "u1"


def test_parse_task_voice_response_requires_title():
    with pytest.raises(ValueError, match="כותרת"):
        parse_task_voice_response('{"title": "", "description": "x", "assignee_name": ""}', EMPLOYEES)
