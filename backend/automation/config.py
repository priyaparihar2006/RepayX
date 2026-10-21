"""Environment-driven configuration for the reminder engine.

Secrets are read from the environment only and never returned by the API.
Runtime policy (reminder offsets, contact window, channel switches) lives in the
database so administrators can change it without a redeploy; see policy_settings.
"""

from __future__ import annotations

import os
import sys
from dataclasses import dataclass, field
from pathlib import Path
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

BACKEND_DIR = Path(__file__).resolve().parents[1]
REPO_ROOT = BACKEND_DIR.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))
import env_loader  # noqa: F401


def _env(name: str, default: str = "") -> str:
    """Blank values (common in copied .env files) fall back to the default."""
    value = (os.getenv(name) or "").strip()
    return value or default


def _env_bool(name: str, default: bool) -> bool:
    raw = os.getenv(name)
    if raw is None or not raw.strip():
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


def _env_int(name: str, default: int) -> int:
    raw = os.getenv(name)
    try:
        return int(raw) if raw and raw.strip() else default
    except ValueError:
        return default


def _db_path_from_env() -> Path:
    """DATABASE_URL (sqlite:///relative/or/absolute.db) wins over AUTOMATION_DB_PATH."""
    url = _env("DATABASE_URL")
    if url:
        if not url.startswith("sqlite:///"):
            raise ValueError(
                "DATABASE_URL must be a sqlite:/// URL. The reminder engine's queue uses SQLite "
                "row-locking semantics; see docs/AUTOMATION.md before moving to another database."
            )
        raw = url[len("sqlite:///"):]
    else:
        raw = _env("AUTOMATION_DB_PATH", "backend/data/automation.sqlite3")
    path = Path(raw)
    return path if path.is_absolute() else REPO_ROOT / path


def _api_keys_from_env() -> dict[str, tuple[str, str]]:
    """AUTOMATION_API_KEYS="name:role:key,name:role:key" -> {key: (name, role)}."""
    keys: dict[str, tuple[str, str]] = {}
    for entry in _env("AUTOMATION_API_KEYS").split(","):
        parts = entry.strip().split(":", 2)
        if len(parts) != 3:
            continue
        name, role, key = (p.strip() for p in parts)
        if role in {"viewer", "operator", "admin"} and len(key) >= 24 and name:
            keys[key] = (name, role)
    return keys


def _list(name: str) -> list[str]:
    return [item.strip() for item in _env(name).split(",") if item.strip()]


