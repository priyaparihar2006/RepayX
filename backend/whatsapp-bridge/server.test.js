const { test } = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { createBridge } = require('./server');

async function fixture(t) {
  let sent = 0;
  const socket = { ev: new EventEmitter(), user: { id: '918650629360:1@s.whatsapp.net', name: 'Demo' },
    sendMessage: async () => { sent++; return { key: { id: 'real-id' } }; }, end() {} };
  const bridge = await createBridge({ baileys: {
    default: () => socket, Browsers: { ubuntu: () => ['test', 'Chrome', '1'] },
    useMultiFileAuthState: async () => ({ state: {}, saveCreds() {} }),
    DisconnectReason: { loggedOut: 401, restartRequired: 515 },
  } });
  const server = bridge.app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(() => { bridge.close(); server.closeAllConnections(); server.close(); });
  const base = 'http://127.0.0.1:' + server.address().port;
  const post = (path, body) => fetch(base + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  await bridge.connect();
  return { socket, post, sent: () => sent, status: async () => (await fetch(base + '/status')).json() };
}
const payload = { phone: '+917060200849', message: 'Demo notice' };
test('socket must confirm connection, never invent sent results', async t => {
  const f = await fixture(t);
  assert.equal((await f.status()).connected, false);
  assert.equal((await f.post('/send', payload)).status, 409);
  assert.equal(f.sent(), 0);
  f.socket.ev.emit('connection.update', { connection: 'open' });
  assert.equal((await f.status()).connected, true);
  const sent = await (await f.post('/send', payload)).json();
  assert.equal(sent.status, 'sent');
  assert.equal(sent.message_id, 'real-id');
  f.socket.sendMessage = async () => { throw Error('provider down'); };
  const failed = await f.post('/send', payload);
  assert.equal(failed.status, 502);
  assert.equal((await failed.json()).success, false);
});
test('wrong sender and unconfigured recipients cannot send', async t => {
  const f = await fixture(t);
  f.socket.user.id = '919999999999@s.whatsapp.net';
  f.socket.ev.emit('connection.update', { connection: 'open' });
  assert.equal((await f.post('/send', payload)).status, 403);
  assert.equal((await f.post('/send', { ...payload, phone: '+919999999999' })).status, 400);
  assert.equal(f.sent(), 0);
});
test('QR derives from an actual transport event and is cleared on connect', async t => {
  const f = await fixture(t);
  f.socket.ev.emit('connection.update', { qr: 'fixture-whatsapp-qr' });
  for (let i = 0; i < 30 && !(await f.status()).qr_code; i++) await new Promise(resolve => setTimeout(resolve, 10));
  assert.match((await f.status()).qr_code, /^data:image\/png;base64,/);
  f.socket.ev.emit('connection.update', { connection: 'open' });
  assert.equal((await f.status()).qr_code, null);
});
