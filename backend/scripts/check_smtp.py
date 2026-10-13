"""Verify configured SMTP TLS/login only. Never issues MAIL, RCPT, or DATA."""
from __future__ import annotations

import json
from pathlib import Path
import smtplib
import ssl
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from env_loader import load_environment
from automation.config import AutomationConfig
from automation.util import normalize_email


def check() -> dict:
    loaded = load_environment()
    config = AutomationConfig()
    result = {
        'root_env_loaded': loaded == Path(__file__).resolve().parents[2] / '.env',
        'sandbox': config.mode == 'sandbox',
        'provider_smtp': config.email_provider == 'smtp',
        'sender_valid': normalize_email(config.email_from_address) is not None,
        'sender_matches_login': config.email_from_address.lower() == config.smtp_username.lower(),
        'credentials_present': bool(config.smtp_username and config.smtp_password),
        'connection': 'NOT_TESTED', 'tls': 'NOT_TESTED', 'authentication': 'NOT_TESTED',
        'email_sent': False,
    }
    # This verifier intentionally supports only the existing STARTTLS adapter.
    if not all(result[k] for k in ('sandbox', 'provider_smtp', 'sender_valid', 'credentials_present')):
        result['error'] = 'Configuration checks failed; no network connection attempted.'
        return result
    if not config.smtp_use_tls or config.smtp_port != 587 or config.smtp_host != 'smtp.gmail.com':
        result['error'] = 'Gmail verification requires smtp.gmail.com:587 with STARTTLS.'
        return result
    server = None
    try:
        server = smtplib.SMTP(config.smtp_host, config.smtp_port, timeout=20)
        result['connection'] = 'PASS'
        server.ehlo()
        server.starttls(context=ssl.create_default_context())
        server.ehlo()
        result['tls'] = 'PASS'
        server.login(config.smtp_username, config.smtp_password)
        result['authentication'] = 'PASS'
    except smtplib.SMTPAuthenticationError as exc:
        result['authentication'] = 'FAIL'
        result['smtp_code'] = exc.smtp_code
    except (OSError, smtplib.SMTPException) as exc:
        # Exception text/debug logs can contain provider data: only emit type.
        result['error_type'] = type(exc).__name__
    finally:
        if server:
            try:
                server.quit()
            except (OSError, smtplib.SMTPException):
                server.close()
    return result


if __name__ == '__main__':
    result = check()
    print(json.dumps(result, indent=2))
    sys.exit(0 if result['authentication'] == 'PASS' else 1)
