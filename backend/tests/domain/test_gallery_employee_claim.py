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


def test_not_claimable_other_snif():
    assert (
        gallery_item_claimable_by_employee(
            employee_can_claim=True,
            item_network_id="n1",
            item_branch_id="b2",
            actor=_employee(),
        )
        is False
    )


def test_dual_hat_menahel_can_claim_like_oved():
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
        is True
    )


def test_network_manager_cannot_claim_gallery():
    nm = ActorContext(user_id="nm", role="network_manager", network_id="n1")
    assert (
        gallery_item_claimable_by_employee(
            employee_can_claim=True,
            item_network_id="n1",
            item_branch_id=None,
            actor=nm,
        )
        is False
    )


def test_not_claimable_other_network_or_without_active_snif():
    assert (
        gallery_item_claimable_by_employee(
            employee_can_claim=True,
            item_network_id="n2",
            item_branch_id=None,
            actor=_employee(),
        )
        is False
    )
    assert (
        gallery_item_claimable_by_employee(
            employee_can_claim=True,
            item_network_id="n1",
            item_branch_id=None,
            actor=_employee(branch_id=None),
        )
        is False
    )


def test_open_claim_statuses_exclude_done_and_review():
    from app.domain import task_status
    from app.domain.gallery_employee_claim import CLAIMABLE_OPEN_STATUSES

    assert task_status.PENDING in CLAIMABLE_OPEN_STATUSES
    assert task_status.COMPLETED not in CLAIMABLE_OPEN_STATUSES
    assert task_status.PENDING_REVIEW not in CLAIMABLE_OPEN_STATUSES
    assert task_status.CANCELLED not in CLAIMABLE_OPEN_STATUSES
