# WhatsApp messaging

Open **Messaging > WhatsApp Messages** (`/whatsapp`). This page uses Meta's WhatsApp Cloud API, separate from the demo Conversations page. It shows the current date in India time, a message preview, outgoing delivery history and incoming replies. Nothing is sent automatically. The historical scoring dataset has no verified live phone-to-customer mapping.

## Local contacts

Contacts live in `backend/data/whatsapp_contacts.json`, which Git ignores. Copy the example file only if your local file does not already exist. Replace fictional example numbers with authorized contacts in international format. The supported labels are `admin`, `defaulter`, and `customer`. These labels do not confer login permissions, register a sender, or establish an actual overdue debt.

Record explicit WhatsApp consent with `opted_in: true` and a meaningful `consent_note`. Set `test_recipient: true` only for authorized test contacts. A supplied phone number alone is not the recipient's consent. Incoming STOP, UNSUBSCRIBE, CANCEL or OPT OUT blocks subsequent sends, even if the file still says opted in. Do not remove opt-out records without renewed consent.

## Connect Meta for a real test

1. Create a Meta developer business app, add the WhatsApp product and open its API Setup screen. Use Meta's test sender initially. Add and verify your own recipient using the code Meta sends to it.
2. In the repository-root `.env`, fill in `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID` and `WHATSAPP_GRAPH_VERSION` using that screen. The phone-number ID is Meta's numeric identifier, not the sender's telephone number. Use the current supported Graph version shown there. Temporary access tokens expire; use a properly scoped system-user token for a deployed service.
3. Set a random `WHATSAPP_OPERATOR_KEY` of at least 32 characters. It authenticates access to contacts and messages; it is separate from your Meta token. Generate one locally with `python -c "import secrets; print(secrets.token_urlsafe(36))"` if needed. Never commit `.env`, paste tokens into chat, or prefix secrets with `VITE_`.
4. Keep `WHATSAPP_TEST_MODE=true`. After setup, set `WHATSAPP_ENABLED=true`. Start/restart the backend from the repository root:

   ```powershell
   .\backend\.venv\Scripts\python.exe -m pip install -r backend/requirements.txt
   .\backend\.venv\Scripts\python.exe backend/run.py
   ```

   This launcher loads the root `.env`; existing shell variables take precedence. If starting Uvicorn directly from `backend`, add `--env-file ../.env` instead. Start the frontend with `npm run dev` in `frontend`.
5. On `/whatsapp`, enter your local operator key, open messaging, select the verified admin test contact, review Meta's neutral `hello_world` preview, check the confirmation box and click Send. Test mode allows only this template and contacts marked as test recipients. **Accepted is not delivered.** Check WhatsApp on the recipient's phone and configure delivery webhooks below.

The admin contact is a recipient. To send **from** that number, register it as a business sender with Meta and configure its phone-number ID. Merely assigning the admin label cannot make messages originate from that number.

## Receive delivery updates and replies

Set `WHATSAPP_APP_SECRET` to the Meta app secret and `WHATSAPP_VERIFY_TOKEN` to a separate random secret chosen by you. Restart the backend. Configure Meta's callback URL to a public HTTPS address ending in `/api/whatsapp/webhook`, with that verify token, and subscribe to the WhatsApp `messages` webhook field. Meta cannot reach `localhost`.

Expose only the webhook path through a suitable proxy/tunnel. Do not expose this development app's other unauthenticated analytics endpoints publicly. For deployment, use HTTPS, proper application authentication, secret management and backups with appropriate retention for message data.

Webhook POSTs are authenticated with HMAC-SHA256 over the raw body. Only events for the configured phone-number ID are processed. Duplicate receipts are deduplicated; late-arriving `sent` receipts do not downgrade `delivered` or `read`. The frontend polls local history every five seconds. The SQLite outbox/inbox at `backend/data/whatsapp.sqlite3` persists across restarts and is excluded from Git.

## Customer messaging limits

[WhatsApp's Business Messaging Policy](https://whatsappbusiness.com/policy/) lists debt collection among restricted uses. Connecting the API or having an approved template does not establish permission for debt-collection outreach. Confirm your proposed use with Meta/provider before enabling customer outreach; this implementation's initial test is neutral connectivity only.

For an allowed use, configure `WHATSAPP_BUSINESS_ACCOUNT_ID`, obtain approved templates and record recipient consent before setting `WHATSAPP_TEST_MODE=false`. The current implementation lists the first 100 templates and supports approved text-body/footer templates with numbered body parameters only. Media, buttons, named parameters, campaigns and arbitrary free-text sending are not supported. It does not bulk message the historical customer dataset.

## Failures and duplicate protection

Each send has a UUID recorded before the provider request. Repeating that UUID does not send again, including after an uncertain timeout. A provider acceptance is stored separately from delivery receipts. `unknown` or a long-lived `sending` means the result needs checking with Meta before composing a new message; the app does not automatically retry. A new draft creates a new request ID and can send another message.

Automated tests use synthetic contacts and a mocked provider. They verify request construction, authorization, opt-in enforcement, duplicate prevention, signatures, delivery updates, replies and current-date display. They do not prove delivery to a real phone. A live test requires the setup above and an actual provider receipt.
