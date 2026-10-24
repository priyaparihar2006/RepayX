# RepayX Production Deployment & Operations Runbook

## Overview

RepayX provides an enterprise-ready, automated EMI repayment reminder, AI voice note synthesis, conversational recovery, and structured 3-stage escalation management platform.

This runbook covers architecture, environment configuration, Meta WhatsApp Business Platform setup, cloud worker execution, webhook integration, and operational monitoring.

---

## 1. System Architecture

```mermaid
flowchart TD
    subgraph DataIngestion[Data Ingestion]
        CSV[CSV Upload via Dashboard / API] --> Importer[CsvImporter: Validation & Alias Mapping]
        Importer --> DB[(SQLite / PostgreSQL Persistent DB)]
    end

    subgraph StateMachine[3-Stage Reminder State Machine]
        DB --> S1[Stage 1: Friendly Reminder]
        S1 --> S2[Stage 2: Firm Follow-up]
        S2 --> S3[Stage 3: Final Notice]
        S3 --> EscCheck{Unpaid after Stage 3?}
        EscCheck -->|Yes| Esc[(Escalation Case: Human Recovery Required)]
        EscCheck -->|No / Paid| Resolved[Resolved / Cancelled]
    end

    subgraph BackgroundExecution[Independent Cloud Worker]
        Worker[worker.py: Persistent Daemon Loop] --> Lease[Job Lease with Idempotency Lock]
        Lease --> PreCheck{Pre-send Validation: Paid / Hold / Consent?}
        PreCheck -->|Eligible| Dispatcher[Dispatcher Engine]
        PreCheck -->|Paid or Claimed| Halt[Halt & Cancel Reminders]
        Dispatcher --> VoiceSynth[OpenAI TTS: Voice Note Generation]
        Dispatcher --> MetaAPI[Meta WhatsApp Business Cloud API]
    end

    subgraph TwoWayAI[Two-Way Conversational Recovery]
        Customer[Customer WhatsApp Reply: Hindi/Hinglish/English] --> Webhook[/api/webhooks/whatsapp]
        Webhook --> SigVerify{X-Hub-Signature-256 Valid?}
        SigVerify -->|Yes| Dedup{Message Seen?}
        Dedup -->|No| IntentClassifier[Intent Classifier & Loan Grounding]
        IntentClassifier --> GroundedReply[Grounded WhatsApp Auto-Reply]
        IntentClassifier --> ActionRouter{Intent Action}
        ActionRouter -->|PAID_CLAIM| PauseReminders[Set payment_claim_pending = 1]
        ActionRouter -->|HUMAN_AGENT| Takeover[Enable human_takeover & Create Task]
        ActionRouter -->|DISPUTE| Hold[Set reminders_on_hold = 1]
    end
```

---

## 2. Environment Variables & Secrets Reference

Configure these variables in your hosting environment (`.env` or cloud secret manager):

### Core System Configuration
| Variable | Default | Description |
|---|---|---|
| `AUTOMATION_MODE` | `sandbox` | Set to `live` for real outbound WhatsApp / Voice dispatches |
| `AUTOMATION_DB_PATH` | `data/automation.sqlite3` | Path to persistent database storage |
| `AUTOMATION_EMBEDDED_WORKER` | `false` | In production, leave `false` and run `worker.py` as a separate daemon |
| `API_KEYS` | (Generated) | Comma-separated `key:name:role` tokens (e.g. `secret-key-1:admin:admin`) |
| `ALLOW_ANONYMOUS_DASHBOARD` | `true` | Allows seamless operator dashboard viewing |

### Meta WhatsApp Business Platform (Cloud API)
| Variable | Description |
|---|---|
| `META_CLOUD_API_TOKEN` | System User Access Token from Meta Business Suite (Permanent token recommended) |
| `META_PHONE_NUMBER_ID` | WhatsApp Business Phone Number ID from Meta App Dashboard |
| `META_WABA_ID` | WhatsApp Business Account ID |
| `META_APP_SECRET` | App Secret used for HMAC-SHA256 signature verification on incoming webhooks |
| `WHATSAPP_VERIFY_TOKEN` | Random verification token shared with Meta Webhook configuration |
| `WHATSAPP_PUBLIC_BASE_URL` | Public HTTPS URL where RepayX is hosted (e.g., `https://api.repayx.yourcompany.com`) |

### OpenAI Voice & Text-To-Speech (TTS)
| Variable | Default | Description |
|---|---|---|
| `OPENAI_API_KEY` | (Required for live TTS) | OpenAI API Key with access to `tts-1` model |
| `VOICE_TTS_MODEL` | `tts-1` | OpenAI TTS model identifier |
| `VOICE_DEFAULT_ID` | `alloy` | Default synthetic voice (`alloy`, `echo`, `fable`, `onyx`, `nova`, `shimmer`) |

---

## 3. Persistent Worker Deployment (Run When Laptop / Browser is Closed)

The background worker (`backend/worker.py`) runs independently of any browser sessions or UI dashboards. It continually acquires leases, processes due reminder stages, synthesizes voice media, and executes retries with exponential backoff.

### Option A: Systemd Service (Linux / Ubuntu VM)

