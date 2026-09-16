from app.db import session as db_session
from app.domain import roles
from app.repositories.user_repository import UserRepository
from tests.integration.conftest import PASSWORD, login_client


def _create_admin():
    assert db_session.SessionLocal is not None
    db = db_session.SessionLocal()
    try:
        UserRepository(db).create_user(
            email="admin.release@test.local",
            password=PASSWORD,
            first_name="Admin",
            last_name="Release",
            role=roles.ADMIN,
            email_verified=True,
        )
        db.commit()
    finally:
        db.close()
    return "admin.release@test.local"


def test_latest_empty_for_employee(client_emp):
    response = client_emp.get("/api/app-releases/latest")
    assert response.status_code == 200, response.text
    assert response.json() == {"available": False}


def test_employee_cannot_publish_or_list(client_emp):
    listed = client_emp.get("/api/app-releases")
    assert listed.status_code == 403
    created = client_emp.post(
        "/api/app-releases",
        json={"version_name": "1.1", "apk_url": "/uploads/app_apks/a.apk"},
    )
    assert created.status_code == 403


def test_admin_uploads_and_clients_see_latest(app, client_emp, client_mgr):
    admin = login_client(app, _create_admin())
    uploaded = admin.post(
        "/api/app-releases/upload",
        files={"apk": ("super-release.apk", b"apk-bytes", "application/vnd.android.package-archive")},
    )
    assert uploaded.status_code == 200, uploaded.text
    apk_url = uploaded.json()["url"]
    assert apk_url.startswith("/uploads/app_apks/")

    published = admin.post(
        "/api/app-releases",
        json={"version_name": "1.1", "apk_url": apk_url},
    )
    assert published.status_code == 201, published.text
    assert published.json()["release"]["version_code"] == 101
    assert published.json()["release"]["version_name"] == "1.1"
    assert "apk_url" not in published.json()["release"]

    latest_emp = client_emp.get("/api/app-releases/latest")
    latest_mgr = client_mgr.get("/api/app-releases/latest")
    assert latest_emp.status_code == 200
    assert latest_emp.json()["available"] is True
    assert latest_emp.json()["version_code"] == 101
    assert latest_emp.json()["version_name"] == "1.1"
    assert latest_emp.json()["download_url"] == apk_url
    assert latest_mgr.json()["version_name"] == "1.1"

    listed = admin.get("/api/app-releases")
    assert listed.status_code == 200
    assert listed.json()[0]["version_name"] == "1.1"

    again = admin.post(
        "/api/app-releases",
        json={"version_name": "1.1", "apk_url": apk_url},
    )
    assert again.status_code == 400
