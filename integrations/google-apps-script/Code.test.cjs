// Local Apps Script contract tests. MailApp is a stub; no Google account or network.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(__dirname + '/Code.gs', 'utf8');
const SECRET = 'local-unit-test-secret-not-a-real-credential';

function harness() {
  const values = { REPAYX_SHARED_SECRET: SECRET, REPAYX_ALLOWED_RECIPIENTS: 'one@example.invalid,two@example.invalid', REPAYX_SEND_ENABLED: 'true', REPAYX_DAILY_LIMIT: '5' };
  const sent = [];
  const state = { quota: 10, busy: false, throwOnSend: false };
  const props = { getProperty: k => values[k] ?? null, setProperty: (k, v) => { values[k] = v; }, getProperties: () => ({ ...values }) };
  const context = vm.createContext({
    PropertiesService: { getScriptProperties: () => props },
    LockService: { getScriptLock: () => ({ tryLock: () => !state.busy, releaseLock: () => {} }) },
    Utilities: { Charset: { UTF_8: 'utf8' }, DigestAlgorithm: { SHA_256: 'sha256' },
      computeHmacSha256Signature: (s, k) => Array.from(crypto.createHmac('sha256', k).update(s).digest()),
      computeDigest: (algo, s) => Array.from(crypto.createHash(algo).update(s).digest()) },
    ContentService: { MimeType: { JSON: 'json' }, createTextOutput: text => ({ setMimeType: () => JSON.parse(text) }) },
    MailApp: { getRemainingDailyQuota: () => state.quota, sendEmail: p => { sent.push(p); if (state.throwOnSend) throw Error('private-provider-detail'); } },
  });
  vm.runInContext(source, context);
  const payload = { request_id: 'a'.repeat(64), recipient: 'one@example.invalid', name: '<Test & Customer>', loan_id: 'L1', amount: '₹100.00', due_date: '20 Oct 2030' };
  function envelope(p = payload, timestamp = String(Math.floor(Date.now()/1000))) {
    const body = { timestamp, nonce: 'b'.repeat(32), payload: JSON.stringify(p) };
    body.signature = crypto.createHmac('sha256', SECRET).update(`${timestamp}\n${body.nonce}\n${body.payload}`).digest('hex');
    return body;
  }
  const run = body => context.doPost({ postData: { contents: JSON.stringify(body) } });
  return { values, sent, state, payload, envelope, run, context };
}

test('signed request accepts once, escapes HTML, and deduplicates', () => {
  const h = harness();
  assert.equal(h.run(h.envelope()).status, 'accepted');
  assert.equal(h.run(h.envelope()).status, 'accepted');
  assert.equal(h.sent.length, 1);
  assert.match(h.sent[0].htmlBody, /&lt;Test &amp; Customer&gt;/);
  assert.equal(h.sent[0].subject, 'RepayX — EMI Payment Reminder');
  assert.equal(h.run(h.envelope({...h.payload, amount:'₹999.00'})).status, 'invalid_request');
  assert.equal(h.sent.length, 1);
});

test('rejects tampered, unsigned, expired and oversized requests without sending', () => {
  const h = harness();
  const tampered = h.envelope(); tampered.payload += ' ';
  for (const body of [tampered, {payload:'{}'}, h.envelope(h.payload, String(Math.floor(Date.now()/1000)-600))])
    assert.equal(h.run(body).status, 'unauthorized');
  assert.equal(h.context.doPost({postData:{contents:'x'.repeat(10001)}}).status, 'invalid_request');
  assert.equal(h.sent.length, 0);
  assert.equal(h.context.doGet().status, 'method_not_allowed');
});

test('requires explicit allowlist and enablement; rejects header injection and multi recipients', () => {
  const h = harness();
  assert.equal(h.run(h.envelope({...h.payload,recipient:'outside@example.invalid'})).status, 'recipient_not_allowlisted');
  assert.equal(h.run(h.envelope({...h.payload,recipient:'one@example.invalid,two@example.invalid'})).status, 'invalid_request');
  assert.equal(h.run(h.envelope({...h.payload,name:'hello\r\nBcc: x@y.invalid'})).status, 'invalid_request');
  h.values.REPAYX_SEND_ENABLED = 'false';
  assert.equal(h.run(h.envelope()).status,'disabled');
  assert.equal(h.sent.length,0);
});

test('quota and lock reject before sending; later safe retry is allowed', () => {
  const h = harness(); h.state.quota=0;
  assert.equal(h.run(h.envelope()).status,'quota_exceeded');
  h.state.quota=10; h.state.busy=true;
  assert.equal(h.run(h.envelope()).status,'busy');
  h.state.busy=false;
  assert.equal(h.run(h.envelope()).status,'accepted');
  h.values.REPAYX_DAILY_LIMIT='1';
  assert.equal(h.run(h.envelope({...h.payload,request_id:'c'.repeat(64)})).status,'quota_exceeded');
  assert.equal(h.sent.length,1);
});

test('uncertain MailApp failure is never resent and provider error is not exposed', () => {
  const h = harness(); h.state.throwOnSend=true;
  assert.equal(h.run(h.envelope()).status,'unknown');
  h.state.throwOnSend=false;
  assert.equal(h.run(h.envelope()).status,'unknown');
  assert.equal(h.sent.length,1);
});

test('full permanent ledger fails closed rather than deleting idempotency receipts', () => {
  const h = harness();
  for(let i=0;i<1000;i++) h.values['receipt:'+i]='{}';
  assert.equal(h.run(h.envelope()).status,'ledger_full');
  assert.equal(h.sent.length,0);
});

test('multiple allowlisted recipients each get an independent receipt', () => {
  const h = harness();
  assert.equal(h.run(h.envelope()).status,'accepted');
  assert.equal(h.run(h.envelope({...h.payload, request_id:'c'.repeat(64),recipient:'two@example.invalid'})).status,'accepted');
  assert.equal(h.sent.length,2);
});
