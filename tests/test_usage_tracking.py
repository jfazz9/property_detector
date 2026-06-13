import json
import sqlite3

from scripts.webapp_backend.usage_tracking import (
    device_category,
    hash_visitor,
    record_usage_event,
    usage_summary,
)


def test_hash_visitor_is_stable_and_salted(monkeypatch):
    monkeypatch.setenv("USAGE_HASH_SALT", "test-salt")

    first = hash_visitor("203.0.113.10")
    second = hash_visitor("203.0.113.10")

    assert first == second
    assert first != "203.0.113.10"
    assert len(first) == 20


def test_device_category():
    assert device_category("Mozilla/5.0 (iPhone) Mobile") == "mobile"
    assert device_category("Mozilla/5.0 (iPad) Tablet") == "tablet"
    assert device_category("Mozilla/5.0 (Windows NT 10.0)") == "desktop"


def test_record_and_summarize_usage_without_prompt_data(tmp_path, monkeypatch, capsys):
    database = tmp_path / "usage.db"
    monkeypatch.setenv("USAGE_DATABASE_PATH", str(database))

    record_usage_event(
        "page_visit",
        "/",
        "visitor-1",
        device="mobile",
        duration_ms=12,
    )
    record_usage_event(
        "ai_request",
        "/api/ai-scenario-rank",
        "visitor-1",
        device="mobile",
        purpose="sale",
        scenario="best_value",
        duration_ms=250,
    )
    record_usage_event(
        "ai_request",
        "/api/estimate",
        "visitor-2",
        success=False,
        status_code=400,
        duration_ms=100,
    )

    summary = usage_summary(days=30)

    assert summary["page_visits"] == 1
    assert summary["unique_visitors"] == 1
    assert summary["ai_requests"] == 2
    assert summary["ai_failures"] == 1
    assert summary["average_ai_duration_ms"] == 175
    assert summary["events_by_endpoint"][0]["count"] == 1

    with sqlite3.connect(database) as connection:
        columns = {
            row[1]
            for row in connection.execute("PRAGMA table_info(usage_events)")
        }

    assert "prompt" not in columns
    logged = capsys.readouterr().out.strip().splitlines()
    assert all(line.startswith("USAGE_EVENT ") for line in logged)
    assert json.loads(logged[0].removeprefix("USAGE_EVENT "))["event_type"] == "page_visit"
