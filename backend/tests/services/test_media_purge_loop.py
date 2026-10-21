from app.services.media_purge_loop import run_media_purge_once


def test_run_media_purge_once_skips_without_database(monkeypatch):
    monkeypatch.setattr("app.services.media_purge_loop.db_session.SessionLocal", None)
    run_media_purge_once()
