# EMI Reminder Automation

RepayX schedules and sends EMI reminders on its own. An operator uploads a CSV once. From then on, a background worker sends each reminder at the right time over WhatsApp, SMS, or email, checks the latest payment status first, and records what each provider reported. Nobody has to keep the dashboard open or trigger sends by hand.

## How it fits together

```
 CSV upload ──► API (FastAPI) ──► importer ──► customers / emis ──► scheduler.reconcile ──► reminder_jobs
                   ▲                                                                            │
 dashboard ────────┘                                                                            ▼
                                                           worker.py (separate process, polls every 15 s)
                                                              │ claim due jobs (atomic lease)
                                                              │ re-read EMI, consent, suppressions
                                                              │ contact window / late-job checks
                                                              ▼
                                       message_deliveries (one row per job+channel, unique idempotency key)
                                                              │
                                         Meta WhatsApp · Twilio / MSG91 · SMTP / Mailgun
                                                              │
 provider webhooks ──► /api/webhooks/* (signature-verified) ──┘  delivered / read / failed, replies
```

| Piece | File |
|---|---|
| Configuration (env) | `backend/automation/config.py` |
| Schema and transactions | `backend/automation/db.py` |
| CSV import | `backend/automation/importer.py` |
| Reminder policy (pure) | `backend/automation/policy.py`, `policy_settings.py` |
| Reconcile jobs with policy | `backend/automation/scheduler.py` |
| Execute jobs | `backend/automation/dispatcher.py` |
| Worker process | `backend/worker.py` |
| Provider adapters | `backend/automation/providers/` |
| Replies and follow-ups | `backend/automation/inbound.py`, `intents.py` |
| Webhook verification | `backend/automation/webhooks.py`, `backend/api/routes_webhooks.py` |
| REST API | `backend/api/routes_automation.py` |
| Dashboard | `frontend/src/pages/Automation.tsx` (route `/automation`) |

### Why a database-backed queue (and not Redis/BullMQ/Celery)

The backend is Python with SQLite, and no Redis exists in this deployment. The queue is stored in the same database as the EMIs, so a job and the payment status it depends on are always consistent. Claims are atomic (`BEGIN IMMEDIATE` plus a status check), so two workers can never run the same job. Pending jobs survive restarts because they are just rows.

The trade-off: SQLite supports **one host**. Several worker processes on that host are safe, but workers on different machines are not. To scale out, move to PostgreSQL and replace the claim query with `SELECT … FOR UPDATE SKIP LOCKED`. The rest of the engine does not change.

## Data model

- `customers`: contact details, timezone, language, consent, channel flags, hold flag.
- `emis`: one row per loan installment. The key is `(loan_id, installment_key)`. `installment_key` comes from the `installment_number` column, or is `current` when the CSV has one EMI per loan. The table also records the payment status, its **source** (`csv_import:<id>`, `manual:<user>`, `webhook:payments`), and whether a payment claim is pending.
- `reminder_jobs`: one row per planned reminder. `UNIQUE (emi_id, reminder_key)` prevents duplicates. The key includes the due date (for example `pre_due:1:2026-10-11`), so a changed due date cancels the old reminders and creates new ones.
- `message_deliveries`: one row per job and channel. `UNIQUE (job_id, channel)` and a fixed idempotency key mean a channel is never sent twice for the same reminder. Status is one of `queued → sending → accepted → delivered → read`, or `failed`, `retry_scheduled`, `skipped`, or `unknown`.
- `communications`: the unified conversation log (outbound reminders, replies, auto-replies).
- `followup_tasks`, `payment_commitments`, `payment_events`, `suppressions`, `audit_log`, `imports`, `import_issues`, `worker_heartbeats`, `webhook_events` (replay protection).

## CSV format

### Exact date and time (recommended)

Import through **Automation → Import CSV → Customers and EMIs**. The import itself
creates persistent jobs; no Schedule or Send action is needed afterwards. The
standalone worker must already be running as a service (see Running locally).
Closing the browser or restarting the worker does not remove pending jobs.

