import pytest

import scripts.webapp as webapp


def test_sliding_window_rate_limiter_resets_after_window():
    now = [100.0]
    limiter = webapp.SlidingWindowRateLimiter(2, 60, clock=lambda: now[0])

    assert limiter.allow("client")
    assert limiter.allow("client")
    assert not limiter.allow("client")

    now[0] = 161.0
    assert limiter.allow("client")


def test_resolve_api_key_uses_server_secret_in_public_mode(monkeypatch):
    monkeypatch.setattr(webapp, "PUBLIC_MODE", True)
    monkeypatch.setenv("OPENAI_API_KEY", "server-secret")

    assert webapp.resolve_api_key({"api_key": "browser-secret"}) == "server-secret"


def test_resolve_api_key_rejects_unconfigured_public_ai(monkeypatch):
    monkeypatch.setattr(webapp, "PUBLIC_MODE", True)
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)

    with pytest.raises(RuntimeError, match="not configured"):
        webapp.resolve_api_key({})


def test_validate_payload_rejects_oversized_prompt(monkeypatch):
    monkeypatch.setattr(webapp, "MAX_PROMPT_LENGTH", 10)

    with pytest.raises(ValueError, match="Maximum length"):
        webapp.validate_payload({"prompt": "x" * 11})


def test_public_app_config_disables_internal_tools(monkeypatch):
    monkeypatch.setattr(webapp, "PUBLIC_MODE", True)

    assert webapp.app_config() == {
        "publicMode": True,
        "serverManagedAi": True,
        "ownerLookupEnabled": False,
        "opportunityScanEnabled": False,
    }
