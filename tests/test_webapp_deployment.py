import pytest
import base64

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


def test_public_app_config_keeps_opportunity_scan_and_disables_owner_lookup(monkeypatch):
    monkeypatch.setattr(webapp, "PUBLIC_MODE", True)

    assert webapp.app_config() == {
        "publicMode": True,
        "serverManagedAi": True,
        "ownerLookupEnabled": False,
        "opportunityScanEnabled": True,
    }


def test_public_page_omits_api_key_controls(monkeypatch):
    monkeypatch.setattr(webapp, "PUBLIC_MODE", True)

    page = webapp.page_for_result()

    assert 'id="ai-key-toggle"' not in page
    assert 'id="openai-token"' not in page
    assert 'id="check-openai"' not in page
    assert 'id="opp-scan-sale"' in page
    assert 'id="opp-scan-rent"' in page
    assert "/api/opportunity-scan" not in webapp.PUBLIC_DISABLED_PATHS


def test_admin_credentials_require_configured_basic_auth(monkeypatch):
    monkeypatch.setenv("USAGE_ADMIN_TOKEN", "admin-secret")
    encoded = base64.b64encode(b"admin:admin-secret").decode("ascii")

    assert webapp.admin_credentials_valid(f"Basic {encoded}")
    assert not webapp.admin_credentials_valid("")
    assert not webapp.admin_credentials_valid("Bearer admin-secret")
    assert not webapp.admin_credentials_valid("Basic not-base64")


def test_usage_dashboard_does_not_expose_prompt_data():
    page = webapp.usage_dashboard_html({
        "days": 30,
        "page_visits": 2,
        "unique_visitors": 1,
        "ai_requests": 1,
        "ai_failures": 0,
        "average_ai_duration_ms": 1200,
        "events_by_endpoint": [{"endpoint": "/api/estimate", "count": 1}],
        "visits_by_device": [{"device": "mobile", "count": 2}],
        "daily_activity": [{"date": "2026-06-12", "visits": 2, "ai_requests": 1}],
    })

    assert "Usage Dashboard" in page
    assert "/api/estimate" in page
    assert "raw IP addresses are not stored" in page


def test_visit_email_requires_explicit_smtp_config(monkeypatch):
    monkeypatch.setattr(webapp, "VISIT_EMAIL_ENABLED", True)
    monkeypatch.setattr(webapp, "VISIT_EMAIL_TO", "owner@example.com")
    monkeypatch.setattr(webapp, "VISIT_EMAIL_FROM", "alerts@example.com")
    monkeypatch.setattr(webapp, "SMTP_HOST", "smtp.example.com")
    monkeypatch.setattr(webapp, "SMTP_USERNAME", "alerts@example.com")
    monkeypatch.setattr(webapp, "SMTP_PASSWORD", "")

    assert not webapp.visit_email_configured()

    monkeypatch.setattr(webapp, "SMTP_PASSWORD", "secret")
    assert webapp.visit_email_configured()


def test_private_ip_location_does_not_call_geolocation():
    location = webapp.lookup_visit_location("127.0.0.1")

    assert location["label"] == "Local/private network"