Create `/etc/systemd/system/repayx-worker.service`:
```ini
[Unit]
Description=RepayX Persistent Reminder & Escalation Worker
After=network.target

[Service]
Type=simple
User=repayx
WorkingDirectory=/opt/repayx/backend
EnvironmentFile=/opt/repayx/backend/.env
ExecStart=/opt/repayx/backend/.venv/bin/python worker.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable and start the service:
```bash
sudo systemctl daemon-reload
sudo systemctl enable --now repayx-worker
sudo systemctl status repayx-worker
```

### Option B: Cloud Platform Procfile (Heroku / Render / Railway)

A `Procfile` is included in the project root:
```text
web: cd backend && python -m uvicorn api.main:app --host 0.0.0.0 --port $PORT
worker: cd backend && python worker.py
```
Scale the worker process to 1 dyno/instance:
```bash
# Render / Railway: Set worker service to run `python worker.py`
# Heroku:
heroku ps:scale worker=1
```

### Option C: Docker Compose

```yaml
version: '3.8'
services:
  api:
    build: .
    command: python -m uvicorn api.main:app --host 0.0.0.0 --port 8000
    env_file: .env
    volumes:
      - repayx_data:/app/backend/data
    ports:
      - "8000:8000"

  worker:
    build: .
    command: python worker.py
    env_file: .env
    volumes:
      - repayx_data:/app/backend/data
    restart: always

volumes:
  repayx_data:
```

---

## 4. Meta WhatsApp Webhook Setup Guide

To receive incoming WhatsApp customer replies, delivery receipts, and read acknowledgements:

1. Log in to the [Meta Developers Portal](https://developers.facebook.com).
2. Go to **WhatsApp** > **Configuration**.
3. Under **Callback URL**, enter:
   `https://api.repayx.yourcompany.com/api/webhooks/whatsapp`
4. Under **Verify Token**, enter the value set in your `WHATSAPP_VERIFY_TOKEN` env variable.
5. Click **Verify and Save**. Meta will perform a GET challenge request which RepayX handles automatically.
6. Under **Webhook Fields**, subscribe to:
   - `messages` (inbound borrower text and interactive replies)
   - `message_deliveries` (status updates: delivered, read, failed)
7. Ensure `META_APP_SECRET` is set in RepayX; all incoming webhooks are validated with `X-Hub-Signature-256` HMAC validation. Replayed webhook event IDs are rejected via SQLite duplicate suppression.

---

## 5. Three-Stage Reminder & Escalation State Machine

RepayX enforces a strict 3-reminder rule:

1. **Stage 1 (Friendly Reminder)**:
   - Dispatched prior to due date (default: 3 days before due date).
   - Polite, informational reminder with verified due date, outstanding balance, and UPI repayment instructions.
   - Generates natural Hindi/Hinglish/English voice reminder note.

2. **Stage 2 (Firm Follow-up)**:
   - Dispatched when installment is still pending or on due date.
   - Clear statement that the EMI is due, reminding borrower of credit score protection and late fee prevention.

3. **Stage 3 (Final Notice)**:
   - Dispatched if past due date (e.g., 3-5 days overdue).
   - Final official notice explaining that failure to clear the installment will transfer the account to human recovery and legal/field investigation.

4. **Automatic Escalation (`escalation_cases`)**:
   - Immediately upon completion of Stage 3 without full payment, standard automated reminders are halted.
   - An `escalation_cases` record is created (`status: 'open'`, `stage_reached: 3`).
   - A high-priority `followup_tasks` item is queued for the Recovery Manager.
   - The borrower appears in the **Escalations Tab** on the dashboard.
   - Human Recovery Officers can click **Take Over** to assign the case or **Resolve** once restructured or recovered.

---

## 6. Two-Way Conversational AI Safeguards

When borrowers reply on WhatsApp (in Hindi, Hinglish, or English):
- **Payment Claims** ("Maine kal payment kar di hai", "paid via UPI"):
  - Flagged as `PAID_CLAIM`.
  - Open reminder jobs are immediately held from dispatching.
  - Generates a respectful acknowledgment requesting transaction reference/screenshot while an operator verifies the bank ledger.
  - **Does NOT** mark the loan paid without financial verification.
- **Balance & Due Date Queries** ("Mera balance kitna hai?", "kab tak bharna hai?"):
  - System extracts verified real-time `outstanding = emi_amount - amount_paid` directly from the database.
  - Responds strictly with grounded financial facts; never hallucinates discounts or unauthorized waivers.
- **Human Agent Request** ("I want to talk to an executive", "agent se baat karao"):
  - System sets `human_takeover = 1` on the customer profile.
  - Silences AI auto-replies and alerts the recovery officer via high-priority task.

---

## 7. CSV Upload Schema Reference

Upload CSVs via **Dashboard > Import CSV** or `POST /api/imports/csv`.

### Supported Columns (Aliases Supported)
- `customer_id`: Unique customer reference (e.g. `CUST-1001`)
- `customer_name` (or `name`, `Borrower Name`): Customer name
- `phone_number` (or `phone`, `mobile`): Valid 10-digit or E.164 phone number
- `email`: Customer email
- `loan_id` (or `loan_account_number`): Loan identifier
- `emi_amount` (or `amount`, `EMI Amount`): Installment amount in INR
- `due_date`: Date in `YYYY-MM-DD` format
- `payment_status`: `pending`, `overdue`, or `paid`
- `reminder_date`: Optional explicit reminder date
- `reminder_time`: Optional explicit time (e.g. `10:00 AM`)
- `timezone`: Local timezone (default: `Asia/Kolkata`)
- `preferred_language`: `hi`, `en`, or `hinglish`
- `consent_status`: `granted` or `revoked`

Sample test file available at: `datasets/repayx_sample_fictional_test_data.csv`.

