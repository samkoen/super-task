from app.domain.gallery_employee_claim import gallery_item_claimable_by_employee
from app.domain.scope import ActorContext


def _employee(**kwargs) -> ActorContext:
    defaults = {
        "user_id": "e1",
        "role": "employee",
        "network_id": "n1",
        "branch_id": "b1",
    }
    defaults.update(kwargs)
    return ActorContext(**defaults)


def test_claimable_when_flagged_and_same_snif():
    assert (
        gallery_item_claimable_by_employee(
            employee_can_claim=True,
            item_network_id="n1",
            item_branch_id="b1",
            actor=_employee(),
        )
        is True
    )


def test_network_wide_recipe_claimable_on_active_snif():
    assert (
        gallery_item_claimable_by_employee(
            employee_can_claim=True,
            item_network_id="n1",
            item_branch_id=None,
            actor=_employee(),
        )
        is True
    )


def test_not_claimable_without_flag():
    assert (
        gallery_item_claimable_by_employee(
            employee_can_claim=False,
            item_network_id="n1",
            item_branch_id=None,
            actor=_employee(),
        )
        is False
    )


def test_not_claimable_other_snif_or_manager():
    assert (
        gallery_item_claimable_by_employee(
            employee_can_claim=True,
            item_network_id="n1",
            item_branch_id="b2",
            actor=_employee(),
        )
        is False
    )
    manager = ActorContext(
        user_id="m1", role="branch_manager", network_id="n1", branch_id="b1"
    )
    assert (
        gallery_item_claimable_by_employee(
            employee_can_claim=True,
            item_network_id="n1",
            item_branch_id=None,
            actor=manager,
        )
        is False
    )
