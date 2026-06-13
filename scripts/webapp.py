import base64
import binascii
import json
import os
import re
import secrets
import sys
import threading
import time
import traceback
from collections import defaultdict, deque
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from html import escape
from pathlib import Path
from urllib.parse import parse_qs, urlparse

from workflow_paths import normalize_purpose
from webapp_backend import (
    DEFAULT_RESULT_LIMIT,
    ai_agent_plan_prompt,
    ai_client_report_prompt,
    ai_fallback_prompt,
    ai_feedback_prompt,
    ai_scenario_rank_prompt,
    ai_scenario_report_prompt,
    ai_scenario_prompt,
    add_similar_listing_warnings,
    build_budget_fallback_dataframe,
    build_budget_reality_primary_dataframe,
    build_market_context,
    build_over_budget_dataframe,
    check_openai_key,
    clean_number,
    lookup_owner_in_df,
    lookup_owner,
    match_enquiry,
    match_prompt,
    metric_html,
    money,
    opportunity_scan,
    parse_prompt,
    quick_listing_query,
    rows_payload,
    valuation_estimate,
)
from webapp_backend.usage_tracking import (
    device_category,
    hash_visitor,
    record_usage_event,
    usage_summary,
)


def env_bool(name, default=False):
    value = os.getenv(name)

    if value is None:
        return default

    return value.strip().lower() in {"1", "true", "yes", "on"}


HOST = os.getenv("HOST", "0.0.0.0" if env_bool("PUBLIC_MODE") else "127.0.0.1")
PORT = int(os.getenv("PORT", "8000"))
PUBLIC_MODE = env_bool("PUBLIC_MODE")
MAX_REQUEST_BYTES = int(os.getenv("MAX_REQUEST_BYTES", "65536"))
MAX_PROMPT_LENGTH = int(os.getenv("MAX_PROMPT_LENGTH", "2000"))
AI_RATE_LIMIT_REQUESTS = int(os.getenv("AI_RATE_LIMIT_REQUESTS", "8"))
AI_RATE_LIMIT_WINDOW_SECONDS = int(os.getenv("AI_RATE_LIMIT_WINDOW_SECONDS", "14400"))

AI_PATHS = {
    "/api/ai-feedback",
    "/api/ai-fallback",
    "/api/ai-scenario",
    "/api/ai-scenario-rank",
    "/api/ai-scenario-report",
    "/api/agent-plan",
    "/api/client-report",
    "/api/check-openai",
    "/api/estimate",
    "/api/opportunity-scan",
}
PUBLIC_DISABLED_PATHS = {
    "/api/owner-lookup",
}

HTML = Path(__file__).parent.joinpath("webapp_template.html").read_text(encoding="utf-8")

MARKET_COMMUNITIES = ["Azalea", "Camelia", "Casa", "Lila", "Palma", "Rasha", "Reem", "Rosa", "Samara", "Yasmin"]


class SlidingWindowRateLimiter:
    def __init__(self, requests, window_seconds, clock=None):
        self.requests = requests
        self.window_seconds = window_seconds
        self.clock = clock or time.monotonic
        self.events = defaultdict(deque)
        self.lock = threading.Lock()

    def allow(self, key):
        now = self.clock()
        cutoff = now - self.window_seconds

        with self.lock:
            events = self.events[key]

            while events and events[0] <= cutoff:
                events.popleft()

            if len(events) >= self.requests:
                return False

            events.append(now)
            return True


AI_RATE_LIMITER = SlidingWindowRateLimiter(
    AI_RATE_LIMIT_REQUESTS,
    AI_RATE_LIMIT_WINDOW_SECONDS,
)


def app_config():
    return {
        "publicMode": PUBLIC_MODE,
        "serverManagedAi": PUBLIC_MODE,
        "ownerLookupEnabled": not PUBLIC_MODE,
        "opportunityScanEnabled": True,
    }


def resolve_api_key(payload):
    if PUBLIC_MODE:
        api_key = os.getenv("OPENAI_API_KEY", "").strip()

        if not api_key:
            raise RuntimeError("Server AI access is not configured.")

        return api_key

    return str(payload.get("api_key") or os.getenv("OPENAI_API_KEY") or "").strip()


