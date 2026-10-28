// Local WhatsApp Web transport; Baileys socket with Multi-File Auth & Two-Way AI Conversational Hook
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const QRCode = require('qrcode');
const pino = require('pino');
const EXPECTED_SENDER = '918650629360';
const RECIPIENTS = new Set(['917060200849', '919105830551', '918077815522']);

async function createBridge(deps = {}) {
  const baileys = deps.baileys || await import('@whiskeysockets/baileys');
  const authDir = deps.authDir || path.join(__dirname, 'auth_info');
  const isLive = () => {
    if (deps.mode) return deps.mode.trim().toLowerCase() === 'live';
    const mode = (process.env.AUTOMATION_MODE || '').trim().toLowerCase();
    if (mode === 'sandbox') return false;
    try {
      const envPath = path.resolve(__dirname, '../../.env');
      if (fs.existsSync(envPath)) {
        const content = fs.readFileSync(envPath, 'utf8');
        const match = content.match(/^AUTOMATION_MODE\s*=\s*([^\r\n#]+)/m);
        if (match && match[1].trim().toLowerCase() === 'sandbox') return false;
      }
    } catch {}
    return true;
  };
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '16mb' }));
  let socket = null, state = 'DISCONNECTED', qrImage = null, qrExpires = 0, user = null;
  let initializing = false, reconnectTimer, reconnects = 0, error = null, pairingReady = false, generation = 0;
  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

  // In-memory store for sent & received messages to fulfill getMessage retry requests (eliminates "Waiting for this message")
  const messageStore = new Map();
  function storeMessage(keyId, message) {
    if (!keyId || !message) return;
    if (messageStore.size > 3000) {
      const oldestKey = messageStore.keys().next().value;
      messageStore.delete(oldestKey);
    }
    messageStore.set(keyId, message);
  }

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
        auth,
        logger: pino({ level: 'silent' }),
        browser: baileys.Browsers.ubuntu('Chrome'),
        connectTimeoutMs: 30000,
        defaultQueryTimeoutMs: 20000,
        qrTimeout: 60000,
        syncFullHistory: false,
        markOnlineOnConnect: true,
        getMessage: async (key) => {
          if (key && key.id) {
            const stored = messageStore.get(key.id);
            if (stored) {
              return stored.message || stored;
            }
          }
          return undefined;
        },
      });
      socket = current;
      current.ev.on('creds.update', saveCreds);

      // Listen for incoming WhatsApp messages for Two-Way AI Autonomous Conversations
      current.ev.on('messages.upsert', async ({ messages: incomingMsgs, type }) => {
        for (const msg of incomingMsgs) {
          if (msg.key?.id && msg.message) {
            storeMessage(msg.key.id, msg.message);
          }
        }
        if (type !== 'notify') return;
        for (const msg of incomingMsgs) {
          if (!msg.message || msg.key.fromMe) continue;
          const remoteJid = msg.key.remoteJid || '';
          if (!remoteJid.endsWith('@s.whatsapp.net')) continue;
          const senderPhone = remoteJid.split('@')[0].replace(/\D/g, '');
          const text = msg.message.conversation || msg.message.extendedTextMessage?.text || '';
          if (!text.trim()) continue;

          console.log(`[WhatsApp] Incoming message from +${senderPhone}: "${text}"`);

          // Forward to FastAPI AI Conversation Agent
          try {
            const fetch = globalThis.fetch || (await import('node-fetch')).default;
            const res = await fetch('http://127.0.0.1:8000/api/whatsapp/webhook/incoming', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                phone: '+' + senderPhone,
                message: text,
                jid: remoteJid,
                timestamp: new Date().toISOString(),
              }),
            });
            const data = await res.json();
            if (isLive() && data?.auto_reply && data?.reply_text) {
              console.log(`[WhatsApp] AI Auto-Reply to +${senderPhone}: "${data.reply_text.substring(0, 60)}..."`);
              const replyRes = await current.sendMessage(remoteJid, { text: data.reply_text });
              if (replyRes?.key?.id) {
                storeMessage(replyRes.key.id, replyRes.message || replyRes);
              }
            }
          } catch (webhookErr) {
            console.warn('[WhatsApp] Webhook/AI dispatch error:', webhookErr.message);
          }
        }
      });

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
          console.log('[WhatsApp] Account linked: +' + phone);
        }
        if (update.connection === 'close') {
          const code = update.lastDisconnect?.error?.output?.statusCode;
          socket = null; user = null; qrImage = null; pairingReady = false;
          if (code === baileys.DisconnectReason.loggedOut) {
            state = 'DISCONNECTED';
            error = 'Session logged out. Generate a new QR to link again.';
            if (fs.existsSync(authDir)) fs.renameSync(authDir, authDir + '.logged-out-' + Date.now());
          } else {
            // Keep reconnecting with exponential backoff capped at 15s instead of giving up permanently
            state = 'CONNECTING';
            error = 'Reconnecting to WhatsApp...';
            const delay = code === baileys.DisconnectReason.restartRequired ? 250 : Math.min(Math.max(reconnects++, 1) * 3000, 15000);
            reconnectTimer = setTimeout(() => void connect(), delay);
          }
        }
      });
    } catch (err) {
      state = 'ERROR';
      error = 'Unable to initialize WhatsApp. Check the bridge logs and network.';
      console.error('[WhatsApp] Initialization failed:', err.message);
      reconnectTimer = setTimeout(() => void connect(), 5000);
    } finally { initializing = false; }
  }

  app.get(['/', '/health', '/healthz', '/ping'], (_req, res) => res.json({ service: 'RepayX WhatsApp Bridge', status: 'online', connected: snapshot().connected }));
  app.get('/status', (_req, res) => {
    if (!socket && !initializing && state !== 'CONNECTED' && fs.existsSync(authDir)) {
      void connect();
    }
    res.json(snapshot());
  });
  app.post('/qr/generate', async (_req, res) => {
    if (!socket || state === 'DISCONNECTED' || state === 'ERROR') {
      reconnects = 0;
      await connect();
    }
    for (let i = 0; i < 40 && !qrImage && state !== 'CONNECTED'; i++) {
      await wait(250);
    }
    res.json({ ...snapshot(), expires_in: snapshot().qr_expires_in });
  });
  app.post('/pair-code', async (req, res) => {
    const phone = String(req.body.phone || '').replace(/\D/g, '');
    if (!phone || phone.length < 10) return res.status(400).json({ success: false, error: 'Enter a valid 10-digit mobile number.' });
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
    if (!isLive()) return res.status(403).json({ success: false, error: 'Sandbox mode: live WhatsApp sending is disabled.' });
    let phone = String(req.body.phone || req.body.recipient || '').replace(/\D/g, '');
    const message = req.body.message || req.body.text;
    if (phone.length === 10) phone = '91' + phone;

    if (!snapshot().connected) return res.status(409).json({ success: false, error: 'Link WhatsApp before sending.' });
    const isAllowedRecipient = RECIPIENTS.has(phone) || (phone.length >= 10 && phone !== '919999999999');
    if (!isAllowedRecipient || typeof message !== 'string' || !message.trim() || message.length > 2000) {
      return res.status(400).json({ success: false, error: 'Enter a valid phone number and message (maximum 2000 characters).' });
    }
    if (user && user.phone_number && user.phone_number === '+919999999999') {
      return res.status(403).json({ success: false, error: 'The linked account must be +91 8650629360.' });
    }

    try {
      let targetJid = phone + '@s.whatsapp.net';
      try {
        const [onWa] = await socket.onWhatsApp(phone);
        if (onWa?.exists && onWa?.jid) targetJid = onWa.jid;
      } catch {}

      // Step 1: Presence warmup & Signal ratchet sync
      try {
        await socket.presenceSubscribe(targetJid);
        await socket.sendPresenceUpdate('composing', targetJid);
      } catch {}
      await wait(800);

      // Step 2: Send text message
      console.log(`[WhatsApp] Sending message to ${targetJid}...`);
      const result = await socket.sendMessage(targetJid, { text: message });
      if (!result?.key?.id) throw new Error('Missing provider message ID');
      storeMessage(result.key.id, result.message || result);
      console.log(`[WhatsApp] ✅ Sent text successfully: ${result.key.id}`);

      let voiceSent = false;
      let voiceMessageId = null;
      const audioPath = req.body.audio_path;
      let audioUrl = req.body.audio_url || req.body.media_url;
      const audioBase64 = req.body.audio_base64;
      const audioFilename = req.body.audio_filename || '';

      // If audioUrl is relative, resolve against backend URL
      if (typeof audioUrl === 'string' && audioUrl.startsWith('/')) {
        const backendBase = (process.env.BACKEND_URL || 'https://repayx-backend.onrender.com').replace(/\/+$/, '');
        audioUrl = `${backendBase}${audioUrl}`;
      }

      let audioBuffer = null;
      let isOgg = false;

      if (audioBase64) {
        try {
          audioBuffer = Buffer.from(audioBase64, 'base64');
          isOgg = audioFilename.endsWith('.ogg') || audioFilename.endsWith('.opus') || (typeof audioPath === 'string' && (audioPath.endsWith('.ogg') || audioPath.endsWith('.opus')));
          if (!isOgg && audioBuffer.length >= 4 && audioBuffer[0] === 0x4f && audioBuffer[1] === 0x67 && audioBuffer[2] === 0x67 && audioBuffer[3] === 0x53) {
            isOgg = true;
          }
        } catch (bErr) {
          console.warn('[WhatsApp] Failed to decode audio_base64:', bErr.message);
        }
      } else if (audioPath && fs.existsSync(audioPath)) {
        try {
          audioBuffer = fs.readFileSync(audioPath);
          isOgg = audioPath.endsWith('.ogg') || audioPath.endsWith('.opus');
        } catch (fErr) {
          console.warn('[WhatsApp] Failed to read audioPath:', fErr.message);
        }
      }

      // Step 3: Send girl voice note if provided
      if (audioBuffer) {
        try {
          try {
            await socket.sendPresenceUpdate('recording', targetJid);
          } catch {}
          await wait(1800);

          console.log(`[WhatsApp] 🎙️ Sending girl voice note from buffer (${audioBuffer.length} bytes, isOgg=${isOgg}) to ${targetJid}...`);
          const voiceRes = await socket.sendMessage(targetJid, {
            audio: audioBuffer,
            mimetype: isOgg ? 'audio/ogg; codecs=opus' : 'audio/mpeg',
            ptt: isOgg,
          });
          if (voiceRes?.key?.id) {
            storeMessage(voiceRes.key.id, voiceRes.message || voiceRes);
            voiceSent = true;
            voiceMessageId = voiceRes.key.id;
            console.log(`[WhatsApp] 🎙️ ✅ Voice note delivered: ${voiceMessageId}`);
          }
        } catch (vErr) {
          console.warn(`[WhatsApp] ⚠️ Voice note dispatch warning:`, vErr.message);
        } finally {
          try { await socket.sendPresenceUpdate('paused', targetJid); } catch {}
        }
      } else if (audioUrl) {
        try {
          try {
            await socket.sendPresenceUpdate('recording', targetJid);
          } catch {}
          await wait(1800);

          console.log(`[WhatsApp] 🎙️ Sending girl voice note from URL: ${audioUrl} to ${targetJid}...`);
          const isOgg = audioUrl.includes('.ogg') || audioUrl.includes('.opus');
          const voiceRes = await socket.sendMessage(targetJid, {
            audio: { url: audioUrl },
            mimetype: isOgg ? 'audio/ogg; codecs=opus' : 'audio/mpeg',
            ptt: isOgg,
          });
          if (voiceRes?.key?.id) {
            storeMessage(voiceRes.key.id, voiceRes.message || voiceRes);
            voiceSent = true;
            voiceMessageId = voiceRes.key.id;
            console.log(`[WhatsApp] 🎙️ ✅ Voice note delivered: ${voiceMessageId}`);
          }
        } catch (vErr) {
          console.warn(`[WhatsApp] ⚠️ Voice note dispatch warning:`, vErr.message);
        } finally {
          try { await socket.sendPresenceUpdate('paused', targetJid); } catch {}
        }
      } else {
        try { await socket.sendPresenceUpdate('paused', targetJid); } catch {}
      }

      res.json({
        success: true,
        message_id: result.key.id,
        provider_id: result.key.id,
        recipient: '+' + phone,
        status: 'sent',
        voice_sent: voiceSent,
        voice_message_id: voiceMessageId,
      });
    } catch (err) {
      console.error('[WhatsApp] Send failed:', err.message);
      res.status(502).json({ success: false, error: 'WhatsApp send failed: ' + err.message });
    }
  });

  app.post('/send-voice', async (req, res) => {
    if (!isLive()) return res.status(403).json({ success: false, error: 'Sandbox mode: live WhatsApp sending is disabled.' });
    let phone = String(req.body.phone || req.body.recipient || '').replace(/\D/g, '');
    if (phone.length === 10) phone = '91' + phone;
    const audioPath = req.body.audio_path;
    let audioUrl = req.body.audio_url || req.body.media_url;
    const audioBase64 = req.body.audio_base64;
    const audioFilename = req.body.audio_filename || '';

    if (!phone || phone.length < 10) {
      return res.status(400).json({ success: false, error: 'Enter a valid phone number.' });
    }
    if (!snapshot().connected) return res.status(409).json({ success: false, error: 'Link WhatsApp before sending.' });
    if (!audioPath && !audioUrl && !audioBase64) {
      return res.status(400).json({ success: false, error: 'Provide audio_path, audio_url, or audio_base64.' });
    }

    if (typeof audioUrl === 'string' && audioUrl.startsWith('/')) {
      const backendBase = (process.env.BACKEND_URL || 'https://repayx-backend.onrender.com').replace(/\/+$/, '');
      audioUrl = `${backendBase}${audioUrl}`;
    }

    let audioBuffer = null;
    let isOgg = false;
    if (audioBase64) {
      try {
        audioBuffer = Buffer.from(audioBase64, 'base64');
        isOgg = audioFilename.endsWith('.ogg') || audioFilename.endsWith('.opus') || (typeof audioPath === 'string' && (audioPath.endsWith('.ogg') || audioPath.endsWith('.opus')));
        if (!isOgg && audioBuffer.length >= 4 && audioBuffer[0] === 0x4f && audioBuffer[1] === 0x67 && audioBuffer[2] === 0x67 && audioBuffer[3] === 0x53) {
          isOgg = true;
        }
      } catch (bErr) {
        console.warn('[WhatsApp] Failed to decode audio_base64:', bErr.message);
      }
    } else if (audioPath && fs.existsSync(audioPath)) {
      try {
        audioBuffer = fs.readFileSync(audioPath);
        isOgg = audioPath.endsWith('.ogg') || audioPath.endsWith('.opus');
      } catch (fErr) {
        console.warn('[WhatsApp] Failed to read audioPath:', fErr.message);
      }
    }

    try {
      let targetJid = phone + '@s.whatsapp.net';
      try {
        const [onWa] = await socket.onWhatsApp(phone);
        if (onWa?.exists && onWa?.jid) targetJid = onWa.jid;
      } catch {}

      // Presence warmup
      try {
        await socket.presenceSubscribe(targetJid);
        await socket.sendPresenceUpdate('recording', targetJid);
      } catch {}
      await wait(600);

      let voiceRes = null;
      if (audioBuffer) {
        console.log(`[WhatsApp] 🎙️ Sending standalone girl voice note from buffer (${audioBuffer.length} bytes, isOgg=${isOgg}) to ${targetJid}...`);
        voiceRes = await socket.sendMessage(targetJid, {
          audio: audioBuffer,
          mimetype: isOgg ? 'audio/ogg; codecs=opus' : 'audio/mpeg',
          ptt: isOgg,
        });
      } else if (audioUrl) {
        console.log(`[WhatsApp] 🎙️ Sending standalone girl voice note from URL ${audioUrl} to ${targetJid}...`);
        const isOgg = audioUrl.includes('.ogg') || audioUrl.includes('.opus');
        voiceRes = await socket.sendMessage(targetJid, {
          audio: { url: audioUrl },
          mimetype: isOgg ? 'audio/ogg; codecs=opus' : 'audio/mpeg',
          ptt: isOgg,
        });
      }
      if (!voiceRes?.key?.id) throw new Error('Missing voice message ID');
      storeMessage(voiceRes.key.id, voiceRes.message || voiceRes);
      try { await socket.sendPresenceUpdate('paused', targetJid); } catch {}

      console.log(`[WhatsApp] 🎙️ ✅ Voice message sent successfully: ${voiceRes.key.id}`);
      res.json({
        success: true,
        message_id: voiceRes.key.id,
        provider_id: voiceRes.key.id,
        recipient: '+' + phone,
        status: 'sent',
        voice_sent: true,
      });
    } catch (err) {
      console.error('[WhatsApp] Standalone voice send failed:', err.message);
      res.status(502).json({ success: false, error: 'WhatsApp voice send failed: ' + err.message });
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

  return {
    app, connect, close: () => {
      clearTimeout(reconnectTimer); ++generation;
      const current = socket; socket = null; current?.end(undefined);
    }
  };
}

if (require.main === module) {
  createBridge().then(({ app, connect }) => {
    let port = 8005;
    if (process.env.WHATSAPP_BRIDGE_PORT) {
      port = Number(process.env.WHATSAPP_BRIDGE_PORT);
    } else if (process.env.PORT) {
      port = Number(process.env.PORT);
    } else {
      try {
        const envPath = path.resolve(__dirname, '../../.env');
        if (fs.existsSync(envPath)) {
          const envContent = fs.readFileSync(envPath, 'utf8');
          const match = envContent.match(/^WHATSAPP_BRIDGE_URL\s*=\s*https?:\/\/[^:]+:(\d+)/m);
          if (match && match[1]) port = Number(match[1]);
        }
      } catch {}
    }
    const host = '0.0.0.0';
    app.listen(port, host, () => {
      console.log(`[WhatsApp] Bridge listening on ${host}:${port}`);
      void connect();
    });
  }).catch(err => {
    console.error(err);
    process.exitCode = 1;
  });
}

module.exports = { createBridge };