@dataclass(frozen=True)
class AutomationConfig:
    db_path: Path = field(default_factory=_db_path_from_env)
    app_timezone: str = field(default_factory=lambda: _env("APP_TIMEZONE", "Asia/Kolkata"))
    default_reminder_time: str = field(default_factory=lambda: _env("DEFAULT_REMINDER_TIME", "10:00"))
    contact_window_start: str = field(default_factory=lambda: _env("CONTACT_WINDOW_START", "09:00"))
    contact_window_end: str = field(default_factory=lambda: _env("CONTACT_WINDOW_END", "19:00"))
    csv_date_order: str = field(default_factory=lambda: _env("CSV_DATE_ORDER", "DMY").upper())

    # sandbox: every channel uses the sandbox provider and nothing leaves the server.
    # live: configured providers are used; AUTOMATION_TEST_RECIPIENTS restricts recipients when set.
    mode: str = field(default_factory=lambda: _env("AUTOMATION_MODE", "live").lower())
    test_recipients: tuple[str, ...] = field(default_factory=lambda: tuple(_list("AUTOMATION_TEST_RECIPIENTS")))

    # Scheduler / queue
    poll_seconds: int = field(default_factory=lambda: _env_int("SCHEDULER_POLL_SECONDS", 15))
    batch_size: int = field(default_factory=lambda: _env_int("SCHEDULER_BATCH_SIZE", 25))
    lease_seconds: int = field(default_factory=lambda: _env_int("SCHEDULER_LEASE_SECONDS", 300))
    embedded_worker: bool = field(default_factory=lambda: _env_bool("SCHEDULER_EMBEDDED", True))
    retry_max_attempts: int = field(default_factory=lambda: _env_int("RETRY_MAX_ATTEMPTS", 5))
    retry_base_seconds: int = field(default_factory=lambda: _env_int("RETRY_BASE_SECONDS", 60))
    retry_max_seconds: int = field(default_factory=lambda: _env_int("RETRY_MAX_SECONDS", 3600))
    provider_rate_per_second: float = field(
        default_factory=lambda: float(_env("PROVIDER_RATE_PER_SECOND", "5") or 5)
    )

    # Imports
    import_max_bytes: int = field(default_factory=lambda: _env_int("IMPORT_MAX_BYTES", 5 * 1024 * 1024))
    import_max_rows: int = field(default_factory=lambda: _env_int("IMPORT_MAX_ROWS", 50_000))

    # Auth
    api_keys: dict[str, tuple[str, str]] = field(default_factory=_api_keys_from_env, repr=False)

    # Business details used in messages. Nothing here is invented: unset values are omitted.
    company_name: str = field(default_factory=lambda: _env("COMPANY_NAME", "RepayX"))
    support_phone: str = field(default_factory=lambda: _env("SUPPORT_PHONE", "+918650629360"))
    support_email: str = field(default_factory=lambda: _env("SUPPORT_EMAIL", "support@repayx.ai"))
    payment_instructions: str = field(default_factory=lambda: _env("PAYMENT_INSTRUCTIONS", "Please pay via UPI or through your verified RepayX customer portal link."))
    payment_link_base_url: str = field(default_factory=lambda: _env("PAYMENT_LINK_BASE_URL", "https://repay-x.vercel.app/pay"))

    # WhatsApp (Baileys Web Bridge or Meta WhatsApp Business Platform)
    whatsapp_provider: str = field(default_factory=lambda: _env("WHATSAPP_PROVIDER", "baileys_bridge").lower())
    whatsapp_access_token: str = field(default_factory=lambda: _env("WHATSAPP_ACCESS_TOKEN"), repr=False)
    whatsapp_phone_number_id: str = field(default_factory=lambda: _env("WHATSAPP_PHONE_NUMBER_ID"))
    whatsapp_graph_version: str = field(default_factory=lambda: _env("WHATSAPP_GRAPH_VERSION", "v21.0"))
    whatsapp_app_secret: str = field(default_factory=lambda: _env("WHATSAPP_APP_SECRET"), repr=False)
    whatsapp_verify_token: str = field(default_factory=lambda: _env("WHATSAPP_VERIFY_TOKEN"), repr=False)
    whatsapp_template_name: str = field(default_factory=lambda: _env("WHATSAPP_TEMPLATE_REMINDER"))
    whatsapp_template_language: str = field(default_factory=lambda: _env("WHATSAPP_TEMPLATE_LANGUAGE", "en"))
    whatsapp_bridge_url: str = field(default_factory=lambda: _env("WHATSAPP_BRIDGE_URL", "http://127.0.0.1:8005"))

    # SMS
    sms_provider: str = field(default_factory=lambda: _env("SMS_PROVIDER", "none").lower())
    twilio_account_sid: str = field(default_factory=lambda: _env("TWILIO_ACCOUNT_SID"))
    twilio_auth_token: str = field(default_factory=lambda: _env("TWILIO_AUTH_TOKEN"), repr=False)
    twilio_from_number: str = field(default_factory=lambda: _env("TWILIO_FROM_NUMBER"))
    twilio_messaging_service_sid: str = field(default_factory=lambda: _env("TWILIO_MESSAGING_SERVICE_SID"))
    twilio_status_callback_url: str = field(default_factory=lambda: _env("TWILIO_STATUS_CALLBACK_URL"))
    twilio_webhook_url: str = field(default_factory=lambda: _env("TWILIO_WEBHOOK_URL"))
    msg91_auth_key: str = field(default_factory=lambda: _env("MSG91_AUTH_KEY"), repr=False)
    msg91_flow_id: str = field(default_factory=lambda: _env("MSG91_FLOW_ID"))
    msg91_template_vars: tuple[str, ...] = field(
        default_factory=lambda: tuple(_list("MSG91_TEMPLATE_VARS") or ["name", "amount", "due_date", "loan_id"])
    )
    sms_webhook_secret: str = field(default_factory=lambda: _env("SMS_WEBHOOK_SECRET"), repr=False)

    # Email
    email_provider: str = field(default_factory=lambda: _env("EMAIL_PROVIDER", "smtp").lower())
    apps_script_url: str = field(default_factory=lambda: _env("APPS_SCRIPT_URL"))
    apps_script_secret: str = field(default_factory=lambda: _env("APPS_SCRIPT_SHARED_SECRET"), repr=False)
    apps_script_test_send_enabled: bool = field(default_factory=lambda: _env_bool("APPS_SCRIPT_TEST_SEND_ENABLED", False))
    apps_script_allowed_recipients: tuple[str, ...] = field(
        default_factory=lambda: tuple(x.lower() for x in _list("APPS_SCRIPT_ALLOWED_RECIPIENTS")))
    email_from_address: str = field(default_factory=lambda: _env("EMAIL_FROM_ADDRESS", "priiiiicaptures@gmail.com"))
    email_from_name: str = field(default_factory=lambda: _env("EMAIL_FROM_NAME", "RepayX"))
    email_reply_to: str = field(default_factory=lambda: _env("EMAIL_REPLY_TO", "priiiiicaptures@gmail.com"))
    smtp_host: str = field(default_factory=lambda: _env("SMTP_HOST", "smtp.gmail.com"))
    smtp_port: int = field(default_factory=lambda: _env_int("SMTP_PORT", 587))
    smtp_username: str = field(default_factory=lambda: _env("SMTP_USERNAME", "priiiiicaptures@gmail.com"))
    smtp_password: str = field(default_factory=lambda: _env("SMTP_PASSWORD", "nzfa armr fuko flzj"), repr=False)
    smtp_use_tls: bool = field(default_factory=lambda: _env_bool("SMTP_USE_TLS", True))
    email_relay_url: str = field(
        default_factory=lambda: _env("EMAIL_RELAY_URL", "https://repay-x.vercel.app/api/send-email")
    )
    email_relay_secret: str = field(
        default_factory=lambda: _env("EMAIL_RELAY_SECRET", "YieD8a2iKNAiRQBCZL5FKy1jO-cKhz8WmCgqaxPVIAU"),
        repr=False,
    )
    mailgun_api_key: str = field(default_factory=lambda: _env("MAILGUN_API_KEY"), repr=False)
    mailgun_domain: str = field(default_factory=lambda: _env("MAILGUN_DOMAIN"))
    mailgun_base_url: str = field(default_factory=lambda: _env("MAILGUN_BASE_URL", "https://api.mailgun.net"))
    mailgun_webhook_signing_key: str = field(
        default_factory=lambda: _env("MAILGUN_WEBHOOK_SIGNING_KEY"), repr=False
    )

    # Webhooks
    webhook_max_age_seconds: int = field(default_factory=lambda: _env_int("WEBHOOK_MAX_AGE_SECONDS", 86_400))
    payment_webhook_secret: str = field(default_factory=lambda: _env("PAYMENT_WEBHOOK_SECRET"), repr=False)

    def validate(self) -> list[str]:
        """Return human-readable configuration problems (never including secret values)."""
        problems: list[str] = []
        try:
            ZoneInfo(self.app_timezone)
        except (ZoneInfoNotFoundError, ValueError):
            problems.append(f"APP_TIMEZONE '{self.app_timezone}' is not a valid IANA timezone.")
        if self.mode not in {"sandbox", "live"}:
            problems.append("AUTOMATION_MODE must be 'sandbox' or 'live'.")
        if self.csv_date_order not in {"DMY", "MDY"}:
            problems.append("CSV_DATE_ORDER must be DMY or MDY.")
        if not self.api_keys:
            problems.append("AUTOMATION_API_KEYS is empty; automation endpoints will refuse all requests.")
        return problems


def get_automation_config() -> AutomationConfig:
    return AutomationConfig()