def validate_payload(payload):
    prompt = str(payload.get("prompt") or "")

    if len(prompt) > MAX_PROMPT_LENGTH:
        raise ValueError(
            f"Prompt is too long. Maximum length is {MAX_PROMPT_LENGTH} characters."
        )


def admin_credentials_valid(authorization_header):
    expected_token = os.getenv("USAGE_ADMIN_TOKEN", "").strip()

    if not expected_token or not authorization_header:
        return False

    try:
        scheme, encoded = authorization_header.split(" ", 1)

        if scheme.lower() != "basic":
            return False

        decoded = base64.b64decode(encoded).decode("utf-8")
        _, password = decoded.split(":", 1)
    except (binascii.Error, ValueError, UnicodeDecodeError):
        return False

    return secrets.compare_digest(password, expected_token)


def usage_dashboard_html(summary):
    endpoint_rows = "".join(
        f"<tr><td>{escape(item['endpoint'])}</td><td>{item['count']}</td></tr>"
        for item in summary["events_by_endpoint"]
    ) or '<tr><td colspan="2">No API activity yet.</td></tr>'
    device_rows = "".join(
        f"<tr><td>{escape(item['device'].title())}</td><td>{item['count']}</td></tr>"
        for item in summary["visits_by_device"]
    ) or '<tr><td colspan="2">No visits yet.</td></tr>'
    daily_rows = "".join(
        f"<tr><td>{escape(item['date'])}</td><td>{item['visits']}</td><td>{item['ai_requests']}</td></tr>"
        for item in summary["daily_activity"]
    ) or '<tr><td colspan="3">No activity yet.</td></tr>'

    return f"""<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Property Detector Usage</title>
  <style>
    body {{ margin: 0; background: #f5f6f3; color: #17211c; font: 14px system-ui, sans-serif; }}
    main {{ width: min(980px, calc(100% - 24px)); margin: 0 auto; padding: 24px 0 48px; }}
    h1 {{ margin: 0 0 4px; font-size: 24px; }}
    .sub {{ color: #66736b; margin-bottom: 18px; }}
    .metrics {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(145px, 1fr)); gap: 10px; }}
    .metric, section {{ background: #fff; border: 1px solid #d7ded8; border-radius: 8px; }}
    .metric {{ padding: 14px; }}
    .metric span {{ display: block; color: #66736b; font-size: 11px; text-transform: uppercase; }}
    .metric strong {{ display: block; margin-top: 5px; font-size: 22px; }}
    .grid {{ display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; margin-top: 12px; }}
    section {{ padding: 14px; overflow-x: auto; }}
    section.wide {{ grid-column: 1 / -1; }}
    h2 {{ margin: 0 0 10px; font-size: 15px; }}
    table {{ width: 100%; border-collapse: collapse; }}
    th, td {{ padding: 7px 5px; border-bottom: 1px solid #edf0ed; text-align: left; }}
    th {{ color: #66736b; font-size: 11px; text-transform: uppercase; }}
    td:last-child, th:last-child {{ text-align: right; }}
    @media (max-width: 640px) {{ .grid {{ grid-template-columns: 1fr; }} section.wide {{ grid-column: auto; }} }}
  </style>
</head>
<body>
  <main>
    <h1>Usage Dashboard</h1>
    <div class="sub">Anonymous activity from the last {summary['days']} days. Prompts and raw IP addresses are not stored.</div>
    <div class="metrics">
      <div class="metric"><span>Page visits</span><strong>{summary['page_visits']}</strong></div>
      <div class="metric"><span>Unique visitors</span><strong>{summary['unique_visitors']}</strong></div>
      <div class="metric"><span>AI requests</span><strong>{summary['ai_requests']}</strong></div>
      <div class="metric"><span>AI failures</span><strong>{summary['ai_failures']}</strong></div>
      <div class="metric"><span>Average AI time</span><strong>{summary['average_ai_duration_ms'] / 1000:.1f}s</strong></div>
    </div>
    <div class="grid">
      <section><h2>Feature usage</h2><table><thead><tr><th>Endpoint</th><th>Uses</th></tr></thead><tbody>{endpoint_rows}</tbody></table></section>
      <section><h2>Visits by device</h2><table><thead><tr><th>Device</th><th>Visits</th></tr></thead><tbody>{device_rows}</tbody></table></section>
      <section class="wide"><h2>Daily activity</h2><table><thead><tr><th>Date</th><th>Visits</th><th>AI requests</th></tr></thead><tbody>{daily_rows}</tbody></table></section>
    </div>
  </main>
</body>
</html>"""


