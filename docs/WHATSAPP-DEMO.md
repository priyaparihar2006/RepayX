# WhatsApp Web manager demo

Start all three local services in separate terminals:

```powershell
cd backend
.venv\Scripts\python.exe run.py
```

```powershell
cd backend\whatsapp-bridge
npm install
npm start
```

```powershell
cd frontend
npm run dev
```

Open http://localhost:3000/whatsapp. On the phone for **+91 8650629360**, open
WhatsApp → Linked devices → Link a device and scan the live QR. Alternatively,
request a pairing code and choose “Link with phone number instead” on the phone.
The page polls the real connection every two seconds. It never simulates pairing.

The demo recipients are Nancy (+91 7060200849), Sid (+91 9105830551), and
Ajay (+91 8077815522). Their separate sample loan notices can be edited before
using the individual send buttons or **Send all pending messages**. Loan IDs,
amounts, and days overdue are sample data. The payment URLs are demo message text;
this project does not implement the payment website.

Both the backend and bridge restrict sends to these recipients and verify the linked
sender. Linking alone does not send anything. A confirmed provider response is
recorded as **sent**, not delivered/read. Timeouts appear as **unknown** and are
never retried automatically. Check WhatsApp before retrying an uncertain send.
Request IDs prevent duplicate sends from replaying the same HTTP request.

Old simulated outbox entries remain available but are labelled **simulated**.
They are excluded from live send counts. Generated portfolio telephone numbers
are not used for real outreach.

The bridge listens only on 127.0.0.1:8005. Its linked-device credentials live in
`backend/whatsapp-bridge/auth_info/` and are ignored by Git. Logged-out credential
folders are archived locally and also ignored. This is a local demo integration,
not a hosted multi-user messaging service.

Connection lifecycle reference: [Baileys connection documentation](https://github.com/WhiskeySockets/baileys.wiki-site/blob/main/docs/socket/connecting.md).

Checks (all provider sends are mocked):

```powershell
cd backend
.venv\Scripts\python.exe -m pytest tests/test_whatsapp_live.py -q
```

```powershell
cd backend\whatsapp-bridge
npm test
```

```powershell
cd frontend
npm test -- src/pages/WhatsApp.test.tsx
npm run lint
```
