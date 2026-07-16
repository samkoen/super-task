import pytest
from unittest.mock import MagicMock

from app.domain import roles
from app.domain.scope import ActorContext
from app.models.branch import Branch
from app.models.issue_report import IssueReport
from app.models.user import User
from app.services.issue_report_service import IssueReportService


def _service(
    *,
    report=None,
    managers=None,
    reporter=None,
    branch=None,
):
    repo = MagicMock()
    user_repo = MagicMock()
    branch_repo = MagicMock()
    notification_repo = MagicMock()

    repo.create.return_value = report or IssueReport(
        id="r1",
        reporter_user_id="emp1",
        branch_id="b1",
        text="מקרר לא עובד",
        photo_url=None,
        video_url=None,
        audio_url=None,
        created_at="2026-01-01T10:00:00",
    )
    repo.find_by_id.return_value = report or IssueReport(
        id="r1",
        reporter_user_id="emp1",
        branch_id="b1",
        text="מקרר לא עובד",
        photo_url=None,
        video_url=None,
        audio_url=None,
        created_at="2026-01-01T10:00:00",
    )

    user_repo.find_by_id.return_value = reporter or User(
        id="emp1",
        email="e@test.com",
        first_name="דני",
        last_name="כהן",
        role=roles.EMPLOYEE,
        branch_id="b1",
    )
    user_repo.list_users.return_value = managers or [
        User(
            id="mgr1",
            email="m@test.com",
            first_name="מנהל",
            last_name="סניף",
            role=roles.BRANCH_MANAGER,
            branch_id="b1",
            is_active=True,
        )
    ]

    branch_repo.find_by_id.return_value = branch or Branch(
        id="b1", network_id="n1", name="סניף מרכז"
    )
    branch_repo.list_branches.return_value = [branch or Branch(id="b1", network_id="n1", name="סניף מרכז")]

    notification_repo.create.return_value = MagicMock(id="notif1")

    return IssueReportService(repo, user_repo, branch_repo, notification_repo)


def test_employee_creates_with_text_only():
    service = _service()
    actor = ActorContext(user_id="emp1", role=roles.EMPLOYEE, branch_id="b1")

    report, pending = service.create_report(actor, text="מקרר לא עובד")

    assert report["text"] == "מקרר לא עובד"
    assert report["reporter_name"] == "דני כהן"
    assert len(pending) == 1
    service._repo.create.assert_called_once()


def test_employee_creates_with_no_content_raises():
    service = _service()
    actor = ActorContext(user_id="emp1", role=roles.EMPLOYEE, branch_id="b1")

    with pytest.raises(ValueError, match="נדרש לפחות"):
        service.create_report(actor)


def test_non_employee_cannot_create():
    service = _service()
    actor = ActorContext(user_id="mgr1", role=roles.BRANCH_MANAGER, branch_id="b1")

    with pytest.raises(PermissionError):
        service.create_report(actor, text="test")


def test_branch_manager_can_read_report_in_branch():
    report = IssueReport(
        id="r1",
        reporter_user_id="emp1",
        branch_id="b1",
        text="בעיה",
        photo_url=None,
        video_url=None,
        audio_url=None,
        created_at="2026-01-01T10:00:00",
    )
    service = _service(report=report)
    actor = ActorContext(user_id="mgr1", role=roles.BRANCH_MANAGER, branch_id="b1")

    result = service.get_report(actor, "r1")

    assert result["id"] == "r1"
    assert result["text"] == "בעיה"


def test_notifications_created_for_branch_managers():
    service = _service()
    actor = ActorContext(user_id="emp1", role=roles.EMPLOYEE, branch_id="b1")

    _, pending = service.create_report(actor, text="תקלה בקופה")

    service._notifications.create.assert_called_once()
    call_kw = service._notifications.create.call_args.kwargs
    assert call_kw["kind"] == "issue_reported"
    assert call_kw["user_id"] == "mgr1"
    assert call_kw["issue_report_id"] == "r1"
    assert call_kw["branch_id"] == "b1"
    assert len(pending) == 1
    assert pending[0] == ("mgr1", "notif1", "issue_reported")


def test_branch_manager_can_delete_report():
    report = IssueReport(
        id="r1",
        reporter_user_id="emp1",
        branch_id="b1",
        text="בעיה",
        photo_url=None,
        video_url=None,
        audio_url=None,
        created_at="2026-01-01T10:00:00",
    )
    service = _service(report=report)
    service._repo.delete.return_value = True
    actor = ActorContext(user_id="mgr1", role=roles.BRANCH_MANAGER, branch_id="b1")

    service.delete_report(actor, "r1")

    service._notifications.clear_issue_report_links.assert_called_once_with("r1")
    service._repo.delete.assert_called_once_with("r1")


def test_employee_cannot_delete_report():
    service = _service()
    actor = ActorContext(user_id="emp1", role=roles.EMPLOYEE, branch_id="b1")

    with pytest.raises(PermissionError):
        service.delete_report(actor, "r1")
