"""Tests unitaires — הגנת ספק."""

import pytest

from app.domain import roles
from app.domain.supplier_protection import (
    assert_can_edit_product_catalog,
    can_edit_product_catalog,
    can_edit_supplier_assignment,
    is_analytic_order_eligible_for_subsidy,
    short_expiry_task_title,
)


def test_store_manager_cannot_edit_catalog():
    assert can_edit_product_catalog(actor_role=roles.BRANCH_MANAGER) is False
    assert can_edit_product_catalog(actor_role="supplier") is True
    assert can_edit_product_catalog(actor_role=roles.ADMIN) is True


def test_assert_blocks_branch_manager():
    with pytest.raises(PermissionError):
        assert_can_edit_product_catalog(roles.BRANCH_MANAGER)


def test_supplier_assignment_permissions():
    assert can_edit_supplier_assignment(actor_role=roles.BRANCH_MANAGER) is False
    assert can_edit_supplier_assignment(actor_role=roles.NETWORK_MANAGER) is True


def test_short_expiry_titles():
    assert "תוקף קצר" in short_expiry_task_title(product_name="חלב", expired=False)
    assert "פינוי" in short_expiry_task_title(product_name="חלב", expired=True)


def test_subsidy_requires_analytic_order():
    assert is_analytic_order_eligible_for_subsidy(was_system_forecast=True, over_ordered=False) is True
    assert is_analytic_order_eligible_for_subsidy(was_system_forecast=True, over_ordered=True) is False
    assert is_analytic_order_eligible_for_subsidy(was_system_forecast=False, over_ordered=False) is False
