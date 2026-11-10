from app.domain.dev_server import should_reload


def test_reload_is_on_by_default_in_local_development():
    assert should_reload({}) is True
    assert should_reload({"ENVIRONMENT": "development"}) is True


def test_reload_is_off_in_production_and_on_render():
    assert should_reload({"ENVIRONMENT": "production"}) is False
    assert should_reload({"RENDER": "true"}) is False


def test_explicit_setting_always_wins():
    assert should_reload({"UVICORN_RELOAD": "0"}) is False
    assert should_reload({"UVICORN_RELOAD": "false", "ENVIRONMENT": "development"}) is False
    assert should_reload({"UVICORN_RELOAD": "1", "ENVIRONMENT": "production"}) is True
    assert should_reload({"UVICORN_RELOAD": " YES ", "RENDER": "true"}) is True
