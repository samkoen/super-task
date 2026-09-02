"""Création d'issues GitHub pour דיווח תקלה במערכת."""

from __future__ import annotations

import json
import logging
from typing import Any
from urllib.error import HTTPError
from urllib.request import Request, urlopen

from app.domain.system_bug import system_bug_screenshot_markdown
from app.integrations.github.config import (
    github_issue_labels,
    github_repo_parts,
    github_token,
)

logger = logging.getLogger(__name__)

GITHUB_API = "https://api.github.com"
GITHUB_UPLOADS = "https://uploads.github.com"


class GitHubApiError(Exception):
    """Erreur HTTP ou réponse inattendue de l'API GitHub."""


def create_system_bug_issue(*, title: str, body: str, screenshot: bytes | None) -> str:
    parts = github_repo_parts()
    token = github_token()
    if not parts or not token:
        raise GitHubApiError("GitHub Issues non configuré")
    owner, repo = parts
    issue = _create_issue(token, owner, repo, title, body)
    html_url = str(issue.get("html_url") or "")
    _attach_screenshot(token, owner, repo, issue, body, screenshot)
    if not html_url:
        raise GitHubApiError("Réponse GitHub sans html_url")
    return html_url


def _attach_screenshot(
    token: str,
    owner: str,
    repo: str,
    issue: dict[str, Any],
    body: str,
    screenshot: bytes | None,
) -> None:
    if not screenshot or not issue.get("id") or not issue.get("number"):
        return
    image_url = _upload_issue_image(token, owner, repo, int(issue["id"]), screenshot)
    if not image_url:
        return
    _patch_issue_body(
        token,
        owner,
        repo,
        int(issue["number"]),
        body + system_bug_screenshot_markdown(image_url),
    )


def _github_headers(token: str, *, json_body: bool = True) -> dict[str, str]:
    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "super-task-system-bug",
    }
    if json_body:
        headers["Content-Type"] = "application/json"
    return headers


def _create_issue(token: str, owner: str, repo: str, title: str, body: str) -> dict[str, Any]:
    payload: dict[str, Any] = {"title": title, "body": body}
    labels = github_issue_labels()
    if labels:
        payload["labels"] = labels
    url = f"{GITHUB_API}/repos/{owner}/{repo}/issues"
    try:
        return _json_request("POST", url, token, payload)
    except GitHubApiError:
        if not labels:
            raise
        logger.warning("[github] labels rejected, retrying without labels")
        return _json_request("POST", url, token, {"title": title, "body": body})


def _patch_issue_body(token: str, owner: str, repo: str, number: int, body: str) -> None:
    _json_request(
        "PATCH",
        f"{GITHUB_API}/repos/{owner}/{repo}/issues/{number}",
        token,
        {"body": body},
    )


def _upload_issue_image(
    token: str,
    owner: str,
    repo: str,
    issue_id: int,
    screenshot: bytes,
) -> str | None:
    url = f"{GITHUB_UPLOADS}/repos/{owner}/{repo}/issues/{issue_id}/images?name=screenshot.png"
    req = Request(url, data=screenshot, method="POST")
    for key, value in _github_headers(token, json_body=False).items():
        req.add_header(key, value)
    req.add_header("Content-Type", "application/octet-stream")
    try:
        data = _read_response(req)
    except GitHubApiError as exc:
        logger.warning("[github] screenshot upload failed: %s", exc)
        return None
    image_url = str(data.get("url") or data.get("html_url") or "")
    return image_url or None


def _json_request(method: str, url: str, token: str, payload: dict[str, Any]) -> dict[str, Any]:
    body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    req = Request(url, data=body, method=method)
    for key, value in _github_headers(token).items():
        req.add_header(key, value)
    return _read_response(req)


def _read_response(req: Request) -> dict[str, Any]:
    try:
        with urlopen(req, timeout=60) as resp:
            raw = resp.read().decode("utf-8", errors="replace")
            if resp.status not in (200, 201, 202):
                raise GitHubApiError(f"GitHub HTTP {resp.status}: {raw[:500]}")
    except HTTPError as exc:
        err_body = exc.read().decode("utf-8", errors="replace") if exc.fp else ""
        raise GitHubApiError(f"GitHub HTTP {exc.code}: {err_body[:500]}") from exc
    try:
        parsed = json.loads(raw) if raw.strip() else {}
    except json.JSONDecodeError as exc:
        raise GitHubApiError("Réponse GitHub invalide") from exc
    return parsed if isinstance(parsed, dict) else {"raw": parsed}
