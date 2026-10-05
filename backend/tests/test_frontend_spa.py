from pathlib import Path

from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.spa import mount_frontend, resolve_spa_file


def _write_dist(tmp_path: Path) -> Path:
    dist = tmp_path / "dist"
    (dist / "assets").mkdir(parents=True)
    (dist / "index.html").write_text("<!doctype html><title>super</title>", encoding="utf-8")
    (dist / "assets" / "app.js").write_text("console.log(1)\n", encoding="utf-8")
    return dist


def _client(dist: Path) -> TestClient:
    app = FastAPI()

    @app.get("/api/health")
    def health() -> dict:
        return {"status": "ok"}

    mount_frontend(app, dist)
    return TestClient(app)


def test_root_and_client_route_serve_index(tmp_path: Path):
    client = _client(_write_dist(tmp_path))
    root = client.get("/")
    login = client.get("/login")
    assert root.status_code == 200
    assert "text/html" in root.headers["content-type"]
    assert root.text == login.text
    assert "super" in root.text
    assert root.headers["cache-control"] == "no-cache"


def test_hashed_asset_is_served(tmp_path: Path):
    client = _client(_write_dist(tmp_path))
    asset = client.get("/assets/app.js")
    assert asset.status_code == 200
    assert asset.text.startswith("console.log")
    assert asset.headers["cache-control"].startswith("public")


def test_missing_asset_is_404_and_api_stays_json(tmp_path: Path):
    client = _client(_write_dist(tmp_path))
    missing = client.get("/assets/missing.js")
    health = client.get("/api/health")
    unknown_api = client.get("/api/does-not-exist")
    assert missing.status_code == 404
    assert health.status_code == 200
    assert health.json()["status"] == "ok"
    assert unknown_api.status_code == 404
    assert "text/html" not in unknown_api.headers.get("content-type", "")


def test_path_outside_dist_is_not_served(tmp_path: Path):
    dist = _write_dist(tmp_path)
    secret = tmp_path / "secret.txt"
    secret.write_text("nope", encoding="utf-8")
    assert resolve_spa_file(dist, "/../secret.txt") is None
    assert resolve_spa_file(dist, "/assets/../../secret.txt") is None
    client = _client(dist)
    assert client.get("/uploads/secret.txt").status_code == 404


def test_missing_dist_does_not_mount(tmp_path: Path):
    app = FastAPI()
    mount_frontend(app, tmp_path / "absent")
    response = TestClient(app).get("/")
    assert response.status_code == 404
