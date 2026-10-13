/* RepayX MailApp bridge. No triggers: the RepayX worker owns scheduling.
 * Configure Script Properties; never put secrets in this source or log requests.
 */
function reply_(status, requestId) {
  return ContentService.createTextOutput(JSON.stringify({status: status, request_id: requestId || null}))
    .setMimeType(ContentService.MimeType.JSON);
}

function hex_(bytes) {
  return bytes.map(function(b) { return ('0' + ((b + 256) % 256).toString(16)).slice(-2); }).join('');
}

function equal_(a, b) {
  if (typeof a !== 'string' || a.length !== b.length) return false;
  var diff = 0;
  for (var i = 0; i < b.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function escape_(value) {
  return value.replace(/[&<>"']/g, function(c) { return {'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]; });
}

function template_(p) {
  var lines = ['Hello ' + p.name + ',', '', 'This is a reminder regarding your upcoming EMI payment.', '',
    'Loan ID: ' + p.loan_id, 'EMI Amount: ' + p.amount, 'Due Date: ' + p.due_date, '',
    'Please complete your payment by the due date if it is still pending.', '',
    'If you have already paid, please disregard this reminder.', '', 'Regards,', 'RepayX Team'];
  return {to: p.recipient, subject: 'RepayX — EMI Payment Reminder', body: lines.join('\n'),
    htmlBody: '<div style="font-family:Arial,sans-serif;color:#0f172a;line-height:1.6">' +
      lines.map(function(line) { return escape_(line); }).join('<br>') + '</div>', name: 'RepayX Team'};
}

function doGet() { return reply_('method_not_allowed'); }

function doPost(e) {
  var id = null;
  var lock = null;
  try {
    if (!e || !e.postData || typeof e.postData.contents !== 'string' || e.postData.contents.length > 10000)
      return reply_('invalid_request');
    var envelope = JSON.parse(e.postData.contents);
    var props = PropertiesService.getScriptProperties();
    var secret = props.getProperty('REPAYX_SHARED_SECRET') || '';
    if (secret.length < 32 || typeof envelope.payload !== 'string' ||
        !/^\d{10}$/.test(envelope.timestamp) || !/^[a-f0-9]{32}$/.test(envelope.nonce) ||
        Math.abs(Date.now() / 1000 - Number(envelope.timestamp)) > 300)
      return reply_('unauthorized');
    var signed = envelope.timestamp + '\n' + envelope.nonce + '\n' + envelope.payload;
    var expected = hex_(Utilities.computeHmacSha256Signature(signed, secret, Utilities.Charset.UTF_8));
    if (!equal_(envelope.signature, expected)) return reply_('unauthorized');
    var p = JSON.parse(envelope.payload);
    if (typeof p.request_id !== 'string' || !/^[a-f0-9]{64}$/.test(p.request_id)) return reply_('invalid_request');
    id = p.request_id;
    if (typeof p.recipient !== 'string' || p.recipient.length > 254 ||
        !/^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/.test(p.recipient) ||
        !['name','loan_id','amount','due_date'].every(function(k) {
          return typeof p[k] === 'string' && p[k].length > 0 && p[k].length <= 200 && !/[\r\n\x00]/.test(p[k]);
        })) return reply_('invalid_request', id);
    p.recipient = p.recipient.toLowerCase();
    var allowed = (props.getProperty('REPAYX_ALLOWED_RECIPIENTS') || '').toLowerCase().split(',').map(function(s) { return s.trim(); }).filter(Boolean);
    if (allowed.indexOf(p.recipient) < 0) return reply_('recipient_not_allowlisted', id);
    if (props.getProperty('REPAYX_SEND_ENABLED') !== 'true') return reply_('disabled', id);
    lock = LockService.getScriptLock();
    if (!lock.tryLock(1000)) { lock = null; return reply_('busy', id); }
    var key = 'receipt:' + id;
    var fingerprint = hex_(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, envelope.payload, Utilities.Charset.UTF_8));
    var prior = props.getProperty(key);
    if (prior) {
      var receipt = JSON.parse(prior);
      if (receipt.fingerprint !== fingerprint) return reply_('invalid_request', id);
      return reply_(receipt.status === 'accepted' ? 'accepted' : 'unknown', id);
    }
    // Permanent tombstones: never evict an idempotency receipt to reclaim quota.
    var all = props.getProperties();
    if (Object.keys(all).filter(function(k) { return k.indexOf('receipt:') === 0; }).length >= 1000)
      return reply_('ledger_full', id);
    var budget = Number(props.getProperty('REPAYX_DAILY_LIMIT') || '5');
    if (!Number.isInteger(budget) || budget < 1 || budget > 100) return reply_('disabled', id);
    var today = new Date().toISOString().slice(0, 10);
    var counter = JSON.parse(props.getProperty('daily_budget') || '{}');
    var count = counter.day === today ? Number(counter.count) : 0;
    if (!Number.isFinite(count) || count < 0) return reply_('disabled', id);
    if (count >= budget || MailApp.getRemainingDailyQuota() < 1) return reply_('quota_exceeded', id);
    // Reserve before the call. A crash/exception leaves unknown, never an automatic resend.
    props.setProperty(key, JSON.stringify({status:'sending', fingerprint:fingerprint, at:new Date().toISOString()}));
    props.setProperty('daily_budget', JSON.stringify({day:today, count:count + 1}));
    MailApp.sendEmail(template_(p));
    props.setProperty(key, JSON.stringify({status:'accepted', fingerprint:fingerprint, at:new Date().toISOString()}));
    return reply_('accepted', id); // Not an inbox delivery confirmation.
  } catch (_) {
    return reply_(id ? 'unknown' : 'invalid_request', id);
  } finally {
    if (lock) lock.releaseLock();
  }
}

// Run manually once in the editor to grant MailApp permissions; does NOT send.
function authorizeRepayX() { MailApp.getRemainingDailyQuota(); }
