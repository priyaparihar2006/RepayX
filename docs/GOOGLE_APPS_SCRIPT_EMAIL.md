# Google Apps Script email reminders

RepayX now supports `EMAIL_PROVIDER=google_apps_script`, using the free Google-account MailApp service. Existing SMTP, WhatsApp and SMS adapters remain supported. The installed provider is not changed automatically. No email is sent by setup, tests, deployment or file selection.

## Architecture and existing behavior

CSV preview/import stays at authenticated `POST /api/imports/preview` and `POST /api/imports/csv`. The importer uses the designated `email`, `customer_id`, loan/EMI data, `reminder_datetime`, `timezone`, `email_enabled` and `consent_status`. Its schema and validation are unchanged. Missing email can leave WhatsApp eligible; an invalid supplied email is a row validation error.

`customers` and `emis` feed existing `reminder_jobs`. `backend/worker.py` claims due jobs independently of React. Each `(job, channel)` has its own `message_deliveries` row; attempts and errors are audited, accepted content is recorded in `communications`. Reminder details show per-channel status, provider, count and last attempt. Customer ID filtering provides individual reminder history. Dashboard counts distinguish simulated, accepted, failed and confirmed delivered.

Use CSV `channel_strategy=all` to attempt both eligible channels. `fallback` stops after one accepts, so it does not meet a both-channel requirement. In Settings, enable WhatsApp and email, disable SMS if unnecessary. Existing jobs can have stored strategy overrides: changing the policy alone does not override explicit CSV strategy. Do not change or re-import existing customer schedules casually.

The dispatcher rechecks payment status, amount owed, customer hold, consent, suppressions, channel switches and contact window when sending. Apps Script additionally requires `consent_status=granted`, including sandbox simulation. Paid EMIs do not send. Other providers retain their existing consent policy. Jobs remain subject to the contact window and missed-job policy. Default polling is 15 seconds: dispatch normally happens on the next poll, plus backlog/network latency; exact inbox arrival cannot be promised.

## Security protocol

Only the backend calls the bridge. Its POST body contains a payload string, timestamp, random nonce and HMAC-SHA256 over `timestamp + newline + nonce + newline + payload`. The shared secret itself is never transmitted. `doPost` reads `e.postData.contents`, not an assumed custom Authorization header. Requests older/newer than five minutes fail. Keep the server clock synchronized.

Both sides deny recipients absent from their allowlist. There is no wildcard/bulk enable switch. Each request has a stable SHA-256 idempotency ID. ScriptLock serializes sends; Script Properties store permanent receipt fingerprints. A receipt is reserved before calling MailApp. Replays return the prior accepted result, while changed payloads with the same ID are rejected. A crash or send exception leaves an unknown result and must be reviewed, not resent automatically. Exactly-once inbox delivery is not promised.

The bridge accepts structured reminder fields, not arbitrary subjects, HTML, links, attachments, cc/bcc or replies. HTML is escaped. Script Properties contain receipt hashes/statuses, not email content or full addresses except the explicit allowlist itself. Never add request-body, environment, exception-body or signature logging. Keep script editor access restricted to trusted administrators.

Quota checks occur under the lock before sending. `MailApp.getRemainingDailyQuota()` and an application daily cap (default 5 recipients/day UTC) are both enforced. The app reserves budget before attempting a send. A quota or lock-busy response is safe for the existing bounded backoff retries; other uncertain network/HTTP outcomes become unknown. The existing default retry budget is configured by the reminder engine, not overridden here. Admin tests are limited to one real attempt per minute across administrators and never auto-retry.

The receipt store stops at 1,000 unique requests rather than deleting deduplication records. This is intentionally a small-volume integration, not a bulk mail service. At capacity, pause and design durable receipt storage before further use. Do not clear receipt properties, rotate deployments to bypass quota, replay old jobs, or retry unknown outcomes blindly. Local receipt IDs (`gas:...`) are bridge receipts, not Gmail message IDs. MailApp acceptance does not prove inbox delivery and this bridge does not provide delivery webhooks.

