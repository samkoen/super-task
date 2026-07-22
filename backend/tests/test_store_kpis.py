"""Tests KPI magasin (nettoyage / fronts) et normalisation ops_category."""
from __future__ import annotations

import pytest

from app.domain import ops_category, task_status
from app.domain.ops_category import normalize_ops_category
from app.domain.store_kpis import build_store_kpis, compute_category_kpi
from app.models.task_occurrence import TaskOccurrence


def _task(**kwargs) -> TaskOccurrence:
    defaults = {
        "id": "t1",
        "template_id": "tpl-1",
        "branch_id": "b1",
        "title": "ניקוי",
        "description": "",
        "due_at": "2026-07-14T10:00:00+03:00",
        "status": task_status.PENDING,
        "assignee_user_id": "u1",
        "department_id": None,
        "task_kind": "fixed",
        "manager_user_id": None,
        "photo_required": True,
        "reference_photo_url": None,
        "reference_video_url": None,
        "reference_audio_url": None,
        "media_purge_after": None,
        "started_at": None,
        "started_by_id": None,
        "created_by_id": None,
        "created_at": "2026-07-14T08:00:00+03:00",
        "updated_at": "2026-07-14T08:00:00+03:00",
        "ops_category": ops_category.CLEANING,
    }
    defaults.update(kwargs)
    return TaskOccurrence(**defaults)


def test_normalize_ops_category_accepts_known_and_empty():
    assert normalize_ops_category("cleaning") == "cleaning"
    assert normalize_ops_category("FRONTS_SIGNAGE") == "fronts_signage"
    assert normalize_ops_category(None) is None
    assert normalize_ops_category("") is None
    assert normalize_ops_category("  ") is None


def test_normalize_ops_category_rejects_unknown():
    with pytest.raises(ValueError):
        normalize_ops_category("inventory")


def test_compute_category_kpi_nominal_full_day():
    tasks = [
        _task(id="1", status=task_status.COMPLETED),
        _task(id="2", status=task_status.PENDING_REVIEW),
        _task(id="3", status=task_status.PENDING, due_at="2026-07-14T16:00:00+03:00"),
        _task(id="4", status=task_status.IN_PROGRESS),
        # hors catégorie
        _task(id="5", ops_category=None, status=task_status.COMPLETED),
        _task(id="6", ops_category=ops_category.FRONTS_SIGNAGE, status=task_status.COMPLETED),
    ]
    kpi = compute_category_kpi(tasks, ops_category.CLEANING)
    assert kpi["total"] == 4
    assert kpi["approved"] == 1
    assert kpi["reported"] == 2
    assert kpi["approval_pct"] == 25
    assert kpi["report_pct"] == 50


def test_compute_category_kpi_empty_denominator():
    kpi = compute_category_kpi([], ops_category.CLEANING)
    assert kpi["total"] == 0
    assert kpi["approval_pct"] == 0
    assert kpi["report_pct"] == 0


def test_compute_category_kpi_excludes_cancelled():
    tasks = [
        _task(id="1", status=task_status.COMPLETED),
        _task(id="2", status=task_status.CANCELLED),
    ]
    kpi = compute_category_kpi(tasks, ops_category.CLEANING)
    assert kpi["total"] == 1
    assert kpi["approval_pct"] == 100


def test_build_store_kpis_both_categories():
    tasks = [
        _task(id="1", ops_category=ops_category.CLEANING, status=task_status.COMPLETED),
        _task(id="2", ops_category=ops_category.FRONTS_SIGNAGE, status=task_status.PENDING_REVIEW),
        _task(id="3", ops_category=ops_category.FRONTS_SIGNAGE, status=task_status.PENDING),
    ]
    result = build_store_kpis(tasks)
    assert result["cleaning"]["total"] == 1
    assert result["cleaning"]["approval_pct"] == 100
    assert result["fronts_signage"]["total"] == 2
    assert result["fronts_signage"]["report_pct"] == 50
    assert result["fronts_signage"]["approval_pct"] == 0
