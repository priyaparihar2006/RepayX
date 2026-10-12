# Exact CSV reminder implementation — 2026-10-12

Implemented in the existing SQLite queue, importer, dispatcher and automation UI.
No second scheduler or duplicate tables were introduced. Sandbox remains the
default; no live provider test messages were sent.

## Files changed

| Files | Change |
|---|---|
| `backend/automation/importer.py` | Strict exact datetime validation, per-row strategy, persistence, partial import errors |
| `backend/automation/db.py` | Automatic transactional schema version 2 migration |
| `backend/automation/policy.py`, `scheduler.py` | Exact UTC plans, idempotent reconciliation, saved channel strategy |
| `backend/automation/dispatcher.py`, `service.py` | Saved strategy dispatch, ownership guards, refreshed real clock for each job, execution timing |
| `backend/automation/webhooks.py` | Asynchronous failure respects the job's strategy |
| `backend/automation/providers/__init__.py` | Only explicit live mode selects external providers |
| `backend/api/routes_automation.py` | Derived scheduled/sent/delivered/unknown/simulated display status, separate simulated counts |
| `frontend/src/pages/Automation.tsx`, `frontend/src/services/automation.ts` | CSV instructions/download, IST seconds, backend status display and polling |
| `backend/tests/test_automation_exact.py`, `frontend/src/pages/Automation.test.tsx` | New exact-import, API, strategy, migration and UI regressions |
| `backend/scripts/verify_exact_worker.py` | Real-clock standalone worker acceptance test with restart |
| `docs/AUTOMATION.md`, `docs/samples/exact_reminders_sample.csv` | CSV contract, migration, operating instructions |
| `docs/exact-worker-evidence.json`, this report | Verification evidence and results |

## Migration

Schema version 2 adds nullable text columns:

- `emis.reminder_datetime_utc`
- `emis.channel_strategy`
- `reminder_jobs.channel_strategy`

API/worker startup applies this automatically. Existing rows and queue statuses
remain compatible. Existing date/time and policy imports still work.

## CSV

```csv
customer_id,customer_name,phone_number,email,loan_id,emi_amount,due_date,reminder_datetime,channel_strategy,payment_status,timezone
SAMPLE-1,Sample Customer,,sample@example.invalid,SAMPLE-LOAN-1,8500,2026-10-13,2026-10-13 16:00:37,all,pending,Asia/Kolkata
```

The example is valid for an import before its scheduled time, subject to configured
contact days/hours. It uses a fictional email. The UI generates tomorrow's sample.
Customer ID is required by the existing schema. At least one contact is required.
Use `YYYY-MM-DD HH:MM:SS`; every row needs a value if that column is present.
The default timezone is Asia/Kolkata unless APP_TIMEZONE or the row overrides it.
`2026-10-13 16:00:37` IST is stored as `2026-10-13T10:30:37Z`.
Past, missing, invalid, ambiguous or out-of-window exact times are rejected with
row errors. All valid rows still persist. Import is the scheduling trigger.

`all` attempts every eligible channel; `fallback` uses the policy's order and
stops after acceptance or an ambiguous outcome. No automatic retry occurs after
an ambiguous send. Consent, suppression and current payment checks remain active.

## Start commands (PowerShell)

Run each process in its own terminal from the repository root:

```powershell
# API
Set-Location backend
.\.venv\Scripts\python.exe run.py
```

```powershell
# Persistent worker; keep sandbox until live sending is explicitly configured
Set-Location backend
$env:AUTOMATION_MODE = 'sandbox'
.\.venv\Scripts\python.exe worker.py
```

```powershell
# Frontend
Set-Location frontend
npm run dev
```

Local API and sandbox worker were launched after implementation. Health returned
`{"success":true,"status":"ok","worker_alive":true}`. The dashboard is at
http://localhost:3000/automation. Local `AUTOMATION_API_KEYS` is currently empty;
configure `name:operator:<random-key-at-least-24-characters>` in `.env`, restart
the API, then use that key to sign in. No authentication bypass was added.
For persistence across machine restarts, install the worker as a service using
the existing deployment instructions in AUTOMATION.md.

## Tests actually run

| Check | Result |
|---|---|
| Full backend suite | 357 passed, 10 failed, 16 setup errors |
| Final focused reminder suite (engine, exact, API, providers) | 120 passed |
| Worker tests in the final full backend run | Both passed |
| Existing full frontend suite | 56 passed |
| Updated automation UI suite, including 2 new tests | 6 passed |
| Frontend production build | Passed |
| TypeScript check (`npm run lint`) | Passed |
| Actual standalone 150-second worker check | Passed, exit code 0 |

The complete backend suite is **not green**. All 26 remaining failures/errors
were reproduced in an isolated archive of unchanged HEAD before these edits:
`tests/test_whatsapp.py` has 16 setup errors because its fixtures pass a `token`
argument that the current `WhatsAppSettings` no longer accepts;
`tests/test_whatsapp_live.py` has 10 failures involving the older bridge API,
expected contact data, and loan-history fields. Those unrelated implementations
and tests were left intact. The full run's detailed output is in the local,
git-ignored `docs/backend-test-results.log`.

An initial local-date formatting regression introduced during this task was
fixed and its existing API test now passes. Early test harness problems
(Windows temporary-directory permissions, an absent fictional phone in the
all-channel fixture, Windows child-process cleanup, and a 200-versus-201 test
expectation) were corrected before the successful final runs above.

## Real-clock evidence

See [exact-worker-evidence.json](exact-worker-evidence.json).

| Evidence | Value |
|---|---|
| Scheduled UTC | 2026-10-12T05:18:51Z |
| Scheduled IST | 2026-10-12 10:48:51 +05:30 |
| Actual completion UTC | 2026-10-12T05:18:51Z |
| Final display status | Simulated |
| Internal queue status | completed |
| Worker instances | 2 (stopped/restarted before due time) |
| Attempts | 1 job; 1 per WhatsApp/SMS/email channel |
| Duplicate jobs | 0 |
| Delivered timestamps | All null |
| Browser/API needed by test | Neither |

The test used an isolated temporary database and sandbox adapters, verified no
early sends, imported the same CSV twice, and shut down its worker process tree.
The real worker polls rather than guaranteeing zero latency: default poll is
15 seconds plus queue/provider processing. Later contact-policy changes or
payment/hold/pause checks may defer or cancel an otherwise scheduled job.

## Live configuration still required

No live delivery was enabled or claimed verified. Before authorized live use:

- Configure automation API keys and a continuously running worker on the same
  host/persistent database as the API.
- Set `AUTOMATION_MODE=live` explicitly and restrict `AUTOMATION_TEST_RECIPIENTS`
  to authorized test contacts during provider verification.
- WhatsApp Cloud API: registered phone ID, access token, approved utility
  reminder template/language and matching parameters, app secret, verify token,
  public HTTPS subscribed webhook.
- SMS: configured Twilio or MSG91 credentials, sender/service or flow, required
  approved templates and callback/signature settings.
- Email: SMTP credentials or Mailgun credentials/domain, verified sender/domain,
  and signed provider callbacks where delivery tracking is supported.

Existing provider authentication, signature validation, allowlists, template
rules and retries were preserved. Pri and Siddharth were not test recipients.