## Deployment (manual Google account actions)

1. **Google account mein Apps Script project banayein.** Open [Apps Script](https://script.google.com/), create a standalone project named RepayX Email Bridge. Copy `integrations/google-apps-script/Code.gs` into its editor. Enable manifest visibility in Project Settings and copy `appsscript.json`. No time-based triggers are needed.
2. **Secret privately copy karein.** A cryptographically random `APPS_SCRIPT_SHARED_SECRET` was generated locally if absent, in the Git-ignored root `.env`. Copy its value directly from the editor to Project Settings → Script Properties → `REPAYX_SHARED_SECRET`. Do not paste it in chat, source code or a screenshot. Backend and Script Property must match exactly. Existing credentials were preserved.
3. **Sending abhi disabled rakhein.** Add Script Properties:

   | Property | Initial value |
   |---|---|
   | `REPAYX_SHARED_SECRET` | Private value from local backend environment |
   | `REPAYX_SEND_ENABLED` | `false` |
   | `REPAYX_ALLOWED_RECIPIENTS` | Comma-separated explicitly authorized test emails only |
   | `REPAYX_DAILY_LIMIT` | `5` (integer 1–100; Google quota may be lower) |

4. **Permissions authorize karein, email nahi bhejna.** Select and run `authorizeRepayX` in the Apps Script editor. It only checks remaining quota. Authorize the requested send-mail scope for your own script. The sender is the deploying Google account; `EMAIL_FROM_ADDRESS` is not used to impersonate another account by MailApp.
5. **Signed web app deploy karein.** Deploy → New deployment → Web app, execute as **Me**, access **Anyone** only if your account/domain permits this and you accept a publicly reachable, application-authenticated endpoint. The HMAC and allowlist checks must remain intact; knowing the URL alone cannot authorize a send. Copy the `/exec` deployment URL into `APPS_SCRIPT_URL` in root `.env`. Do not use the editor or `/dev` URL. Updates require a new version of the existing deployment.
6. **Backend allowlist match karein.** Set `APPS_SCRIPT_ALLOWED_RECIPIENTS` to the same authorized addresses. Keep `APPS_SCRIPT_TEST_SEND_ENABLED=false`, `AUTOMATION_MODE=sandbox`, current provider and scheduler state unchanged. Restart backend/worker at an agreed safe time to load new environment values; existing processes do not reload credentials dynamically.

Important deployment boundary: “Anyone” makes the URL publicly invocable; HMAC restricts who can send, but does not prevent strangers consuming Apps Script invocation quota. Google-login-restricted web apps will return a login redirect to this backend; the adapter rejects that redirect. Never disable authentication, scrape login cookies or expose an unauthenticated send function to work around this. If your domain disallows public web apps or you require Google identity at ingress, use a separate Google-authenticated Apps Script API executable with user OAuth and `scripts.run` (same standard Cloud project), or an authenticated gateway. That OAuth transport is not implemented here; keep this bridge disabled until the deployment fits your security requirements.

## One controlled website test (later, with explicit approval)

1. Pehle recipient ki explicit permission aur dono allowlists verify karein. In Automation → Settings, sign in as an **admin** and open **Google Apps Script email test**. Enter one authorized email, acknowledge consent and choose **Simulate email test**. This only writes a test audit row; it does not call Google.
2. Real test ke liye separate approval ke baad `REPAYX_SEND_ENABLED=true` in Script Properties and `APPS_SCRIPT_TEST_SEND_ENABLED=true` in backend environment, then restart only the API safely. Keep `AUTOMATION_MODE=sandbox` and scheduler paused. The narrow admin test endpoint is a deliberate one-message exception, not a mode switch or queue resume.
3. Enable the real-email checkbox and confirm the one-recipient browser dialog. A fixed dummy `₹1.00` EMI test with a clearly fictional loan ID is used. `POST /api/automation/email-test` requires an admin key, explicit authorization, matching allowlist and an idempotency UUID. It neither imports data nor creates/executes reminders.
4. Review test history. Accepted means MailApp returned successfully, not delivered. Check the recipient inbox/spam separately. For unknown, inspect the Apps Script receipt (key is the hash of `admin-test:<UUID>`) and mailbox before deciding anything. Repeating the same request reads its stored result and does not resend.
5. Disable the backend test gate after testing. Do not remove allowlists. No real test was performed during implementation.

## Multi-recipient scheduled CSV testing

Use two or three **explicitly authorized** addresses. No additional real contacts were assumed or substituted. The existing three-customer SMS test CSV is unchanged.

1. Sandbox mein `EMAIL_PROVIDER=google_apps_script` select karein only when ready to validate the new path. Preserve `AUTOMATION_MODE=sandbox`. Restart API/worker safely. Use an isolated test database for scheduled testing so existing customers and queued jobs cannot be affected.
2. Prepare CSV columns:

   ```csv
   customer_id,customer_name,phone_number,email,loan_id,emi_amount,due_date,payment_status,reminder_datetime,channel_strategy,timezone,email_enabled,whatsapp_enabled,sms_enabled,consent_status
   ```

   Use unique test IDs/loans and dummy amounts. Put each actual authorized email in `email`, and only an authorized phone number in `phone_number` if testing WhatsApp too. Email-only tests may leave phone blank. Set `all`, `Asia/Kolkata`, `email_enabled=yes`, `sms_enabled=no`, and `consent_status=granted` only with actual permission. Choose WhatsApp yes/no intentionally.
3. Use today's real future local times **1, 2 and 3 minutes after import**, in `YYYY-MM-DD HH:MM:SS` format, with a future ISO due date. Respect the active contact window; if outside it, plan the test within the next allowed window. Do not reuse stale example dates. Leave enough time to upload—regenerate times if they expire.
4. Preview and **Validate only** first. Confirm row issues and proposed reminders. Then, only in the isolated sandbox test environment, import and explicitly run the worker/unpause for the test. Browser can close. Dashboard should show three independently scheduled jobs and simulated channel outcomes, with no external calls.
5. For a later approved live scheduling test, use a **dedicated isolated test database** with only these authorized jobs, both backend and Script allowlists, and `AUTOMATION_TEST_RECIPIENTS` covering every permitted email/phone. Review payment, consent, channel switches and all queued jobs before explicitly enabling live mode in that isolated environment. Keep the current production/local customer database paused and untouched. Never bulk-enable live mode just to test this feature.
6. Confirm email and WhatsApp separately in Reminders → detail and filter by customer ID. A failing email must leave successful WhatsApp accepted, and vice versa. Repeated worker ticks should not resend accepted channels. Restore disabled test gates when finished.

## Local verification

All automated tests use temporary SQLite databases, mocked transports and/or stubbed MailApp; they do not send emails. Three exact jobs 1–3 minutes after import are exercised with a controlled clock, including independent email/WhatsApp failures and duplicate prevention. This is not a real Google deployment or inbox-delivery test.

```powershell
# Repository root
node --test integrations/google-apps-script/Code.test.cjs
# backend/
.\.venv\Scripts\python.exe -m pytest tests/test_apps_script.py tests/test_automation_exact.py tests/test_automation_providers.py tests/test_automation_api.py -q
# frontend/
npm run lint
npm test -- --maxWorkers=1
npm run build
```

References: [Google web app execution and POST events](https://developers.google.com/apps-script/guides/web), [ContentService redirects](https://developers.google.com/apps-script/guides/content), [MailApp and remaining quota](https://developers.google.com/apps-script/reference/mail/mail-app), [current Google quotas](https://developers.google.com/apps-script/guides/services/quotas), [ScriptLock](https://developers.google.com/apps-script/reference/lock), [Google-authenticated API executables](https://developers.google.com/apps-script/api/how-tos/execute).
