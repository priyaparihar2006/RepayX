// Local WhatsApp Web transport; only a confirmed socket is connected.
const express = require('express');
const path = require('path');
const fs = require('fs');
const QRCode = require('qrcode');
const pino = require('pino');
const EXPECTED_SENDER = '918650629360';
const RECIPIENTS = new Set(['917060200849', '919105830551', '918077815522']);

async function createBridge(deps = {}) {
  const baileys = deps.baileys || await import('@whiskeysockets/baileys');
  const authDir = deps.authDir || path.join(__dirname, 'auth_info');
  const app = express();
  app.use((req, res, next) => req.headers.origin
    ? res.status(403).json({ success: false, error: 'Use the RepayX API.' }) : next());
  app.use(express.json({ limit: '16kb' }));
  let socket = null, state = 'DISCONNECTED', qrImage = null, qrExpires = 0, user = null;
  let initializing = false, reconnectTimer, reconnects = 0, error = null, pairingReady = false, generation = 0;
  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
  function snapshot() {
    const connected = state === 'CONNECTED' && !!socket?.user && !!user;
    const validQR = qrImage && qrExpires > Date.now();
    return {
      success: true, enabled: true, ready: true, connected,
      status: connected ? 'CONNECTED' : validQR ? 'SCAN_QR_CODE' : state,
      qr_code: validQR && !connected ? qrImage : null,
      qr_expires_in: validQR ? Math.ceil((qrExpires - Date.now()) / 1000) : 0,
      session_info: connected ? user : null, error_message: error,
      server_time: new Date().toISOString(),
    };
  }
  async function connect() {
    if (initializing || socket) return;
    clearTimeout(reconnectTimer);
    initializing = true;
    const currentGeneration = ++generation;
    state = 'CONNECTING';
    error = null;
    try {
      const { state: auth, saveCreds } = await baileys.useMultiFileAuthState(authDir);
      if (currentGeneration !== generation) return;
      const current = baileys.default({
        auth, logger: pino({ level: 'silent' }),
        browser: baileys.Browsers.ubuntu('Chrome'),
        connectTimeoutMs: 20000, defaultQueryTimeoutMs: 15000,
        qrTimeout: 60000, syncFullHistory: false, markOnlineOnConnect: false,
      });
      socket = current;
      current.ev.on('creds.update', saveCreds);
      current.ev.on('connection.update', async update => {
        if (socket !== current) return;
        if (update.qr) {
          pairingReady = true;
          const expires = Date.now() + 60000;
          try {
            const image = await QRCode.toDataURL(update.qr, { width: 320, margin: 4 });
            if (socket !== current || state === 'CONNECTED') return;
            qrImage = image;
            qrExpires = expires;
            state = 'SCAN_QR_CODE';
            console.log('[WhatsApp] Live pairing QR ready.');
          } catch { error = 'Could not render QR. Try a pairing code.'; }
        }
        if (update.connection === 'open') {
          const phone = (current.user?.id || '').split('@')[0].split(':')[0];
          user = {
            phone_number: '+' + phone, user_name: current.user?.name || 'WhatsApp',
            connected_at: new Date().toISOString(), device: 'WhatsApp linked device',
          };
          state = 'CONNECTED';
          qrImage = null;
          reconnects = 0;
          error = null;
          console.log('[WhatsApp] Account linked.');
        }
        if (update.connection === 'close') {
          const code = update.lastDisconnect?.error?.output?.statusCode;
          socket = null; user = null; qrImage = null; pairingReady = false;
          if (code === baileys.DisconnectReason.loggedOut) {
            state = 'DISCONNECTED';
            error = 'Session logged out. Generate a new QR to link again.';
            if (fs.existsSync(authDir)) fs.renameSync(authDir, authDir + '.logged-out-' + Date.now());
          } else if (code === baileys.DisconnectReason.restartRequired || reconnects++ < 5) {
            state = 'CONNECTING';
            reconnectTimer = setTimeout(() => void connect(),
              code === baileys.DisconnectReason.restartRequired ? 250 : Math.min(reconnects * 2000, 10000));
          } else {
            state = 'ERROR';
            error = 'WhatsApp connection failed. Check your network and generate a new QR.';
          }
        }
      });
    } catch (err) {
      state = 'ERROR';
      error = 'Unable to initialize WhatsApp. Check the bridge logs and network.';
      console.error('[WhatsApp] Initialization failed:', err.message);
    } finally { initializing = false; }
  }
  app.get('/health', (_req, res) => res.json({ status: 'ok', connected: snapshot().connected }));
  app.get('/status', (_req, res) => res.json(snapshot()));
  app.post('/qr/generate', async (_req, res) => {
    if (!socket) { reconnects = 0; await connect(); }
    res.json({ ...snapshot(), expires_in: snapshot().qr_expires_in });
  });
  app.post('/pair-code', async (req, res) => {
    const phone = String(req.body.phone || '').replace(/\D/g, '');
    if (phone !== EXPECTED_SENDER) return res.status(400).json({ success: false, error: 'Use +91 8650629360 for this demo.' });
    if (snapshot().connected) return res.status(409).json({ success: false, error: 'An account is already linked.' });
    try {
      if (!socket) await connect();
      for (let i = 0; i < 40 && !pairingReady; i++) await wait(250);
      if (!socket || !pairingReady) return res.status(503).json({ success: false, error: 'WhatsApp is still connecting. Try again when the QR appears.' });
      const code = await socket.requestPairingCode(phone);
      res.json({ success: true, pairing_code: code, phone });
    } catch {
      res.status(502).json({ success: false, error: 'WhatsApp could not create a pairing code. Try scanning the QR.' });
    }
  });
  app.post('/send', async (req, res) => {
    const phone = String(req.body.phone || '').replace(/\D/g, '');
    const message = req.body.message;
    if (!RECIPIENTS.has(phone) || typeof message !== 'string' || !message.trim() || message.length > 2000) {
      return res.status(400).json({ success: false, error: 'Select a configured demo recipient and enter a message (maximum 2000 characters).' });
    }
    if (!snapshot().connected) return res.status(409).json({ success: false, error: 'Link WhatsApp before sending.' });
    if (user.phone_number !== '+' + EXPECTED_SENDER) return res.status(403).json({ success: false, error: 'The linked account must be +91 8650629360.' });
    try {
      const result = await socket.sendMessage(phone + '@s.whatsapp.net', { text: message });
      if (!result?.key?.id) throw new Error('Missing provider message ID');
      res.json({ success: true, message_id: result.key.id, recipient: '+' + phone, status: 'sent' });
    } catch (err) {
      console.error('[WhatsApp] Send failed:', err.message);
      res.status(502).json({ success: false, error: 'WhatsApp did not confirm the send. Check the phone before retrying.' });
    }
  });
  app.post('/disconnect', async (_req, res) => {
    clearTimeout(reconnectTimer); ++generation;
    const current = socket;
    socket = null; user = null; qrImage = null; pairingReady = false; state = 'DISCONNECTED';
    try {
      if (current) { await current.logout(); current.end(undefined); }
      if (fs.existsSync(authDir)) fs.renameSync(authDir, authDir + '.disconnected-' + Date.now());
      res.json({ success: true, status: state });
    } catch {
      current?.end(undefined);
      res.status(502).json({ success: false, error: 'Logout could not be confirmed. Unlink RepayX in WhatsApp Linked devices.' });
    }
  });
  return { app, connect, close: () => {
    clearTimeout(reconnectTimer); ++generation;
    const current = socket; socket = null; current?.end(undefined);
  } };
}
if (require.main === module) {
  createBridge().then(({ app, connect }) => {
    const port = Number(process.env.WHATSAPP_BRIDGE_PORT || 8005);
    app.listen(port, '127.0.0.1', () => { console.log('[WhatsApp] Bridge listening on 127.0.0.1:' + port); void connect(); });
  }).catch(err => { console.error(err); process.exitCode = 1; });
}
module.exports = { createBridge };
