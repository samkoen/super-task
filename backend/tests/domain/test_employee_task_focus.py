from types import SimpleNamespace

from app.domain.employee_task_focus import (
    sort_employee_open_focus,
    sort_in_progress_focus_first,
    sort_most_overdue_first,
)


def test_in_progress_most_recently_started_first():
    tasks = [
        SimpleNamespace(id="a", due_at="2026-07-22T08:00:00+03:00", started_at="2026-07-22T09:00:00+03:00"),
        SimpleNamespace(id="b", due_at="2026-07-22T07:00:00+03:00", started_at="2026-07-22T10:00:00+03:00"),
    ]
    assert [t.id for t in sort_in_progress_focus_first(tasks)] == ["b", "a"]


def test_most_overdue_earliest_due_first():
    tasks = [
        SimpleNamespace(id="c", due_at="2026-07-22T14:00:00+03:00"),
        SimpleNamespace(id="a", due_at="2026-07-21T10:00:00+03:00"),
        SimpleNamespace(id="b", due_at="2026-07-22T08:00:00+03:00"),
    ]
    assert [t.id for t in sort_most_overdue_first(tasks)] == ["a", "b", "c"]


def test_manager_next_first_when_no_in_progress():
    tasks = [
        SimpleNamespace(id="late", due_at="2026-07-20T08:00:00+03:00", manager_next_at=None),
        SimpleNamespace(
            id="next",
            due_at="2026-07-22T18:00:00+03:00",
            manager_next_at="2026-07-22T12:00:00+03:00",
        ),
        SimpleNamespace(id="mid", due_at="2026-07-21T08:00:00+03:00", manager_next_at=None),
    ]
    assert [t.id for t in sort_employee_open_focus(tasks, has_in_progress=False)] == [
        "next",
        "late",
        "mid",
    ]


def test_manager_next_ignored_when_has_in_progress():
    tasks = [
        SimpleNamespace(id="late", due_at="2026-07-20T08:00:00+03:00", manager_next_at=None),
        SimpleNamespace(
            id="next",
            due_at="2026-07-22T18:00:00+03:00",
            manager_next_at="2026-07-22T12:00:00+03:00",
        ),
    ]
    assert [t.id for t in sort_employee_open_focus(tasks, has_in_progress=True)] == [
        "late",
        "next",
    ]
