from app.domain.notification_rules import (
    SOUND_ALERT,
    SOUND_NEW_TASK,
    SOUND_NONE,
    SOUND_TASK_END,
    notification_sound_for,
    recipients_for_task_event,
)


def test_created_notifies_assignee_and_manager_unless_creator():
    got = recipients_for_task_event(
        "task_created",
        assignee_user_id="oved1",
        branch_manager_ids=["mgr1"],
        created_by_user_id="mgr1",
    )
    assert got == {"oved1"}

    got2 = recipients_for_task_event(
        "task_created",
        assignee_user_id="oved1",
        branch_manager_ids=["mgr1"],
        created_by_user_id="admin1",
    )
    assert got2 == {"oved1", "mgr1"}


def test_completed_and_started_go_to_manager_only():
    assert recipients_for_task_event(
        "task_started", assignee_user_id="oved1", branch_manager_ids=["mgr1"]
    ) == {"mgr1"}
    assert recipients_for_task_event(
        "task_completed", assignee_user_id="oved1", branch_manager_ids=["mgr1"]
    ) == {"mgr1"}


def test_cancel_and_reopen_go_to_assignee():
    assert recipients_for_task_event(
        "task_cancelled", assignee_user_id="oved1", branch_manager_ids=["mgr1"]
    ) == {"oved1"}
    assert recipients_for_task_event(
        "task_reopened", assignee_user_id="oved1", branch_manager_ids=["mgr1"]
    ) == {"oved1"}


def test_sounds_employee_vs_manager():
    assert notification_sound_for("task_created", recipient_is_employee=True) == SOUND_NEW_TASK
    assert notification_sound_for("task_cancelled", recipient_is_employee=True) == SOUND_TASK_END
    assert notification_sound_for("employee_idle_no_tasks", recipient_is_employee=True) == SOUND_ALERT
    assert notification_sound_for("task_created", recipient_is_employee=False) == SOUND_NONE
