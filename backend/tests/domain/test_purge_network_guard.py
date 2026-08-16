"""Tests garde-fous purge reshet."""

import pytest

from app.domain.purge_network_guard import PurgeGuardError, assert_can_purge


def test_dry_run_always_allowed():
    assert_can_purge(
        is_production=True,
        dry_run=True,
        yes=False,
        confirm=False,
        understand=False,
        typed_name="",
        expected_name="ירקות",
    )


def test_local_yes_skips_name():
    assert_can_purge(
        is_production=False,
        dry_run=False,
        yes=True,
        confirm=False,
        understand=False,
        typed_name="",
        expected_name="ירקות",
    )


def test_local_requires_matching_name_without_yes():
    with pytest.raises(PurgeGuardError, match="confirmation"):
        assert_can_purge(
            is_production=False,
            dry_run=False,
            yes=False,
            confirm=False,
            understand=False,
            typed_name="autre",
            expected_name="ירקות",
        )


def test_production_requires_both_flags():
    with pytest.raises(PurgeGuardError, match="production"):
        assert_can_purge(
            is_production=True,
            dry_run=False,
            yes=True,
            confirm=True,
            understand=False,
            typed_name="ירקות",
            expected_name="ירקות",
        )


def test_production_requires_exact_name():
    with pytest.raises(PurgeGuardError, match="retapez"):
        assert_can_purge(
            is_production=True,
            dry_run=False,
            yes=True,
            confirm=True,
            understand=True,
            typed_name="autre",
            expected_name="ירקות",
        )
    assert_can_purge(
        is_production=True,
        dry_run=False,
        yes=False,
        confirm=True,
        understand=True,
        typed_name="  ירקות  ",
        expected_name="ירקות",
    )
