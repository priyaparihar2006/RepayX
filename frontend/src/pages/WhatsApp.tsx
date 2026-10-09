import { useEffect, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, Clock, LogOut, QrCode, RefreshCw, Send, Smartphone } from 'lucide-react';
import { whatsapp, type DemoContact, type WhatsAppHistoryItem, type WhatsAppStatus } from '../services/whatsapp';

type Draft = DemoContact & { requestId: string; result: string; error: string };
const sender = '+918650629360';
const messageOf = (error: unknown) => error instanceof Error ? error.message : 'The request failed.';
const button = 'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed';

export function WhatsAppPage() {
  const [status, setStatus] = useState<WhatsAppStatus | null>(null);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [history, setHistory] = useState<WhatsAppHistoryItem[]>([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [pairCode, setPairCode] = useState('');
  const [pairing, setPairing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);
  const sendingRef = useRef(false);
  const [qrDeadline, setQrDeadline] = useState(0);
  const [now, setNow] = useState(Date.now());

  const acceptStatus = (value: WhatsAppStatus) => {
    setStatus(value);
    setQrDeadline(value.qr_code ? Date.now() + (value.qr_expires_in || 0) * 1000 : 0);
    if (value.connected) setPairCode('');
  };
  const refreshHistory = async () => {
    try { setHistory((await whatsapp.getMessages()).messages); }
    catch (err) { setError(messageOf(err)); }
  };
  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    let pollTimer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try {
        const value = await whatsapp.getStatus(controller.signal);
        if (!cancelled) acceptStatus(value);
      } catch {
        if (!cancelled) {
          setStatus(null);
          setQrDeadline(0);
        }
      } finally {
        if (!cancelled) pollTimer = setTimeout(() => void poll(), 2000);
      }
    };
    void poll();
    void whatsapp.getContacts().then(value => {
      if (!cancelled) setDrafts(value.contacts.map(contact => ({
        ...contact, message: typeof contact.message === 'string' ? contact.message : '',
        requestId: crypto.randomUUID(), result: '', error: '',
      })));
    }).catch(err => { if (!cancelled) setError(messageOf(err)); });
    void whatsapp.getMessages().then(value => {
      if (!cancelled) setHistory(value.messages);
    }).catch(err => { if (!cancelled) setError(messageOf(err)); });
    const ticker = setInterval(() => setNow(Date.now()), 1000);
    return () => { cancelled = true; controller.abort(); clearTimeout(pollTimer); clearInterval(ticker); };
  }, []);

  const connected = !!status?.connected;
  const correctSender = connected && status?.session_info?.phone_number === sender;
  const qrRemaining = Math.max(0, Math.ceil((qrDeadline - now) / 1000));
  const qrVisible = !!status?.qr_code && qrRemaining > 0 && !connected;
  const pending = drafts.filter(draft => !draft.result);
  const canSend = correctSender && !sending && pending.length > 0 && pending.every(draft => draft.message?.trim());

  async function generateQR() {
    setGenerating(true); setError('');
    try {
      await whatsapp.generateQR();
      acceptStatus(await whatsapp.getStatus());
      setNotice('Open WhatsApp on +91 8650629360 → Linked devices → Link a device, then scan the QR.');
    } catch (err) { setError(messageOf(err)); }
    finally { setGenerating(false); }
  }
  async function requestPairCode() {
    setPairing(true); setError(''); setPairCode('');
    try { setPairCode((await whatsapp.pairByCode()).pairing_code); }
    catch (err) { setError(messageOf(err)); }
    finally { setPairing(false); }
  }
  async function disconnect() {
    setError('');
    try { await whatsapp.disconnect(); acceptStatus(await whatsapp.getStatus()); setPairCode(''); }
    catch (err) { setError(messageOf(err)); }
  }
  function edit(phone: string, message: string) {
    setDrafts(previous => previous.map(draft => draft.phone === phone
      ? { ...draft, message, requestId: crypto.randomUUID(), result: '', error: '' } : draft));
  }
  async function sendDrafts(targets: Draft[]) {
    if (sendingRef.current || !correctSender || !targets.length) return;
    sendingRef.current = true;
    setSending(true); setError(''); setNotice('');
    let sent = 0;
    try {
      for (const draft of targets) {
        if (!draft.message?.trim() || draft.result) continue;
        setDrafts(previous => previous.map(item => item.phone === draft.phone ? { ...item, result: 'sending', error: '' } : item));
        let result = 'unknown';
        let detail = '';
        try {
          const response = await whatsapp.sendMessage({
            request_id: draft.requestId, recipient: draft.phone, customer_name: draft.name,
            customer_id: draft.customer_id, message: draft.message, template_name: 'manager_demo',
          });
          result = response.status;
          detail = response.error_message || '';
          if (result === 'sent') sent++;
        } catch (err) {
          detail = messageOf(err) + ' Check WhatsApp before trying again; this message will not retry automatically.';
        }
        setDrafts(previous => previous.map(item => item.phone === draft.phone
          ? { ...item, result, error: detail } : item));
      }
      setNotice(sent + ' of ' + targets.length + ' message(s) confirmed sent by WhatsApp. Sent does not mean delivered or read.');
      await refreshHistory();
    } finally { sendingRef.current = false; setSending(false); }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-12">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">WhatsApp Messages</h1>
          <p className="mt-1 text-sm text-slate-500">Link your account, edit each EMI notice, and send to your three demo recipients.</p>
        </div>
        <span role="status" className={'rounded-full border px-3 py-1.5 text-xs font-semibold ' + (connected ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-800')}>
          {connected ? 'WhatsApp linked' : status?.status === 'CONNECTING' ? 'Connecting to WhatsApp…' : 'WhatsApp not linked'}
        </span>
      </header>
      {error && <div role="alert" className="flex gap-2 rounded-xl bg-rose-50 p-4 text-sm text-rose-800"><AlertCircle className="h-5 w-5 shrink-0" />{error}</div>}
      {notice && <div role="status" className="rounded-xl bg-blue-50 p-4 text-sm text-blue-800">{notice}</div>}

      <div className="grid items-start gap-6 lg:grid-cols-[360px_1fr]">
        <section className="space-y-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="flex items-center gap-2 text-lg font-bold"><QrCode className="h-5 w-5 text-emerald-600" /> Link WhatsApp</h2>
          <div className="rounded-xl bg-slate-50 p-3 text-sm">
            <p className="text-slate-500">Send from</p>
            <p className="font-semibold">+91 8650629360</p>
          </div>
          {connected ? (
            <div className="space-y-3">
              <CheckCircle2 className="h-9 w-9 text-emerald-600" />
              <p className="font-semibold">{status?.session_info?.user_name}</p>
              <p className="font-mono text-sm">{status?.session_info?.phone_number}</p>
              {!correctSender && <p role="alert" className="text-sm text-rose-700">This is a different account. Disconnect it and link +91 8650629360 to send.</p>}
              <button className={button + ' bg-slate-100 text-slate-700'} disabled={sending} onClick={() => void disconnect()}><LogOut className="h-4 w-4" />Disconnect</button>
            </div>
          ) : (
            <>
              <div className="flex min-h-64 flex-col items-center justify-center rounded-2xl border bg-slate-50 p-3">
                {qrVisible ? (
                  <><img src={status?.qr_code || ''} alt="Scan this live WhatsApp pairing QR code" className="w-full max-w-72 rounded-lg" />
                    <p className="mt-2 text-xs text-slate-500">QR refreshes automatically · {qrRemaining}s</p></>
                ) : (
                  <div className="space-y-3 p-5 text-center text-sm text-slate-500">
                    <Smartphone className="mx-auto h-10 w-10 text-slate-400" />
                    <p>{status?.status === 'CONNECTING' ? 'Waiting for WhatsApp to provide a QR code…' : 'Generate a live QR code to connect your phone.'}</p>
                  </div>
                )}
              </div>
              {status?.error_message && <p role="alert" className="text-sm text-rose-700">{status.error_message}</p>}
              {!status && <p className="text-sm text-amber-700">Waiting for the backend…</p>}
              <ol className="list-decimal space-y-2 pl-5 text-sm text-slate-600">
                <li>Open WhatsApp for <strong>8650629360</strong> on your phone.</li>
                <li>Open <strong>Linked devices → Link a device</strong>.</li>
                <li>Scan this QR. The connection status updates automatically.</li>
              </ol>
              <button onClick={() => void generateQR()} disabled={generating || pairing} className={button + ' w-full bg-emerald-600 text-white'}>
                <RefreshCw className={'h-4 w-4 ' + (generating ? 'animate-spin' : '')} />{generating ? 'Connecting…' : 'Generate / refresh QR'}
              </button>
              <button onClick={() => void requestPairCode()} disabled={pairing || generating || !status?.ready} className={button + ' w-full bg-slate-100 text-slate-700'}>
                {pairing ? 'Requesting code…' : 'Link with phone number instead'}
              </button>
              {pairCode && <div role="status" className="space-y-2 rounded-xl bg-blue-50 p-4 text-sm text-blue-900">
                <p>On your phone, choose <strong>Link with phone number instead</strong> and enter:</p>
                <p className="text-center font-mono text-2xl font-bold tracking-widest">{pairCode}</p>
              </div>}
            </>
          )}
        </section>

        <section className="space-y-5">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold">EMI message editor</h2>
            <p className="mt-1 text-sm text-slate-500">Nancy, Sid, and Ajay · +91 India · Sample loan details for your manager demonstration.</p>
            <p className="mt-2 text-xs text-slate-500">Review each full message below. The payment links are sample text supplied for the demo.</p>
            <button onClick={() => void sendDrafts(pending)} disabled={!canSend} className={button + ' mt-5 w-full bg-emerald-600 text-white hover:bg-emerald-700'}>
              <Send className="h-4 w-4" />{sending ? 'Sending messages…' : 'Send all pending messages (' + pending.length + ')'}
            </button>
            {!correctSender && <p className="mt-2 text-center text-xs text-slate-500">Link +91 8650629360 to enable sending.</p>}
          </div>

          {drafts.map(draft => (
            <article key={draft.phone} className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div><h3 className="font-bold text-slate-900">{draft.name}</h3><p className="font-mono text-sm text-slate-500">{draft.phone}</p></div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium">Sample loan #{draft.customer_id}</span>
              </div>
              <label className="block space-y-2 text-sm font-medium text-slate-700">
                <span>Message for {draft.name}</span>
                <textarea value={draft.message ?? ''} disabled={sending} maxLength={2000} rows={6} onChange={event => edit(draft.phone, event.target.value)}
                  className="w-full resize-y rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </label>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-slate-500">{draft.message?.length ?? 0}/2000 characters</p>
                <button disabled={!correctSender || sending || !draft.message?.trim() || !!draft.result}
                  onClick={() => void sendDrafts([draft])} className={button + ' bg-emerald-50 text-emerald-700 hover:bg-emerald-100'}>
                  <Send className="h-4 w-4" />Send to {draft.name}
                </button>
              </div>
              {draft.result && <p role="status" className={'text-sm font-medium ' + (draft.result === 'sent' ? 'text-emerald-700' : 'text-amber-800')}>
                {draft.result === 'sent' ? 'Sent — WhatsApp confirmed this send.' : draft.result === 'sending' ? 'Sending…' : 'Send status: ' + draft.result}
              </p>}
              {draft.error && <p role="alert" className="text-sm text-rose-700">{draft.error}</p>}
            </article>
          ))}
          {!drafts.length && <p className="p-6 text-sm text-slate-500">Loading demo recipients…</p>}
        </section>
      </div>

      <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-bold"><Clock className="h-5 w-5 text-slate-500" />Message history</h2>
          <button onClick={() => void refreshHistory()} className={button + ' bg-slate-100'} aria-label="Refresh message history"><RefreshCw className="h-4 w-4" /></button>
        </div>
        <p className="text-xs text-slate-500">Sent means WhatsApp accepted the message; delivery and read receipts are not tracked. Older simulated records are labelled.</p>
        {history.length === 0 && <p className="text-sm text-slate-500">No messages yet.</p>}
        {history.slice(0, 12).map(item => (
          <div key={item.request_id} className="space-y-2 rounded-xl border border-slate-100 bg-slate-50 p-4 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-semibold">{item.customer_name || item.recipient} <span className="font-normal text-slate-500">{item.recipient}</span></p>
              <span className={'rounded-full px-2 py-1 text-xs font-semibold ' + (item.status === 'sent' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700')}>{item.status}</span>
            </div>
            <p className="whitespace-pre-wrap text-slate-600">{item.message_preview}</p>
            {item.error_message && <p className="text-rose-700">{item.error_message}</p>}
            <p className="text-xs text-slate-400">{new Date(item.sent_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST</p>
          </div>
        ))}
      </section>
    </div>
  );
}
export default WhatsAppPage;
