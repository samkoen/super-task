from app.domain.task_chat_alert import is_task_chat_alert


def test_task_chat_kinds_are_alerts():
    assert is_task_chat_alert("task_message_employee") is True
    assert is_task_chat_alert("task_message_manager") is True


def test_other_kinds_are_not_task_chat_alerts():
    assert is_task_chat_alert("task_created") is False
    assert is_task_chat_alert("direct_message") is False
    assert is_task_chat_alert(None) is False
    assert is_task_chat_alert("") is False