```csv
customer_id,customer_name,phone_number,email,loan_id,emi_amount,due_date,reminder_datetime,channel_strategy,payment_status,timezone
SAMPLE-1,Sample Customer,,sample@example.invalid,SAMPLE-LOAN-1,8500,2026-10-13,2026-10-13 16:00:37,all,pending,Asia/Kolkata
```

Use future dates when trying this example. The dashboard's **Download sample CSV**
generates a sample for tomorrow at 16:00 IST; adjust it to the configured contact
days/hours. The example address is fictional; use sandbox mode.

- Required existing identifiers are `customer_id`, `customer_name`, `loan_id`,
  `emi_amount`, `due_date`, and at least one of `phone_number` or `email`.
- For exact scheduling, include `reminder_datetime` and supply it on every row.
  Only `YYYY-MM-DD HH:MM:SS` is accepted, including seconds and a 24-hour clock.
  Exact imports also require an ISO `YYYY-MM-DD` due date; ambiguous slash dates
  are rejected. Do not combine this column with `reminder_date`/`reminder_time`.
- Times use the row's IANA `timezone`, or `APP_TIMEZONE` (default `Asia/Kolkata`).
  For example, `2026-10-12 16:00:00` in IST is `2026-10-12T10:30:00Z`.
  The database stores UTC and the reminders dashboard displays IST with seconds.
  Ambiguous or nonexistent DST wall-clock times are rejected.
- Blank, invalid, past, present, or out-of-contact-window exact times produce
  row-level errors. Other valid rows still import. Re-uploading a future reminder
  is idempotent; re-uploading after its time rejects the now-past row without
  deleting or resending its existing job.
- Optional `channel_strategy`: `all` attempts every eligible configured channel;
  `fallback` uses the policy's channel order, stopping after acceptance or an
  ambiguous timeout. Blank uses the policy at scheduling/reconciliation time.
  Explicit per-row strategy survives later global policy changes. Channel flags,
  opt-outs, consent, payment checks and live test-recipient restrictions still apply.
- Exact timestamps are not shifted during import or policy reconciliation. If
  contact policy changes later, the worker can defer execution and records why.
  Payment, hold, pause and lateness rules remain authoritative.
- The worker polls every `SCHEDULER_POLL_SECONDS` (default 15). It claims at or
  after the timestamp, never before; normal latency is up to a poll interval plus
  queue/provider processing time. This is not a hard real-time delivery guarantee.

Files without a `reminder_datetime` column keep the legacy policy/date/time
behavior documented below. Omitting the column intentionally selects that mode;
a blank value in an exact-mode file never silently falls back to policy.

### Status and migration

Schema version 2 is applied automatically and transactionally on API/worker
startup. It adds `emis.reminder_datetime_utc`, `emis.channel_strategy`, and
`reminder_jobs.channel_strategy`; existing tables and records are retained.

The API preserves queue `status` and adds `display_status`: scheduled, processing,
sent, delivered, failed, unknown or simulated, plus existing retry/partial/skip
states. Sandbox deliveries retain the existing internal `accepted` state with
`provider=sandbox`, are displayed as **Simulated**, and never become delivered.
The dashboard counts simulated separately from provider acceptance and refreshes
reminder lists/details from the API every five seconds. Provider acceptance is
not proof of delivery.

### Repeatable real-worker verification

From `backend`:

```powershell
.\.venv\Scripts\python.exe scripts/verify_exact_worker.py --output ../docs/exact-worker-evidence.json
.\.venv\Scripts\python.exe -m pytest -q
```

The first command takes about 150 seconds. It creates a disposable database,
imports a future CSV reminder twice, starts the actual `worker.py`, verifies an
initial heartbeat and pending state, stops/restarts the worker before the due
time, and verifies three sandbox outcomes at/after that time. No API or browser
is started, no live provider is selected, and only fictional contacts are used.
It writes scheduled/execution timestamps, attempts, restart count and final
simulated status to the evidence JSON. The permissive test contact window affects
only that disposable database.