def page_template():
    if not PUBLIC_MODE:
        return HTML

    page = re.sub(
        r'\s*<button class="ghost" id="ai-key-toggle"[^>]*>.*?</button>',
        "",
        HTML,
        count=1,
        flags=re.DOTALL,
    )
    return re.sub(
        r'\s*<!-- AI key bar.*?<div class="key-bar" id="key-bar".*?</div>',
        "",
        page,
        count=1,
        flags=re.DOTALL,
    )


def page_for_result(
    result=None,
    prompt="",
    selected_purpose="auto",
    selected_intent="auto",
    selected_listing_scope="auto",
    selected_listing_communities=None,
    selected_market_scope="auto",
    selected_market_communities=None,
    error_message="",
):
    selected = {
        "auto": "",
        "sale": "",
        "rent": "",
    }
    intent_selected = {
        "auto": "",
        "best_value": "",
        "move_in_ready": "",
        "upgrade_potential": "",
        "negotiation": "",
        "listing_opportunity": "",
    }
    market_selected = {
        "auto": "",
        "exact": "",
        "similar": "",
        "custom": "",
    }
    listing_selected = {
        "auto": "",
        "exact": "",
        "similar": "",
        "custom": "",
    }
    selected_listing_communities = selected_listing_communities or []
    selected_market_communities = selected_market_communities or []
    selected[normalize_purpose(selected_purpose) if selected_purpose in {"sale", "rent"} else "auto"] = "selected"
    intent_selected[selected_intent if selected_intent in intent_selected else "auto"] = "selected"
    listing_selected[selected_listing_scope if selected_listing_scope in listing_selected else "auto"] = "selected"
    market_selected[selected_market_scope if selected_market_scope in market_selected else "auto"] = "selected"
    listing_checkboxes = "\n".join(
        f'<label><input class="listing-community" type="checkbox" name="listing_communities" value="{escape(community)}" {"checked" if community in selected_listing_communities else ""}> {escape(community)}</label>'
        for community in MARKET_COMMUNITIES
    )
    market_checkboxes = "\n".join(
        f'<label><input class="market-community" type="checkbox" name="market_communities" value="{escape(community)}" {"checked" if community in selected_market_communities else ""}> {escape(community)}</label>'
        for community in MARKET_COMMUNITIES
    )
    summary_html = ""
    response_html = ""
    results_html = ""
    above_budget_html = ""
    response_hidden = "hidden"
    above_budget_hidden = "hidden"
    error_hidden = "hidden"
    error_html = escape(error_message)

    if result:
        enquiry = result["enquiry"]
        purpose = enquiry["purpose"]
        summary_html = "".join([
            metric_html("Purpose", purpose),
            metric_html("Budget", money(enquiry.get("budget"), purpose)),
            metric_html("Search ceiling", money(enquiry.get("stretch_budget"), purpose)),
            metric_html("Beds", enquiry.get("bedrooms_label")),
            metric_html("Community", enquiry.get("community") or "Any"),
            metric_html("Intent", enquiry.get("search_intent", "auto").replace("_", " ").title()),
        ])
        response_html = escape(result["client_response"])
        response_hidden = ""

        for item in result["matches"]:
            title = escape(str(item.get("title") or "Untitled listing"))
            listing_url = escape(str(item.get("url") or "#"))
            reasons = escape(str(item.get("match_reasons") or ""))
            clues = escape(str(item.get("outdoor_matches") or ""))
            clue_html = f'<div class="reasons"><strong>Clues:</strong> {clues}</div>' if clues else ""
            results_html += f"""
        <article class="listing">
          <div>
            <h2>{title}</h2>
            <div class="facts">
              <span class="pill price">{escape(money(item.get("price"), purpose))}</span>
              <span class="pill">{escape(str(item.get("bedrooms") or "?"))} bed</span>
              <span class="pill">{escape(str(item.get("bathrooms") or "?"))} bath</span>
              <span class="pill">{escape(str(item.get("predicted_community") or "Unknown"))}</span>
              <span class="pill">{escape(str(item.get("predicted_type") or "Type unknown"))}</span>
              <span class="pill">{escape(str(item.get("property_size_sqft") or "?"))} sqft</span>
            </div>
            <div class="reasons">{reasons}</div>
            {clue_html}
            {f'<div class="exclusive-box"><strong>Exclusive listing:</strong> likely strong agent-owner relationship. Avoid owner call unless you have another clear lead.</div>' if item.get("has_exclusive_warning") else ""}
            {f'<div class="similar-box"><strong>Similar listing warning:</strong> {escape(str(item.get("similar_count")))} listings share close price/details. Check photos before treating as the same property.</div>' if clean_number(item.get("similar_count")) and clean_number(item.get("similar_count")) > 1 else ""}
            <div class="card-actions">
              <a href="{listing_url}" target="_blank" rel="noreferrer">Open listing</a>
              <button class="mini copy-link-button" type="button" data-copy="{listing_url}">Copy link</button>
            </div>
          </div>
          <div class="score"><span class="score-badge">{escape(str(item.get("match_score") or 0))}</span></div>
        </article>
"""

        over_budget_matches = result.get("over_budget_matches", [])
        above_budget_hidden = "hidden" if not over_budget_matches else ""

        for item in over_budget_matches:
            title = escape(str(item.get("title") or "Untitled listing"))
            listing_url = escape(str(item.get("url") or "#"))
            reasons = escape(str(item.get("match_reasons") or ""))
            clues = escape(str(item.get("outdoor_matches") or ""))
            clue_html = f'<div class="reasons"><strong>Clues:</strong> {clues}</div>' if clues else ""
            above_budget_html += f"""
        <article class="listing">
          <div>
            <h2>{title}</h2>
            <div class="facts">
              <span class="pill price">{escape(money(item.get("price"), purpose))}</span>
              <span class="pill">{escape(str(item.get("bedrooms") or "?"))} bed</span>
              <span class="pill">{escape(str(item.get("bathrooms") or "?"))} bath</span>
              <span class="pill">{escape(str(item.get("predicted_community") or "Unknown"))}</span>
              <span class="pill">{escape(str(item.get("predicted_type") or "Type unknown"))}</span>
              <span class="pill">{escape(str(item.get("property_size_sqft") or "?"))} sqft</span>
            </div>
            <div class="reasons">{reasons}</div>
            {clue_html}
            {f'<div class="exclusive-box"><strong>Exclusive listing:</strong> likely strong agent-owner relationship. Avoid owner call unless you have another clear lead.</div>' if item.get("has_exclusive_warning") else ""}
            <div class="card-actions">
              <a href="{listing_url}" target="_blank" rel="noreferrer">Open listing</a>
              <button class="mini copy-link-button" type="button" data-copy="{listing_url}">Copy link</button>
            </div>
          </div>
          <div class="score"><span class="score-badge">{escape(str(item.get("match_score") or 0))}</span></div>
        </article>
"""

    if error_message:
        error_hidden = ""

    return (
        page_template()
        .replace(
            "__AI_KEY_TOGGLE__",
            "" if PUBLIC_MODE else '<button class="ghost" id="ai-key-toggle" type="button">AI key</button>',
        )
        .replace(
            "__AI_KEY_BAR__",
            "" if PUBLIC_MODE else (
                '<div class="key-bar" id="key-bar" hidden>'
                '<input id="openai-token" type="password" autocomplete="off" '
                'placeholder="OpenAI API key - session only, not saved">'
                '<button class="ghost" id="check-openai" type="button" '
                'style="white-space:nowrap">Check key</button>'
                '</div>'
            ),
        )
        .replace("__PROMPT__", escape(prompt))
        .replace("__INTENT_AUTO_SELECTED__", intent_selected["auto"])
        .replace("__INTENT_BEST_VALUE_SELECTED__", intent_selected["best_value"])
        .replace("__INTENT_MOVE_IN_READY_SELECTED__", intent_selected["move_in_ready"])
        .replace("__INTENT_UPGRADE_POTENTIAL_SELECTED__", intent_selected["upgrade_potential"])
        .replace("__INTENT_NEGOTIATION_SELECTED__", intent_selected["negotiation"])
        .replace("__INTENT_LISTING_OPPORTUNITY_SELECTED__", intent_selected["listing_opportunity"])
        .replace("__LISTING_AUTO_SELECTED__", listing_selected["auto"])
        .replace("__LISTING_EXACT_SELECTED__", listing_selected["exact"])
        .replace("__LISTING_SIMILAR_SELECTED__", listing_selected["similar"])
        .replace("__LISTING_CUSTOM_SELECTED__", listing_selected["custom"])
        .replace("__LISTING_COMMUNITY_CHECKBOXES__", listing_checkboxes)
        .replace("__MARKET_AUTO_SELECTED__", market_selected["auto"])
        .replace("__MARKET_EXACT_SELECTED__", market_selected["exact"])
        .replace("__MARKET_SIMILAR_SELECTED__", market_selected["similar"])
        .replace("__MARKET_CUSTOM_SELECTED__", market_selected["custom"])
        .replace("__MARKET_COMMUNITY_CHECKBOXES__", market_checkboxes)
        .replace("__AUTO_SELECTED__", selected["auto"])
        .replace("__SALE_SELECTED__", selected["sale"])
        .replace("__RENT_SELECTED__", selected["rent"])
        .replace("__SUMMARY_HTML__", summary_html)
        .replace("__RESPONSE_HTML__", response_html)
        .replace("__RESPONSE_HIDDEN__", response_hidden)
        .replace("__ERROR_HTML__", error_html)
        .replace("__ERROR_HIDDEN__", error_hidden)
        .replace("__RESULTS_HTML__", results_html)
        .replace("__ABOVE_BUDGET_HTML__", above_budget_html)
        .replace("__ABOVE_BUDGET_HIDDEN__", above_budget_hidden)
        .replace("__APP_CONFIG__", json.dumps(app_config()))
    )


