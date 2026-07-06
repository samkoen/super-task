from datetime import date

from app.domain import task_recurrence


def test_should_generate_daily():
    assert task_recurrence.should_generate_on_date("daily", None, date(2026, 7, 6))


def test_should_generate_weekly_friday():
    friday = date(2026, 7, 10)
    assert friday.weekday() == 4
    assert task_recurrence.should_generate_on_date("weekly", "4", friday)


def test_should_not_generate_weekly_wrong_day():
    monday = date(2026, 7, 6)
    assert not task_recurrence.should_generate_on_date("weekly", "4", monday)


def test_should_generate_monthly_on_target_day():
    assert task_recurrence.should_generate_on_date("monthly", None, date(2026, 7, 15), monthly_day=15)


def test_should_generate_monthly_last_day_of_short_month():
    assert task_recurrence.should_generate_on_date("monthly", None, date(2026, 2, 28), monthly_day=31)


def test_should_not_generate_monthly_wrong_day():
    assert not task_recurrence.should_generate_on_date("monthly", None, date(2026, 7, 10), monthly_day=15)


def test_due_at_for_date():
    due = task_recurrence.due_at_for_date(date(2026, 7, 6), "17:30")
    assert due.hour == 17
    assert due.minute == 30