Two import types:

**`emi_reminders`** (customers and EMIs). Required columns: `customer_id`, `customer_name`, `loan_id`, `emi_amount`, `due_date`, plus at least one of `phone_number` or `email`. Optional columns: `email`, `installment_number`, `amount_paid`, `payment_status`, `days_past_due`, `reminder_date`, `reminder_time`, `timezone`, `whatsapp_enabled`, `sms_enabled`, `email_enabled`, `preferred_language`, `consent_status`.

**`payment_updates`** (payment reconciliation for existing EMIs). Required columns: `loan_id`, `payment_status`. Optional columns: `installment_number`, `amount_paid`, `due_date` (must match the EMI on record), `payment_reference`.

The importer recognises common column names automatically (`mobile`, `loan_no`, `dpd`, `scheduled_message_time`, and so on). Anything else can be mapped in the dashboard, or by passing a `mapping` JSON field to the API. A sample file is in [`docs/samples/emi_reminders_sample.csv`](samples/emi_reminders_sample.csv).

Accepted values:

| Field | Accepted |
|---|---|
| dates | `2026-10-11`, `11-10-2026` / `11/10/2026` (day first, unless `CSV_DATE_ORDER=MDY`), `11 Oct 2026` |
| times | `16:00`, `4:00 PM`, `4 PM` |
| amounts | `8500`, `8,500.00`, `₹8,500`, `Rs. 8500` |
| phone | E.164, or 10-digit Indian mobile (prefixed with +91) |
| payment_status | pending/unpaid/due, overdue/late, partially_paid/partial, paid/settled/closed, cancelled, waived |
| consent_status | granted/yes/opted_in, revoked/no/opted_out, blank = unknown |
| channel flags | yes/no, true/false, 1/0 (blank = enabled) |

Rules:

- Invalid rows are rejected with a row number, field, and reason. Valid rows in the same file are still imported, and the whole import runs in one transaction.
- Duplicate EMIs in one file are rejected. Re-uploading the same data changes nothing (the rows are reported as `unchanged`) and creates no new jobs.
- A CSV cannot overwrite a `paid`, `waived`, or `cancelled` status that was set manually or by a payment webhook. The row gets a warning instead.
- Uploading never sends anything. Reminders already in the past at import time are not created; the summary reports how many were skipped.

## Reminder policy

When a row has `reminder_date`, that date and time (or the default time) is the reminder. Otherwise the policy applies. All of the following can be changed from the Policy tab (admin) or `PATCH /api/automation/settings`:

| Setting | Default |
|---|---|
| default reminder time | `DEFAULT_REMINDER_TIME` (10:00), in the customer's timezone. A missing time is never assumed to be 4 PM. |
| pre-due reminders | 1 day before |
| due-date reminder | on |
| overdue reminders | +3 and +7 days, then every 7 days, at most 4 |
| contact window | 09:00–19:00 local, every day. Reminders outside it move to the next window start, with a note. |
| late-job limit | 120 minutes. After downtime, a job that is later than this is marked `missed`, not sent late. |
| channel strategy | `fallback`: WhatsApp, then SMS, then email, stopping at the first accepted channel. `all` must be chosen explicitly and sends on every eligible channel. |
| consent | `revoked` always blocks. `unknown` is allowed unless "require explicit consent" is on. |
| payment claims | When a customer says they paid, reminders pause until someone verifies or rejects the claim. |

Changing settings reschedules pending policy reminders. Reminders that an operator rescheduled by hand keep their time.

## What happens when a job runs

