from app.domain.scope import ActorContext
from app.domain.task_scope import (
    can_review_assigned_work,
    can_use_employee_work_surface,
    employee_can_see_occurrence,
)


def _oved(**kwargs) -> ActorContext:
    defaults = {
        "user_id": "e1",
        "role": "employee",
        "network_id": "n1",
        "branch_id": "b1",
    }
    defaults.update(kwargs)
    return ActorContext(**defaults)


def _bm(**kwargs) -> ActorContext:
    defaults = {
        "user_id": "m1",
        "role": "branch_manager",
        "network_id": "n1",
        "branch_id": "b1",
    }
    defaults.update(kwargs)
    return ActorContext(**defaults)


def test_oved_and_dual_hat_menahel_use_employee_surface():
    assert can_use_employee_work_surface(_oved()) is True
    assert can_use_employee_work_surface(_bm()) is True
    assert can_use_employee_work_surface(_bm(branch_id=None)) is False
    assert (
        can_use_employee_work_surface(
            ActorContext(user_id="nm", role="network_manager", network_id="n1")
        )
        is False
    )


def test_employee_sees_own_assigned_task():
    assert (
        employee_can_see_occurrence(_oved(), assignee_user_id="e1", branch_id="b1") is True
    )
    assert (
        employee_can_see_occurrence(_oved(), assignee_user_id="e2", branch_id="b1") is False
    )


def test_cannot_review_own_assigned_work():
    assert can_review_assigned_work(_bm(), assignee_user_id="e1") is True
    assert can_review_assigned_work(_bm(), assignee_user_id="m1") is False
    assert can_review_assigned_work(_oved(), assignee_user_id="e1") is False


def test_branch_manager_sees_own_assigned_task_not_oved_tasks():
    assert employee_can_see_occurrence(_bm(), assignee_user_id="m1", branch_id="b1") is True
    assert employee_can_see_occurrence(_bm(), assignee_user_id="e1", branch_id="b1") is False
    assert employee_can_see_occurrence(_bm(), assignee_user_id="m1", branch_id="b2") is False
