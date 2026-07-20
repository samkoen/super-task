"""Hobby Vercel : chaque cron doit tourner au plus 1×/jour."""
from __future__ import annotations

import json
from pathlib import Path

_ROOT = Path(__file__).resolve().parents[2]
_VERCEL_JSON = _ROOT / "vercel.json"


def _runs_more_than_once_per_day(schedule: str) -> bool:
    """True si l'expression cron peut se déclencher plusieurs fois par jour."""
    parts = schedule.split()
    if len(parts) != 5:
        return True
    minute, hour, _dom, _month, _dow = parts
    if minute.startswith("*/"):
        return True
    if "," in minute:
        return True
    if hour == "*" or hour.startswith("*/") or "-" in hour or "," in hour:
        return True
    return False


def test_vercel_crons_are_hobby_daily_compatible():
    data = json.loads(_VERCEL_JSON.read_text(encoding="utf-8"))
    crons = data.get("crons") or []
    assert crons, "vercel.json must declare crons"
    for job in crons:
        schedule = job["schedule"]
        assert not _runs_more_than_once_per_day(schedule), (
            f"{job['path']} schedule {schedule!r} runs more than once/day "
            "(Hobby plan allows daily only)"
        )


def test_expected_cron_paths():
    data = json.loads(_VERCEL_JSON.read_text(encoding="utf-8"))
    paths = {job["path"] for job in data["crons"]}
    assert "/api/cron/purge-media" in paths
    assert "/api/cron/employee-inactivity" in paths


def test_helper_detects_subdaily():
    assert _runs_more_than_once_per_day("*/5 5-19 * * *")
    assert _runs_more_than_once_per_day("0 * * * *")
    assert not _runs_more_than_once_per_day("15 3 * * *")
    assert not _runs_more_than_once_per_day("0 10 * * *")