1. **Claim.** The job is leased to the worker for `SCHEDULER_LEASE_SECONDS`.
2. **Late check.** If the job is later than the limit, it is marked `missed`.
3. **Relevance check.** A pre-due reminder after the due date, or a due-date reminder after that day, is `skipped`.
4. **Fresh EMI read.** If the EMI is paid, cancelled, waived, or has nothing outstanding, the job is `cancelled`. A customer on hold also cancels it. A pending payment claim marks it `skipped`.
5. **Contact window.** If the time is outside the window, the job goes back to `pending` at the next window start.
6. **Per-channel eligibility.** For each channel the worker checks the global switch, the customer's flag, that a contact exists, consent, the suppression list, that the provider is configured, and the test-recipient allowlist. Skipped channels are recorded with a reason.
7. **Send.** The delivery is committed as `sending` before the provider call. The provider's answer then becomes one of:
   - `accepted`, with the provider message id
   - `retry_scheduled` for transient errors, using exponential backoff (`RETRY_BASE_SECONDS × 2^n`, capped at `RETRY_MAX_SECONDS`, up to `RETRY_MAX_ATTEMPTS`)
   - `failed` for permanent errors
   - `unknown` for timeouts, where the provider may have received the message
8. **Finish.** The job ends as `completed`, `partially_completed`, `retry`, `failed`, or `dead_letter` (retries exhausted).

Duplicate protection: a delivery that is `accepted`, `delivered`, `read`, `sending`, or `unknown` is never sent again automatically. If the worker crashes mid-send, the next worker marks that delivery `unknown` when it recovers the expired lease, and does not resend it. A manual retry from the dashboard re-sends only channels that are `failed`.

Delivery status only moves forward (a late `sent` webhook never downgrades `read`). If the only accepted channel later fails, for example because WhatsApp reports the number undeliverable, a `fallback` job reopens so the next channel can be tried.

## Customer replies

Inbound WhatsApp, SMS, and email arrive on the signed webhooks. Each reply is matched to a customer by phone or email and logged in `communications`, then classified with deterministic rules (English and common Hinglish):

| Intent | Action | Reply |
|---|---|---|
| `OPT_OUT` (STOP, "don't message") | adds that channel to the suppression list | confirmation |
| `DISPUTE` (fraud, not my loan) | puts the customer on hold, cancels reminders, creates a high-priority follow-up | acknowledgement |
| `PAID_CLAIM` ("I have paid", "kar diya") | flags the EMI as a pending claim, pauses reminders, creates a verify-payment task | "we will verify" |
| `PROMISE_TO_PAY` ("pay tomorrow", "on 15th") | records a commitment with the parsed date and a check-commitment task | confirms the amount from the database |
| `HARDSHIP` / `MORE_TIME` | creates a high-priority follow-up | "a representative will contact you" |
| `PAYMENT_DETAILS` / `BALANCE` | none | outstanding amount and due date from the database, plus the configured payment link and instructions |
| other or unmatched | creates a review task | acknowledgement |

The automation **never** marks anything paid, changes amounts or dates, or offers waivers or extensions. Those decisions go to people through follow-up tasks.

The existing TF-IDF "RAG" index (`backend/rag`) covers the Home Credit customer analytics dataset. It contains no payment policy or EMI ledger, so it is deliberately not used for reply content. Amounts and dates always come from the database. The existing omnichannel AI replies offer late-fee concessions, which conflicts with the "no unapproved concessions" rule, so they are not used here either.