class AppHandler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        return

    def send_security_headers(self):
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("X-Frame-Options", "DENY")
        self.send_header("Referrer-Policy", "strict-origin-when-cross-origin")
        self.send_header(
            "Content-Security-Policy",
            "default-src 'self'; img-src 'self' https: data:; "
            "style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; "
            "connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
        )

    def send_json(self, data, status=200):
        body = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_security_headers()
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def send_html(self, html, status=200, extra_headers=None):
        body = html.encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_security_headers()

        for name, value in (extra_headers or {}).items():
            self.send_header(name, value)

        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def usage_identity(self):
        return (
            hash_visitor(self.client_key()),
            device_category(self.headers.get("User-Agent", "")),
        )

    def record_event(
        self,
        event_type,
        endpoint,
        payload=None,
        success=True,
        status_code=200,
        started_at=None,
    ):
        try:
            visitor_hash, device = self.usage_identity()
            duration_ms = (
                int(round((time.monotonic() - started_at) * 1000))
                if started_at is not None
                else 0
            )
            record_usage_event(
                event_type,
                endpoint,
                visitor_hash,
                device=device,
                purpose=(payload or {}).get("purpose", ""),
                scenario=(payload or {}).get("scenario", ""),
                success=success,
                status_code=status_code,
                duration_ms=duration_ms,
            )
        except Exception as exc:
            print(f"USAGE_TRACKING_ERROR {exc}", flush=True)

    def do_GET(self):
        started_at = time.monotonic()
        parsed_url = urlparse(self.path)
        path = parsed_url.path

        if path == "/health":
            self.send_json({"status": "ok"})
            return

        if path == "/admin/usage":
            if not admin_credentials_valid(self.headers.get("Authorization", "")):
                self.send_html(
                    "<h1>Authentication required</h1>",
                    status=401,
                    extra_headers={"WWW-Authenticate": 'Basic realm="Property Detector Usage"'},
                )
                return

            self.send_html(usage_dashboard_html(usage_summary(days=30)))
            return

        if path.startswith("/static/"):
            # serve from scripts/static/
            static_dir = (Path(__file__).parent / "static").resolve()
            file_path = (static_dir / path[len("/static/"):]).resolve()
            if not file_path.is_file() or static_dir not in file_path.parents:
                self.send_error(404)
                return
            suffix = file_path.suffix.lower()
            content_types = {".css": "text/css; charset=utf-8", ".js": "application/javascript; charset=utf-8"}
            ct = content_types.get(suffix, "application/octet-stream")
            body = file_path.read_bytes()
            self.send_response(200)
            self.send_header("Content-Type", ct)
            self.send_security_headers()
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return

        if path not in {"/", "/index.html", "/search"}:
            self.send_error(404)
            return

        if path == "/search":
            params = parse_qs(parsed_url.query)
            prompt = params.get("prompt", [""])[0]
            purpose = params.get("purpose", ["auto"])[0]
            intent = params.get("intent", ["auto"])[0]
            listing_scope = params.get("listing_scope", ["auto"])[0]
            listing_communities = params.get("listing_communities", [])
            market_scope = params.get("market_scope", ["auto"])[0]
            market_communities = params.get("market_communities", [])

            try:
                body_text = page_for_result(
                    match_prompt(
                        prompt,
                        selected_purpose=purpose,
                        selected_intent=intent,
                        listing_scope=listing_scope,
                        listing_communities=listing_communities,
                        market_scope=market_scope,
                        market_communities=market_communities,
                        limit=DEFAULT_RESULT_LIMIT,
                    ),
                    prompt=prompt,
                    selected_purpose=purpose,
                    selected_intent=intent,
                    selected_listing_scope=listing_scope,
                    selected_listing_communities=listing_communities,
                    selected_market_scope=market_scope,
                    selected_market_communities=market_communities,
                )
            except Exception as exc:
                body_text = page_for_result(
                    prompt=prompt,
                    selected_purpose=purpose,
                    selected_intent=intent,
                    selected_listing_scope=listing_scope,
                    selected_listing_communities=listing_communities,
                    selected_market_scope=market_scope,
                    selected_market_communities=market_communities,
                    error_message=str(exc),
                )
        else:
            body_text = page_for_result()

        body = body_text.encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_security_headers()
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)
        self.record_event("page_visit", path, started_at=started_at)

    def do_POST(self):
        started_at = time.monotonic()
        path = urlparse(self.path).path
        event_type = "ai_request" if path in AI_PATHS else "api_request"

        if path not in {"/api/match", "/api/quick-query", "/api/ai-feedback", "/api/ai-fallback", "/api/ai-scenario", "/api/ai-scenario-rank", "/api/ai-scenario-report", "/api/agent-plan", "/api/client-report", "/api/check-openai", "/api/owner-lookup", "/api/estimate", "/api/opportunity-scan"}:
            self.send_error(404)
            return

        if PUBLIC_MODE and path in PUBLIC_DISABLED_PATHS:
            self.send_json({"error": "This internal tool is disabled in the public app."}, status=403)
            self.record_event(event_type, path, success=False, status_code=403, started_at=started_at)
            return

        if PUBLIC_MODE and path in AI_PATHS and not AI_RATE_LIMITER.allow(self.client_key()):
            self.send_json(
                {
                    "error": (
                        "AI usage limit reached for this connection. "
                        "Please try again later."
                    )
                },
                status=429,
            )
            self.record_event(event_type, path, success=False, status_code=429, started_at=started_at)
            return

        payload = {}

        try:
            length = int(self.headers.get("Content-Length", "0"))

            if length <= 0 or length > MAX_REQUEST_BYTES:
                self.send_json(
                    {"error": f"Request body must be between 1 and {MAX_REQUEST_BYTES} bytes."},
                    status=413,
                )
                self.record_event(event_type, path, success=False, status_code=413, started_at=started_at)
                return

            payload = json.loads(self.rfile.read(length).decode("utf-8"))
            validate_payload(payload)
            api_key = resolve_api_key(payload) if path in AI_PATHS else ""

            if path == "/api/check-openai":
                result = check_openai_key(api_key)
            elif path == "/api/owner-lookup":
                result = lookup_owner(payload.get("url", ""))
            elif path == "/api/quick-query":
                result = quick_listing_query(
                    selected_purpose=payload.get("purpose", "sale"),
                    min_beds=payload.get("min_beds"),
                    max_beds=payload.get("max_beds"),
                    min_price=payload.get("min_price"),
                    max_price=payload.get("max_price"),
                    community=payload.get("community", ""),
                    category=payload.get("category", "any"),
                    limit=DEFAULT_RESULT_LIMIT,
                )
            elif path == "/api/ai-feedback":
                result = ai_feedback_prompt(
                    payload.get("prompt", ""),
                    selected_purpose=payload.get("purpose", "auto"),
                    selected_intent=payload.get("intent", "auto"),
                    listing_scope=payload.get("listing_scope", "auto"),
                    listing_communities=payload.get("listing_communities", []),
                    market_scope=payload.get("market_scope", "auto"),
                    market_communities=payload.get("market_communities", []),
                    api_key=api_key,
                    limit=int(payload.get("limit", 10)),
                )
            elif path == "/api/ai-fallback":
                result = ai_fallback_prompt(
                    payload.get("prompt", ""),
                    selected_purpose=payload.get("purpose", "auto"),
                    api_key=api_key,
                    limit=int(payload.get("limit", 10)),
                    candidate_urls=payload.get("candidate_urls", []),
                    listing_scope=payload.get("listing_scope", "auto"),
                    listing_communities=payload.get("listing_communities", []),
                    market_scope=payload.get("market_scope", "auto"),
                    market_communities=payload.get("market_communities", []),
                )
            elif path == "/api/ai-scenario":
                result = ai_scenario_prompt(
                    payload.get("prompt", ""),
                    payload.get("scenario", "best_value"),
                    selected_purpose=payload.get("purpose", "auto"),
                    api_key=api_key,
                    limit=int(payload.get("limit", 10)),
                    candidate_urls=payload.get("candidate_urls", []),
                    premium_candidate_urls=payload.get("premium_candidate_urls", []),
                    listing_scope=payload.get("listing_scope", "auto"),
                    listing_communities=payload.get("listing_communities", []),
                    market_scope=payload.get("market_scope", "auto"),
                    market_communities=payload.get("market_communities", []),
                )
            elif path == "/api/ai-scenario-rank":
                result = ai_scenario_rank_prompt(
                    payload.get("prompt", ""),
                    payload.get("scenario", "best_value"),
                    selected_purpose=payload.get("purpose", "auto"),
                    api_key=api_key,
                    limit=int(payload.get("limit", 10)),
                    candidate_urls=payload.get("candidate_urls", []),
                    premium_candidate_urls=payload.get("premium_candidate_urls", []),
                    listing_scope=payload.get("listing_scope", "auto"),
                    listing_communities=payload.get("listing_communities", []),
                    market_scope=payload.get("market_scope", "auto"),
                    market_communities=payload.get("market_communities", []),
                )
            elif path == "/api/ai-scenario-report":
                result = ai_scenario_report_prompt(
                    payload.get("prompt", ""),
                    payload.get("scenario", "best_value"),
                    ranked_urls=payload.get("ranked_urls", []),
                    selected_purpose=payload.get("purpose", "auto"),
                    api_key=api_key,
                    limit=int(payload.get("limit", 10)),
                    listing_scope=payload.get("listing_scope", "auto"),
                    listing_communities=payload.get("listing_communities", []),
                    market_scope=payload.get("market_scope", "auto"),
                    market_communities=payload.get("market_communities", []),
                )
            elif path == "/api/client-report":
                result = ai_client_report_prompt(
                    payload.get("prompt", ""),
                    payload.get("scenario", "best_value"),
                    ranked_urls=payload.get("ranked_urls", []),
                    built_matches=payload.get("built_matches", []),
                    built_report=payload.get("built_report", {}),
                    selected_purpose=payload.get("purpose", "auto"),
                    api_key=api_key,
                    limit=int(payload.get("limit", 6)),
                    listing_scope=payload.get("listing_scope", "auto"),
                    listing_communities=payload.get("listing_communities", []),
                    market_scope=payload.get("market_scope", "auto"),
                    market_communities=payload.get("market_communities", []),
                )
            elif path == "/api/agent-plan":
                result = ai_agent_plan_prompt(
                    payload.get("prompt", ""),
                    payload.get("scenario", "best_value"),
                    ranked_urls=payload.get("ranked_urls", []),
                    built_matches=payload.get("built_matches", []),
                    built_report=payload.get("built_report", {}),
                    selected_purpose=payload.get("purpose", "auto"),
                    api_key=api_key,
                    limit=int(payload.get("limit", 6)),
                    listing_scope=payload.get("listing_scope", "auto"),
                    listing_communities=payload.get("listing_communities", []),
                    market_scope=payload.get("market_scope", "auto"),
                    market_communities=payload.get("market_communities", []),
                )
            elif path == "/api/estimate":
                result = valuation_estimate(
                    payload.get("prompt", ""),
                    selected_purpose=payload.get("purpose", "sale"),
                    api_key=api_key,
                    extra_communities=payload.get("extra_communities", []),
                )
            elif path == "/api/opportunity-scan":
                result = opportunity_scan(
                    api_key=api_key,
                    community_filter=payload.get("community_filter") or None,
                    beds_filter=payload.get("beds_filter") or None,
                    purpose_filter=payload.get("purpose_filter", "both"),
                    limit=int(payload.get("limit", 15)),
                )
            else:
                result = match_prompt(
                    payload.get("prompt", ""),
                    selected_purpose=payload.get("purpose", "auto"),
                    selected_intent=payload.get("intent", "auto"),
                    listing_scope=payload.get("listing_scope", "auto"),
                    listing_communities=payload.get("listing_communities", []),
                    market_scope=payload.get("market_scope", "auto"),
                    market_communities=payload.get("market_communities", []),
                    limit=int(payload.get("limit", 10)),
                )
            self.send_json(result)
            self.record_event(
                event_type,
                path,
                payload=payload,
                started_at=started_at,
            )
        except Exception as exc:
            traceback.print_exc()
            message = str(exc)

            if "insufficient_quota" in message or "quota" in message.lower():
                message = "OpenAI quota/billing issue. Check your OpenAI billing and usage limits."
            elif "invalid_api_key" in message or "Incorrect API key" in message:
                message = "OpenAI API key was rejected. Create a fresh key and try again."
            elif "timed out" in message.lower() or "timeout" in message.lower():
                message = "OpenAI request timed out. Try again, or reduce the number of results."

            self.send_json({"error": message}, status=400)
            self.record_event(
                event_type,
                path,
                payload=payload,
                success=False,
                status_code=400,
                started_at=started_at,
            )

    def client_key(self):
        forwarded_for = self.headers.get("X-Forwarded-For", "")

        if forwarded_for:
            return forwarded_for.split(",", 1)[0].strip()

        return self.client_address[0]


def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else PORT
    server = ThreadingHTTPServer((HOST, port), AppHandler)
    print(f"Property Detector web app running at http://{HOST}:{port}/")
    print("Press Ctrl+C to stop.")
    server.serve_forever()


if __name__ == "__main__":
    main()
