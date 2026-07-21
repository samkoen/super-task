"""Tests parsing vocal → brouillon tâche."""
from __future__ import annotations

import pytest

from app.domain.task_voice import (
    build_task_voice_prompt,
    infer_assignee_from_text,
    parse_task_voice_response,
    resolve_assignee,
    title_from_description,
)

EMPLOYEES = [
    {"id": "u1", "full_name": "יוסי כהן", "job_function": "stockers"},
    {"id": "u2", "full_name": "דנה לוי", "job_function": "head_cashier"},
]


def test_build_task_voice_prompt_lists_employees():
    prompt = build_task_voice_prompt(employees=EMPLOYEES, task_kind="ad_hoc")
    assert "יוסי כהן" in prompt
    assert "one-off/ad-hoc" in prompt
    assert "FORBIDDEN as title" in prompt
    assert "משימה מזדמנת" in prompt  # listed as forbidden example
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


def test_parse_task_voice_response_title_from_description_when_empty():
    draft = parse_task_voice_response(
        '{"title": "", "description": "לנקות את מדף החלב עכשיו", "assignee_name": "דנה"}',
        EMPLOYEES,
    )
    assert draft.title == "לנקות את מדף החלב עכשיו"
    assert draft.assignee_user_id == "u2"


def test_parse_rejects_generic_kind_title():
    draft = parse_task_voice_response(
        '{"title": "משימה מזדמנת", "description": "לסדר את המדף ליד הקופה", "assignee_name": ""}',
        EMPLOYEES,
    )
    assert draft.title == "לסדר את המדף ליד הקופה"
    assert draft.title != "משימה מזדמנת"


def test_title_from_description_truncates():
    long = "א" * 100
    assert title_from_description(long).endswith("…")
    assert len(title_from_description(long)) == 80


def test_parse_task_voice_response_requires_content():
    with pytest.raises(ValueError, match="כותרת או תיאור"):
        parse_task_voice_response('{"title": "", "description": "", "assignee_name": ""}', EMPLOYEES)


def test_parse_uses_assignee_user_id_from_json():
    draft = parse_task_voice_response(
        '{"title": "ניקוי", "description": "מדף", "assignee_name": "", "assignee_user_id": "u1"}',
        EMPLOYEES,
    )
    assert draft.assignee_user_id == "u1"
    assert draft.assignee_name == "יוסי כהן"


def test_parse_infers_assignee_from_description_when_fields_empty():
    draft = parse_task_voice_response(
        '{"title": "ניקוי מדף", "description": "תן ליוסי לנקות את מדף החלב", "assignee_name": ""}',
        EMPLOYEES,
    )
    assert draft.assignee_user_id == "u1"


def test_infer_assignee_from_text_ambiguous_first_name():
    amb = [
        {"id": "a", "full_name": "דני כהן", "job_function": None},
        {"id": "b", "full_name": "דני לוי", "job_function": None},
    ]
    uid, _ = infer_assignee_from_text("תן לדני את המשימה", amb)
    assert uid is None


def test_infer_assignee_hebrew_prefixed_first_name():
    uid, name = infer_assignee_from_text("תן ליוסי לנקות את המדף", EMPLOYEES)
    assert uid == "u1"
    assert name == "יוסי כהן"
