"""Tests multi-snif — résolution snif actif."""
from app.domain.user_membership import (
    employee_belongs_to_branch,
    membership_branch_ids_unique,
    resolve_active_branch_id,
)


def test_resolve_prefers_requested_when_member():
    assert (
        resolve_active_branch_id(
            membership_branch_ids=["a", "b"],
            primary_branch_id="a",
            requested_branch_id="b",
        )
        == "b"
    )


def test_resolve_falls_back_to_primary():
    assert (
        resolve_active_branch_id(
            membership_branch_ids=["a", "b"],
            primary_branch_id="a",
            requested_branch_id="other",
        )
        == "a"
    )


def test_resolve_empty_memberships_uses_primary():
    assert (
        resolve_active_branch_id(
            membership_branch_ids=[],
            primary_branch_id="a",
            requested_branch_id="b",
        )
        == "a"
    )


def test_unique_preserves_order():
    assert membership_branch_ids_unique(["b", "a", "b", ""]) == ["b", "a"]


def test_employee_belongs_to_primary_or_membership():
    assert employee_belongs_to_branch(
        primary_branch_id="a",
        membership_branch_ids=["a", "b"],
        branch_id="b",
    )
    assert employee_belongs_to_branch(
        primary_branch_id="a",
        membership_branch_ids=[],
        branch_id="a",
    )
    assert not employee_belongs_to_branch(
        primary_branch_id="a",
        membership_branch_ids=["a"],
        branch_id="c",
    )
