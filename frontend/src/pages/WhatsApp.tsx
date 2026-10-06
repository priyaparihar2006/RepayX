import React, { useEffect, useRef, useState } from 'react';
import { MessageSquare, RefreshCw, Send } from 'lucide-react';
import { whatsapp, type WhatsAppStatus, type WhatsAppContact, type WhatsAppTemplate, type WhatsAppHistory } from '../services/whatsapp';

const timestamp = (value: string) => new Date(value).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
const errorText = (e: unknown) => e instanceof Error ? e.message : 'The request could not be completed.';
const inputClass = 'w-full mt-1 rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white';
const buttonClass = 'inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm text-white disabled:opacity-40 disabled:cursor-not-allowed';

export const WhatsAppPage: React.FC = () => {
  const [status, setStatus] = useState<WhatsAppStatus>();
  const [keyDraft, setKeyDraft] = useState('');
  const [key, setKey] = useState('');
  const [contacts, setContacts] = useState<WhatsAppContact[]>([]);
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [history, setHistory] = useState<WhatsAppHistory>();
  const [recipient, setRecipient] = useState('');
  const [templateIndex, setTemplateIndex] = useState('0');
  const [parameters, setParameters] = useState<string[]>([]);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [attempted, setAttempted] = useState(false);
  const pending = useRef(false);
  const requestId = useRef<string | null>(null);
  const template = templates[Number(templateIndex)];
  const preview = template?.body.replace(/{{(\d+)}}/g, (match, index) => parameters[Number(index) - 1] || match) ?? '';
  const contact = contacts.find((c) => c.phone === recipient);
  const today = new Date().toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'long', year: 'numeric' });

  useEffect(() => {
    const controller = new AbortController();
    whatsapp.status(controller.signal).then(setStatus).catch((e) => { if (!controller.signal.aborted) setError(errorText(e)); });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!key) return;
    let disposed = false;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try {
        const result = await whatsapp.history(key, controller.signal);
        if (!disposed) setHistory(result);
      } catch (e) { if (!disposed) setError(errorText(e)); }
      if (!disposed) timer = setTimeout(poll, 5000);
    };
    void poll();
    return () => { disposed = true; controller.abort(); clearTimeout(timer); };
  }, [key]);

  const connect = async () => {
    setConnecting(true); setError('');
    try {
      const [configuration, recipients, availableTemplates, messages] = await Promise.all([
        whatsapp.status(), whatsapp.contacts(keyDraft), whatsapp.templates(keyDraft), whatsapp.history(keyDraft),
      ]);
      setStatus(configuration); setContacts(recipients.contacts); setTemplates(availableTemplates.templates); setHistory(messages);
      setKey(keyDraft); setKeyDraft('');
    } catch (e) { setError(errorText(e)); }
    finally { setConnecting(false); }
  };

  const resetDraft = () => { requestId.current = null; setAttempted(false); setConfirmed(false); setNotice(''); };
  const send = async () => {
    if (pending.current || !confirmed || !template || !contact?.opted_in || attempted) return;
    pending.current = true; setBusy(true); setError(''); setNotice('');
    requestId.current ??= crypto.randomUUID();
    try {
      const response = await whatsapp.send(key, { request_id: requestId.current, recipient,
        template: template.name, language: template.language, parameters, preview, confirm_send: true });
      setNotice(response.status === 'accepted'
        ? 'Meta accepted the message. Delivery is not yet confirmed; watch the history below.'
        : `Message status: ${response.status}. Check the history before composing another message.`);
    } catch (e) { setError(errorText(e)); }
    finally {
      setAttempted(true); setConfirmed(false); setBusy(false); pending.current = false;
      try { setHistory(await whatsapp.history(key)); } catch { /* Polling reports connection failures. */ }
    }
  };

  return <div className="max-w-5xl mx-auto space-y-6">
    <div><h1 className="text-2xl font-bold flex items-center gap-2"><MessageSquare className="text-emerald-600" /> WhatsApp Messages</h1>
      <p className="mt-2 text-sm text-slate-500">{today} · India time (IST). Send reviewed messages to configured contacts and track delivery receipts.</p></div>

    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm space-y-2">
      <p className="font-semibold">{status?.test_mode !== false ? 'Test mode: neutral hello_world message only' : 'Approved templates and opted-in contacts only'}</p>
      <p>The portfolio contains historical, anonymized data. Demo names and phone numbers are not messaging contacts, and model risk is not proof of a current overdue balance.</p>
      <p>WhatsApp restricts debt collection. Confirm the permitted use with your provider before customer outreach. <a className="underline" href="https://whatsappbusiness.com/policy/" target="_blank" rel="noreferrer">WhatsApp policy</a></p>
    </div>

    <section className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
      <h2 className="font-semibold">Connection</h2>
      <p>{status?.ready ? 'Sending enabled' : 'Setup required - no messages can be sent yet'}</p>
      {!!status?.missing.length && <p className="text-sm text-slate-500">Configure in the backend .env: {status.missing.join(', ')}.</p>}
      {status && !status.enabled && <p className="text-sm text-slate-500">Enable WHATSAPP_ENABLED after completing sender setup.</p>}
      <p className="text-xs text-slate-500">Delivery updates require a public HTTPS webhook. {status?.webhook_configured ? 'Webhook secrets are configured; verify the callback in Meta.' : 'Webhook setup is pending.'}</p>
      {!key ? <form onSubmit={(e) => { e.preventDefault(); void connect(); }} className="flex flex-wrap items-end gap-3">
        <label className="flex-1 text-sm">Operator key<input className={inputClass} type="password" autoComplete="off" value={keyDraft} onChange={(e) => setKeyDraft(e.target.value)} /></label>
        <button className={buttonClass} disabled={!keyDraft || connecting}>{connecting ? 'Connecting...' : 'Open messaging'}</button>
      </form> : <button className="text-sm underline" disabled={busy} onClick={() => { setKey(''); setContacts([]); setTemplates([]); setHistory(undefined); setRecipient(''); setParameters([]); setTemplateIndex('0'); resetDraft(); }}>Lock messaging</button>}
      <p className="text-xs text-slate-500">Use the local WHATSAPP_OPERATOR_KEY here, never the Meta access token. The key stays in memory until you lock or reload this page.</p>
    </section>

    {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{error}</p>}
    {notice && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{notice}</p>}

    {key && <>
      <section className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
        <h2 className="font-semibold">Configured contacts</h2>
        <p className="text-xs text-slate-500">Roles are your contact labels. An admin contact does not become the WhatsApp sender or gain login access. Defaulter labels are not verified against loan records.</p>
        {contacts.map((c) => <div key={c.phone} className="flex flex-wrap justify-between gap-2 border-b border-slate-100 pb-2 text-sm">
          <div><span className="font-semibold capitalize">{c.role}</span> - {c.phone}<p className="text-xs text-slate-500">{c.name}</p></div>
          <span>{!c.opted_in ? 'Consent not recorded / opted out' : c.test_recipient ? 'Authorized test recipient' : 'Consent recorded'}</span>
        </div>)}
      </section>
      <section className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
        <h2 className="font-semibold">Compose and review</h2>
        {!contacts.length && <p>No contacts are configured. Add your verified test recipient in the local contacts file.</p>}
        <label className="block text-sm">Recipient<select className={inputClass} value={recipient} disabled={busy || attempted} onChange={(e) => { setRecipient(e.target.value); resetDraft(); }}>
          <option value="">Select a contact</option>{contacts.map((c) => <option key={c.phone} value={c.phone} disabled={!c.opted_in || (status?.test_mode && !c.test_recipient)}>{c.name} ({c.phone}){!c.opted_in ? ' - opted out / no consent' : ''}</option>)}
        </select></label>
        <label className="block text-sm">Template<select className={inputClass} value={templateIndex} disabled={busy || attempted} onChange={(e) => { setTemplateIndex(e.target.value); setParameters([]); resetDraft(); }}>
          {templates.map((t, i) => <option key={`${t.name}:${t.language}`} value={i}>{t.name} ({t.language})</option>)}
        </select></label>
        {!templates.length && <p>No supported approved templates found. This version supports text body and footer templates with numbered body parameters.</p>}
        {Array.from({ length: template?.parameters ?? 0 }, (_, i) => <label key={i} className="block text-sm">Value {i + 1}<input className={inputClass} maxLength={1024} disabled={busy || attempted} value={parameters[i] ?? ''} onChange={(e) => { setParameters((prev) => { const next = [...prev]; next[i] = e.target.value; return next; }); resetDraft(); }} /></label>)}
        <div className="rounded-xl bg-slate-50 border border-slate-200 p-4"><p className="text-xs text-slate-500 mb-2">Message preview</p><p className="whitespace-pre-wrap text-sm">{preview || 'Select a template.'}</p></div>
        <label className="flex gap-2 text-sm items-start"><input type="checkbox" checked={confirmed} disabled={busy || attempted} onChange={(e) => setConfirmed(e.target.checked)} />I have reviewed this recipient and message and want to send it now.</label>
        <button className={buttonClass} onClick={() => void send()} disabled={!status?.ready || !contact?.opted_in || !template || !confirmed || busy || attempted || Array.from({ length: template?.parameters ?? 0 }, (_, i) => parameters[i]?.trim()).some((v) => !v)}><Send className="w-4 h-4" />{busy ? 'Sending...' : 'Send WhatsApp message'}</button>
        {attempted && <button className="ml-3 underline text-sm" onClick={resetDraft}>Compose another message</button>}
      </section>

      <section className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
        <div className="flex justify-between items-center"><h2 className="font-semibold">Delivery history</h2><button className="text-sm flex items-center gap-1" onClick={() => whatsapp.history(key).then(setHistory).catch((e) => setError(errorText(e)))}><RefreshCw className="w-4 h-4" />Refresh</button></div>
        <p className="text-xs text-slate-500">Refreshes every 5 seconds. Accepted means Meta received the request; delivered and read require signed WhatsApp receipts. Unknown or sending may mean a send was interrupted: check Meta before composing another message.</p>
        {!history?.messages.length && <p className="text-sm text-slate-500">No send attempts recorded.</p>}
        {history?.messages.map((m) => <article key={m.request_id} className="border rounded-xl p-3 space-y-1 text-sm"><p className="font-semibold">{m.recipient} · {m.delivery_status}</p><p className="text-xs text-slate-500">{timestamp(m.created_at)} IST · {m.template}</p><p className="whitespace-pre-wrap">{m.preview}</p>{(m.delivery_error || m.error) && <p className="text-rose-700">{m.delivery_error || m.error}</p>}</article>)}
      </section>
      <section className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3"><h2 className="font-semibold">Incoming replies</h2>
        {!history?.incoming.length && <p className="text-sm text-slate-500">No replies received. Configure the messages webhook to receive replies here.</p>}
        {history?.incoming.map((m) => <article key={m.provider_id} className="rounded-xl border p-3 text-sm"><p className="font-semibold">{m.sender}</p><p className="text-xs text-slate-500">{timestamp(m.received_at)} IST</p><p className="whitespace-pre-wrap">{m.text}</p></article>)}
      </section>
    </>}
  </div>;
};
