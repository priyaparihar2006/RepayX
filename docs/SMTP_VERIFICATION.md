# Gmail SMTP verification and proposed single-recipient test

The configured Gmail server accepted the TLS connection and SMTP authentication.
The verification issued EHLO, STARTTLS, AUTH and QUIT only; it did not issue MAIL,
RCPT or DATA. No real email was sent by this verification.

The root `.env` was initially not in sandbox mode. `AUTOMATION_MODE=sandbox` was
restored as requested, without changing SMTP credentials. Local sending processes
were stopped and restarted with an explicit sandbox environment.

| Environment variable | Purpose | Status | Automatically configured? | Manual action required? |
|---|---|---|---|---|
| `EMAIL_PROVIDER` | Select SMTP adapter | CONFIGURED | No; preserved | No |
| `SMTP_HOST` | Gmail SMTP server | CONFIGURED | No; preserved | No |
| `SMTP_PORT` | STARTTLS port 587 | CONFIGURED | No; preserved | No |
| `SMTP_USE_TLS` | Certificate-verified STARTTLS | CONFIGURED | No; preserved | No |
| `SMTP_USERNAME` | Gmail login | CONFIGURED | No; preserved | No |
| `SMTP_PASSWORD` | Gmail SMTP credential | CONFIGURED | No; preserved; value never reported | No; authentication passed |
| `EMAIL_FROM_ADDRESS` | Sender address | CONFIGURED | No; preserved | No; valid format and matches login |
| `EMAIL_FROM_NAME` | Sender display name | CONFIGURED | No; preserved | No |
| `EMAIL_REPLY_TO` | Optional reply destination | OPTIONAL | No | Only if a separate reply address is wanted |
| `AUTOMATION_MODE` | Prevent external sends | CONFIGURED | Yes; restored to sandbox | Do not change for the proposed test |
| `AUTOMATION_API_KEYS` | Dashboard roles/authentication | CONFIGURED | No; existing keys preserved | No; authenticated API check passed |

## Runtime checks

- `backend/run.py` and `backend/worker.py` both call `env_loader.load_environment()`.
- `env_loader` selects the repository root `.env` first. Nonempty shell settings
  take precedence. No conflicting SMTP shell overrides were found during the check.
- API and worker were restarted from the same backend directory and root `.env`;
  both were explicitly pinned to sandbox for this session.
- Authenticated `/api/automation/health` returned `worker_alive=true`,
  `mode=sandbox`, email provider `sandbox`, and no worker error.
- SQLite `PRAGMA quick_check` returned `ok`.
- The configured SMTP adapter passes its configuration readiness check. In
  sandbox the provider registry deliberately chooses `SandboxProvider` instead.
- `.env` is Git-ignored. No credentials were committed or added to documentation.
- Focused validation passed: **18 tests** covering SMTP login without sending,
  customer/amount validation, exact-time email-only sandbox dispatch, and existing
  CSV scheduling behavior. Test configurations used no real SMTP credentials.

SMTP authentication proves login readiness, not inbox delivery. Gmail SMTP
acceptance would be recorded as accepted, not delivered; inbox arrival/spam
placement must be checked by the authorized recipient after a separately approved
send. No delivery-receipt integration for Gmail is implemented.

## Templates and scheduling

`automation/messages.py` builds plain-text and HTML reminders using the database
customer name, outstanding amount, loan ID and due date. Optional payment/support
details come only from configuration. The scheduler stores exact UTC timestamps,
uses the row timezone (default Asia/Kolkata), rejects past exact times, and creates
jobs during CSV import. The worker runs independently of the browser.

Two CSV interfaces exist:

- Automation import: `customer_id`, `customer_name`, `loan_id`, `emi_amount`,
  `due_date`, and at least one contact. `unpaid_amount` is accepted as an alias for
  `emi_amount`. Exact imports also need `reminder_datetime` on every row.
- Legacy WhatsApp import: `customer_id`, `customer_name`, `phone_number` and numeric
  `unpaid_amount`. Missing IDs/amounts and invalid amounts produce row errors.
  Validation now preserves negative signs and rejects malformed/non-finite
  values instead of stripping them into apparently valid positive numbers.

## Prepared live test — NOT SENT

- Recipient: **drdopriya@gmail.com** only. No CC, BCC, customer list or campaign.
- Sender: the configured Gmail account, already verified to match the From address.
- Subject: **RepayX — Authorized SMTP Test**
- Exact plain-text body:

```text
This is a single authorized RepayX SMTP connectivity test.

TEST ONLY: No EMI payment is requested. No customer account or payment status has been changed.

Please confirm whether this message arrived in your inbox or spam folder.

RepayX
```

After explicit approval, use one isolated invocation of the existing SMTP adapter
for this recipient and content. Keep `.env`, the API, and the shared worker in
sandbox. Do not enqueue a live campaign, change payment state, or enable WhatsApp
or SMS. Make one send attempt, record the SMTP outcome, and never automatically
retry a timeout with an ambiguous result.

**Agla step:** Agar recipient aur upar diya message sahi hai, chat mein likhein:
“I approve one test email to drdopriya@gmail.com.” Recipient dena approval nahi
tha; abhi tak email send nahi hui hai.

To repeat authentication-only verification without sending:

```powershell
cd backend
.\.venv\Scripts\python.exe scripts/check_smtp.py
```

Other providers are unnecessary for this email test. Meta WhatsApp Cloud API,
MSG91 and Mailgun credentials were not configured or tested as part of it.