Auto-replies are sent on WhatsApp (inside the 24-hour session that the customer's message opens) and email. SMS auto-replies are off by default, because Indian DLT rules require registered templates even for replies.

## Running locally

```bash
# 1. configure
cp .env.example .env
#    set AUTOMATION_API_KEYS, e.g. AUTOMATION_API_KEYS=me:admin:<32+ random chars>
#    leave AUTOMATION_MODE=sandbox until providers are configured

# 2. API
cd backend
python run.py                      # http://127.0.0.1:8000

# 3. worker (second terminal) — this is what actually sends reminders
cd backend
python worker.py

# 4. dashboard
cd frontend
npm run dev                        # http://localhost:3000/automation, sign in with your key
```

For a single-process demo, set `SCHEDULER_EMBEDDED=true` to run the worker inside the API. Don't do this in production: the worker then stops whenever the API is redeployed or scaled to zero.

Tests: `cd backend && python -m pytest tests/test_automation_*.py` (sandboxed: providers are mocked and nothing is sent).

## Deployment

The API and the worker are **two long-running processes** on the same host, sharing the database file. Serverless functions and static frontend hosts cannot run the worker, because nothing keeps them alive between requests.

`Procfile` (Render, Railway, Heroku-style platforms; attach a persistent disk for the database):

```
web: cd backend && uvicorn api.main:app --host 0.0.0.0 --port $PORT
worker: cd backend && python worker.py
```

systemd (Linux VM):

```ini
# /etc/systemd/system/repayx-worker.service
[Unit]
Description=RepayX reminder worker
After=network-online.target

[Service]
WorkingDirectory=/opt/repayx/backend
EnvironmentFile=/opt/repayx/.env
ExecStart=/opt/repayx/backend/.venv/bin/python worker.py
Restart=always
RestartSec=5
User=repayx

[Install]
WantedBy=multi-user.target
```

Create a matching `repayx-api.service` with `ExecStart=… uvicorn api.main:app --host 127.0.0.1 --port 8000` behind nginx or Caddy for TLS. On Windows, run both with NSSM (`nssm install RepayXWorker C:\…\python.exe worker.py`).

Checklist:

- **Database.** Put `AUTOMATION_DB_PATH` on persistent storage and back it up (for example `sqlite3 automation.sqlite3 ".backup backup.db"` on a schedule). Tables are created on first start, and `schema_migrations` records the version.
- **Health.** Point a monitor at `GET /api/automation/health/live` (no auth, no data). It returns `worker_alive: false` if no heartbeat arrives within `max(60 s, 4 × poll)`. `GET /api/automation/health` (authenticated) adds queue backlog, dead letters, unknown deliveries, and provider readiness.
- **Logs.** Both processes log to stdout. Contact details are masked in logs and the audit trail.
- **Restarts.** It is safe to restart at any time. Jobs that were mid-flight are recovered once their lease expires, and nothing is resent.
- **Public HTTPS URL** for webhooks, for example `https://api.example.com`.

| Provider | Webhook URL | Verification |
|---|---|---|
| Meta WhatsApp | `GET/POST /api/webhooks/whatsapp` | verify token handshake + `X-Hub-Signature-256` (App Secret) |
| Twilio SMS (status + inbound) | `POST /api/webhooks/sms` | `X-Twilio-Signature`; set `TWILIO_WEBHOOK_URL` to the exact public URL |
| Other SMS gateways | `POST /api/webhooks/sms` | `X-RepayX-Signature: t=<unix>,v1=<hex HMAC-SHA256(SMS_WEBHOOK_SECRET, "t." + body)>` JSON `{type: status/inbound, …}` |
| Mailgun (events + inbound route) | `POST /api/webhooks/email` | Mailgun HMAC signature (`MAILGUN_WEBHOOK_SIGNING_KEY`) |
| Payment system | `POST /api/webhooks/payments` | `X-RepayX-Signature` with `PAYMENT_WEBHOOK_SECRET` |

Every webhook event id is stored, so replays are ignored. Signatures older than `WEBHOOK_MAX_AGE_SECONDS` are rejected where the provider sends a timestamp.

## Provider prerequisites (needed before live sending)

Nothing here can be completed in code; each needs an account owner.

**WhatsApp (Meta WhatsApp Business Platform)**
- A Meta Business account (business verification is needed for higher messaging limits), a WhatsApp Business Account, and a phone number registered on the Cloud API.
- A permanent System User access token with `whatsapp_business_messaging`.
- An **approved Utility template** for reminders, with body variables `{{1}}` name, `{{2}}` amount, `{{3}}` due date, and `{{4}}` loan id. Set `WHATSAPP_TEMPLATE_REMINDER` and `WHATSAPP_TEMPLATE_LANGUAGE`. Business-initiated messages outside a customer's 24-hour window must use a template.
- Subscribe the app's webhook to the `messages` field, using `WHATSAPP_VERIFY_TOKEN` and `WHATSAPP_APP_SECRET`.
- The Baileys bridge in `backend/whatsapp-bridge` is WhatsApp Web automation. It is not an official integration, can get the number banned, and should not be used for customer reminders.

**SMS in India**
- DLT registration (principal entity), an approved **header (sender ID)**, and approved **content templates** whose variables match the reminder. Scrubbing against the customer's preferences is done by the operator's DLT platform.
- With MSG91, create a Flow whose template is DLT-approved and set `MSG91_FLOW_ID` and `MSG91_TEMPLATE_VARS`. With Twilio for India, register the DLT entity, header, and templates in Twilio, and keep the message body exactly as registered.
- Delivery reports: Twilio is supported natively. For MSG91, either relay its DLR callbacks into the signed generic format or extend `routes_webhooks.py`. MSG91 DLR payloads are not signed, so verify them against your dashboard settings before relying on them.

**Email**
- A verified sending domain with SPF, DKIM, and DMARC records published.
- SMTP credentials (SES, SendGrid, Postmark, Mailgun SMTP) or a Mailgun API key. Bounce and delivery tracking is implemented for Mailgun webhooks. Other providers' webhooks need a small adapter in `routes_webhooks.py`; SendGrid's signed event webhook uses ECDSA and would need the `cryptography` package.

**Testing real providers safely:** set `AUTOMATION_MODE=live` and `AUTOMATION_TEST_RECIPIENTS=+91XXXXXXXXXX,you@example.com`. Every other recipient is skipped with the reason `test_mode_recipient_not_allowlisted`. Use separate `.env` files for staging and production.

## Compliance notes

The defaults are conservative, but the lender's compliance team must confirm them:

- RBI's Fair Practices Code and recovery guidance restrict contact hours. The default window is 09:00–19:00 in the customer's timezone, and an administrator can only change it from the Policy tab.
- Opt-outs (STOP replies, provider unsubscribe errors, email hard bounces) are added to the suppression list automatically. Removing an entry needs an admin and a note recording renewed consent.
- Reminder text states facts (amount, due date, loan) and how to pay or get help. It contains no threats or penalties.

## Operating it day to day

- **Dead letters.** Retries ran out, usually because a provider was down for a long time. Check the error on the reminder, fix the cause, then press "Retry failed channels".
- **Unknown deliveries.** A timeout or crash mid-send. Check the provider console for the message. If it was not sent, cancel the reminder and reschedule it, or send manually.
- **`provider_not_configured` skips.** Fill in the credentials. The health panel shows what is missing, without revealing secret values.
- **Payment claims.** On the Payments tab, filter "Payment claims to verify". Record the verified payment with a reference, or press "Not verified" to resume reminders.

## Security

- All automation endpoints need `Authorization: Bearer <key>` from `AUTOMATION_API_KEYS`. Roles:
  - `viewer` can read.
  - `operator` can import, cancel, reschedule, retry, update payments, and resolve follow-ups.
  - `admin` can change settings, pause or resume, remove suppressions, and read the audit log.
- With no keys configured, every request is refused.
- Phones and emails are masked in API responses, logs, and the audit trail.
- Exported CSVs neutralise formula injection.
- Uploads are size-limited, read in memory, and the temporary file is removed.
- Provider secrets are read from the environment only and never returned by the API.

## Known limitations

- The single-host SQLite queue described above.
- No real-time payment integration exists yet. Payment status comes from CSV `payment_updates` imports, the dashboard, or the signed `/api/webhooks/payments` endpoint, which is ready for a gateway to call.
- API keys are static. If RepayX adds user login (SSO/OAuth), swap `automation/auth.py` for it.
- The older pages (WhatsApp Web bridge, omnichannel demo) are unchanged and run separately from this engine.
