import hashlib
import json
import os
import sqlite3
from datetime import datetime, timedelta, timezone
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_USAGE_DATABASE = PROJECT_ROOT / "data" / "usage_events.db"


def usage_database_path():
    configured_path = os.getenv("USAGE_DATABASE_PATH")
    return Path(configured_path).expanduser() if configured_path else DEFAULT_USAGE_DATABASE


def hash_visitor(value):
    salt = os.getenv("USAGE_HASH_SALT") or os.getenv("USAGE_ADMIN_TOKEN") or "local-development"
    text = f"{salt}:{value or 'unknown'}"
    return hashlib.sha256(text.encode("utf-8")).hexdigest()[:20]


def device_category(user_agent):
    text = str(user_agent or "").lower()

    if any(term in text for term in ["mobile", "android", "iphone"]):
        return "mobile"

    if any(term in text for term in ["ipad", "tablet"]):
        return "tablet"

    return "desktop"


def ensure_usage_schema(connection):
    connection.execute(
        """
        CREATE TABLE IF NOT EXISTS usage_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            created_at TEXT NOT NULL,
            event_type TEXT NOT NULL,
            endpoint TEXT NOT NULL,
            visitor_hash TEXT NOT NULL,
            device TEXT NOT NULL,
            purpose TEXT,
            scenario TEXT,
            success INTEGER NOT NULL,
            status_code INTEGER NOT NULL,
            duration_ms INTEGER NOT NULL
        )
        """
    )
    connection.execute(
        "CREATE INDEX IF NOT EXISTS idx_usage_created_at ON usage_events(created_at)"
    )
    connection.execute(
        "CREATE INDEX IF NOT EXISTS idx_usage_event_type ON usage_events(event_type)"
    )
    connection.execute(
        "CREATE INDEX IF NOT EXISTS idx_usage_visitor ON usage_events(visitor_hash)"
    )


def record_usage_event(
    event_type,
    endpoint,
    visitor_hash,
    device="desktop",
    purpose="",
    scenario="",
    success=True,
    status_code=200,
    duration_ms=0,
):
    created_at = datetime.now(timezone.utc).isoformat(timespec="seconds")
    event = {
        "created_at": created_at,
        "event_type": str(event_type or "request"),
        "endpoint": str(endpoint or ""),
        "visitor_hash": str(visitor_hash or "unknown"),
        "device": str(device or "desktop"),
        "purpose": str(purpose or ""),
        "scenario": str(scenario or ""),
        "success": bool(success),
        "status_code": int(status_code),
        "duration_ms": max(0, int(duration_ms or 0)),
    }
    print(f"USAGE_EVENT {json.dumps(event, separators=(',', ':'))}", flush=True)

    path = usage_database_path()
    path.parent.mkdir(parents=True, exist_ok=True)

    with sqlite3.connect(path, timeout=10) as connection:
        ensure_usage_schema(connection)
        connection.execute(
            """
            INSERT INTO usage_events (
                created_at,
                event_type,
                endpoint,
                visitor_hash,
                device,
                purpose,
                scenario,
                success,
                status_code,
                duration_ms
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                event["created_at"],
                event["event_type"],
                event["endpoint"],
                event["visitor_hash"],
                event["device"],
                event["purpose"],
                event["scenario"],
                int(event["success"]),
                event["status_code"],
                event["duration_ms"],
            ),
        )

    return event


def usage_summary(days=30):
    path = usage_database_path()

    if not path.exists():
        return {
            "days": days,
            "total_events": 0,
            "page_visits": 0,
            "unique_visitors": 0,
            "ai_requests": 0,
            "ai_failures": 0,
            "average_ai_duration_ms": 0,
            "events_by_endpoint": [],
            "visits_by_device": [],
            "daily_activity": [],
        }

    cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat(timespec="seconds")

    with sqlite3.connect(path) as connection:
        ensure_usage_schema(connection)
        total_events = connection.execute(
            "SELECT COUNT(*) FROM usage_events WHERE created_at >= ?",
            (cutoff,),
        ).fetchone()[0]
        page_visits = connection.execute(
            """
            SELECT COUNT(*)
            FROM usage_events
            WHERE created_at >= ? AND event_type = 'page_visit'
            """,
            (cutoff,),
        ).fetchone()[0]
        unique_visitors = connection.execute(
            """
            SELECT COUNT(DISTINCT visitor_hash)
            FROM usage_events
            WHERE created_at >= ? AND event_type = 'page_visit'
            """,
            (cutoff,),
        ).fetchone()[0]
        ai_requests, ai_failures, average_duration = connection.execute(
            """
            SELECT
                COUNT(*),
                SUM(CASE WHEN success = 0 THEN 1 ELSE 0 END),
                COALESCE(AVG(duration_ms), 0)
            FROM usage_events
            WHERE created_at >= ? AND event_type = 'ai_request'
            """,
            (cutoff,),
        ).fetchone()
        events_by_endpoint = connection.execute(
            """
            SELECT endpoint, COUNT(*) AS event_count
            FROM usage_events
            WHERE created_at >= ? AND event_type IN ('api_request', 'ai_request')
            GROUP BY endpoint
            ORDER BY event_count DESC, endpoint
            """,
            (cutoff,),
        ).fetchall()
        visits_by_device = connection.execute(
            """
            SELECT device, COUNT(*) AS visit_count
            FROM usage_events
            WHERE created_at >= ? AND event_type = 'page_visit'
            GROUP BY device
            ORDER BY visit_count DESC, device
            """,
            (cutoff,),
        ).fetchall()
        daily_activity = connection.execute(
            """
            SELECT
                SUBSTR(created_at, 1, 10) AS activity_date,
                SUM(CASE WHEN event_type = 'page_visit' THEN 1 ELSE 0 END) AS visits,
                SUM(CASE WHEN event_type = 'ai_request' THEN 1 ELSE 0 END) AS ai_requests
            FROM usage_events
            WHERE created_at >= ?
            GROUP BY activity_date
            ORDER BY activity_date DESC
            LIMIT 31
            """,
            (cutoff,),
        ).fetchall()

    return {
        "days": days,
        "total_events": int(total_events),
        "page_visits": int(page_visits),
        "unique_visitors": int(unique_visitors),
        "ai_requests": int(ai_requests or 0),
        "ai_failures": int(ai_failures or 0),
        "average_ai_duration_ms": int(round(average_duration or 0)),
        "events_by_endpoint": [
            {"endpoint": endpoint, "count": int(count)}
            for endpoint, count in events_by_endpoint
        ],
        "visits_by_device": [
            {"device": device, "count": int(count)}
            for device, count in visits_by_device
        ],
        "daily_activity": [
            {
                "date": activity_date,
                "visits": int(visits or 0),
                "ai_requests": int(ai_requests or 0),
            }
            for activity_date, visits, ai_requests in daily_activity
        ],
    }
