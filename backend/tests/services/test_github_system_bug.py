from app.integrations.github import client


def test_create_issue_attaches_screenshot_not_audio(monkeypatch):
    monkeypatch.setattr(client, "github_token", lambda: "tok")
    monkeypatch.setattr(client, "github_repo_parts", lambda: ("samkoen", "super-task"))
    monkeypatch.setattr(client, "github_issue_labels", lambda: ["system-bug"])
    uploads: list[bytes] = []

    def fake_create(token, owner, repo, title, body):
        assert "webm" not in body
        return {
            "html_url": "https://github.com/samkoen/super-task/issues/3",
            "id": 99,
            "number": 3,
        }

    monkeypatch.setattr(client, "_create_issue", fake_create)
    monkeypatch.setattr(
        client,
        "_upload_issue_image",
        lambda token, owner, repo, issue_id, screenshot: uploads.append(screenshot) or "https://img/s.png",
    )
    patched: list[str] = []
    monkeypatch.setattr(
        client,
        "_patch_issue_body",
        lambda token, owner, repo, number, body: patched.append(body),
    )
    url = client.create_system_bug_issue(title="תקלה", body="טקסט", screenshot=b"png")
    assert url.endswith("/issues/3")
    assert uploads == [b"png"]
    assert "screenshot" in patched[0]


def test_create_issue_skips_upload_without_screenshot(monkeypatch):
    monkeypatch.setattr(client, "github_token", lambda: "tok")
    monkeypatch.setattr(client, "github_repo_parts", lambda: ("samkoen", "super-task"))
    monkeypatch.setattr(
        client,
        "_create_issue",
        lambda *a: {"html_url": "https://github.com/samkoen/super-task/issues/4", "id": 1, "number": 4},
    )

    def fail_upload(*_a):
        raise AssertionError("audio/screenshot must not upload")

    monkeypatch.setattr(client, "_upload_issue_image", fail_upload)
    url = client.create_system_bug_issue(title="t", body="b", screenshot=None)
    assert url.endswith("/issues/4")


def test_github_issues_enabled_requires_token(monkeypatch):
    from app.integrations.github import config as gh_config

    monkeypatch.setattr(gh_config.config, "GITHUB_TOKEN", "")
    monkeypatch.setattr(gh_config.config, "GITHUB_REPO", "samkoen/super-task")
    assert gh_config.github_issues_enabled() is False
    monkeypatch.setattr(gh_config.config, "GITHUB_TOKEN", "ghp_x")
    assert gh_config.github_issues_enabled() is True
