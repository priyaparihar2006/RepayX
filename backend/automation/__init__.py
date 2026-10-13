"""RepayX automated EMI reminder engine.

Durable, database-backed reminder scheduling and multi-channel dispatch:

- importer:    CSV validation, normalization, and upsert of customers/EMIs
- policy:      pure reminder-policy calculation (pre-due, due-date, overdue, explicit)
- scheduler:   reconciliation of desired reminders with persisted jobs
- dispatcher:  per-job eligibility checks and per-channel delivery with idempotency
- worker:      the long-running process that claims and executes due jobs
- providers:   WhatsApp / SMS / Email provider adapters
- inbound:     customer replies, intents, commitments, and manual follow-ups
- webhooks:    provider signature verification and event parsing
"""
