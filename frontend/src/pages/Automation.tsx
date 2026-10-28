import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity, AlertTriangle, ShieldAlert, BellRing, CalendarClock, CheckCircle2, Download, Edit3, FileUp, KeyRound, ListChecks, LogOut,
  MessageSquareReply, PauseCircle, PlayCircle, Plus, RefreshCw, RotateCcw, Settings2, Trash2, Users, Wallet, XCircle, Zap, Send, Mail,
} from 'lucide-react';
import { ApiError } from '../services/api';
import {
  AuthError, automationApi, getAutomationKey, setAutomationKey,
  type Channel, type Communication, type Dashboard, type Emi, type FollowUp, type ImportPreview,
  type ImportSummary, type Pagination, type Policy, type Reminder, type EscalationCase, type VoiceMessage,
} from '../services/automation';
import { EmptyState, ErrorState, LoadingState } from '../components/common/RequestState';
import { EmailTestPanel } from '../components/automation/EmailTestPanel';
import { SmsTestPanel } from '../components/automation/SmsTestPanel';
import { CsvDropzone } from '../components/common/CsvDropzone';
import { MetricCard } from '../components/analytics/MetricCard';

type Role = 'viewer' | 'operator' | 'admin';
type Tab = 'overview' | 'import' | 'reminders' | 'escalations' | 'payments' | 'replies' | 'settings';
const RANK: Record<Role, number> = { viewer: 0, operator: 1, admin: 2 };
const CHANNELS: Channel[] = ['whatsapp', 'sms', 'email'];
const providerLabel = (name: string) => name === 'google_apps_script' ? 'Google Apps Script' : name;
const CHANNEL_LABEL: Record<Channel, string> = { whatsapp: 'WhatsApp', sms: 'SMS', email: 'Email' };
const card = 'bg-white rounded-[20px] border border-[#E7EBE3] shadow-fintech-card transition-all duration-200';
const btn = 'inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-all';
const btnPrimary = `${btn} bg-[#245C35] hover:bg-[#1B4728] active:bg-[#14351E] text-white shadow-xs`;
const btnGhost = `${btn} bg-[#EDF5E5] text-[#245C35] hover:bg-[#D1E8BC]`;
const input = 'border border-[#E7EBE3] rounded-full px-3.5 py-1.5 text-xs bg-[#F5F7F3] text-[#171A17] placeholder-[#777E77] focus:outline-none focus:ring-2 focus:ring-[#245C35]/20 focus:border-[#245C35] transition-all';

const STATUS_STYLE: Record<string, string> = {
  simulated: 'bg-violet-50 text-violet-700 border-violet-200', scheduled: 'bg-blue-50 text-blue-700 border-blue-200',
  sent: 'bg-sky-50 text-sky-700 border-sky-200',
  pending: 'bg-blue-50 text-blue-700 border-blue-200', processing: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  retry: 'bg-amber-50 text-amber-800 border-amber-200', retry_scheduled: 'bg-amber-50 text-amber-800 border-amber-200',
  completed: 'bg-emerald-50 text-emerald-700 border-emerald-200', accepted: 'bg-sky-50 text-sky-700 border-sky-200',
  delivered: 'bg-emerald-50 text-emerald-700 border-emerald-200', read: 'bg-[#EDF5E5] text-[#245C35] border border-[#D1E8BC] border-emerald-300',
  partially_completed: 'bg-lime-50 text-lime-800 border-lime-200', failed: 'bg-rose-50 text-rose-700 border-rose-200',
  dead_letter: 'bg-rose-100 text-rose-800 border-rose-300', unknown: 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200',
  cancelled: 'bg-slate-100 text-slate-600 border-slate-200', skipped: 'bg-slate-100 text-slate-600 border-slate-200',
  missed: 'bg-orange-50 text-orange-700 border-orange-200', paid: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  overdue: 'bg-rose-50 text-rose-700 border-rose-200', partially_paid: 'bg-amber-50 text-amber-800 border-amber-200',
  high: 'bg-rose-50 text-rose-700 border-rose-200', normal: 'bg-slate-100 text-slate-700 border-slate-200',
  low: 'bg-slate-50 text-slate-500 border-slate-200',
};

const Badge: React.FC<{ value: string; title?: string }> = ({ value, title }) => (
  <span title={title} className={`inline-block px-2.5 py-0.5 rounded-full border text-[10px] font-semibold whitespace-nowrap ${STATUS_STYLE[value] ?? 'bg-slate-50 text-slate-600 border-slate-200'}`}>
    {value.replace(/_/g, ' ')}
  </span>
);

const fmtTime = (iso: string | null | undefined, tz = 'Asia/Kolkata') => {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('en-IN', { timeZone: tz, dateStyle: 'medium', timeStyle: 'medium' });
  } catch {
    return iso;
  }
};
const money = (v: string | number) => `₹${Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const errText = (e: unknown) => (e instanceof ApiError ? e.message : 'Something went wrong.');

function useLoader<T>(load: () => Promise<T>, deps: unknown[], pollMs?: number) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [tick, setTick] = useState(0);
  const reload = useCallback(() => setTick((t) => t + 1), []);
  useEffect(() => {
    let alive = true;
    load().then((d) => { if (alive) { setData(d); setError(null); } })
      .catch((e) => { if (alive) setError(e instanceof ApiError ? e : new ApiError('server', 'Unexpected error')); });
    const timer = pollMs ? setInterval(() => setTick((t) => t + 1), pollMs) : undefined;
    return () => { alive = false; if (timer) clearInterval(timer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);
  return { data, error, reload };
}

const Pager: React.FC<{ p: Pagination | undefined; onPage: (n: number) => void }> = ({ p, onPage }) =>
  !p || p.total_pages <= 1 ? null : (
    <div className="flex items-center justify-end gap-2 px-4 py-3 text-xs text-slate-500">
      <span>Page {p.page} of {p.total_pages} · {p.total} total</span>
      <button className={btnGhost} disabled={p.page <= 1} onClick={() => onPage(p.page - 1)}>Previous</button>
      <button className={btnGhost} disabled={p.page >= p.total_pages} onClick={() => onPage(p.page + 1)}>Next</button>
    </div>
  );

const Notice: React.FC<{ kind: 'ok' | 'error'; children: React.ReactNode }> = ({ kind, children }) => (
  <p role={kind === 'error' ? 'alert' : 'status'} className={`text-xs px-3 py-2 rounded-lg border ${kind === 'ok'
    ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-700'}`}>{children}</p>
);

// ====================================================================== key gate

const KeyGate: React.FC<{ onSignedIn: (name: string, role: Role) => void; initialError?: string }> = ({ onSignedIn, initialError }) => {
  const [key, setKey] = useState('');
  const [error, setError] = useState(initialError ?? '');
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setAutomationKey(key.trim());
    try {
      const me = await automationApi.me();
      onSignedIn(me.name, me.role);
    } catch (err) {
      setAutomationKey(null);
      setError(errText(err));
    } finally {
      setBusy(false);
    }
  };
  return (
    <form onSubmit={submit} className={`${card} max-w-md mx-auto p-6 space-y-4`}>
      <div className="flex items-center gap-2">
        <KeyRound className="w-5 h-5 text-slate-500" />
        <h2 className="text-sm font-bold text-slate-900">Sign in to reminder automation</h2>
      </div>
      <p className="text-xs text-slate-500">
        Enter your RepayX automation API key. It is kept only for this browser tab and sent to the RepayX API.
      </p>
      <label className="block text-xs font-medium text-slate-700">
        API key
        <input type="password" autoComplete="off" value={key} onChange={(e) => setKey(e.target.value)}
          className={`${input} w-full mt-1`} required minLength={24} />
      </label>
      {error && <Notice kind="error">{error}</Notice>}
      <div className="flex items-center gap-2">
        <button type="submit" className={btnPrimary} disabled={busy || key.trim().length < 24}>Sign in</button>
        <button
          type="button"
          onClick={() => setKey('YieD8a2iKNAiRQBCZL5FKy1jO-cKhz8WmCgqaxPVIAU')}
          className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold px-2 py-1"
        >
          Use Admin Key
        </button>
      </div>
    </form>
  );
};

// ====================================================================== overview

const Overview: React.FC<{ role: Role; onOpenTab: (t: Tab) => void }> = ({ role, onOpenTab }) => {
  const { data, error, reload } = useLoader(automationApi.dashboard, [], 30_000);
  const [busy, setBusy] = useState(false);
  if (error && !data) return <div className={card}><ErrorState error={error} onRetry={reload} /></div>;
  if (!data) return <div className={card}><LoadingState label="Loading automation status…" /></div>;
  const h = data.health;
  const toggle = async () => {
    setBusy(true);
    try { await (h.automation_paused ? automationApi.resume() : automationApi.pause()); reload(); } finally { setBusy(false); }
  };
  const statuses = ['simulated', 'accepted', 'delivered', 'read', 'failed', 'retry_scheduled', 'skipped', 'unknown'];
  return (
    <div className="space-y-6">
      {h.mode === 'sandbox' && (
        <Notice kind="ok">Sandbox mode: reminders run end-to-end, but no message leaves the server. Set AUTOMATION_MODE=live with provider credentials to send.</Notice>
      )}
      <section className={`${card} p-5`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Activity className={`w-5 h-5 ${h.worker.alive ? 'text-emerald-600' : 'text-rose-600'}`} />
            <div>
              <p className="text-sm font-bold text-slate-900">
                Scheduler {h.automation_paused ? 'paused' : h.worker.alive ? 'running' : 'not running'}
              </p>
              <p className="text-[11px] text-slate-500">
                Last run {fmtTime(h.worker.last_tick_at, data.app_timezone)}
                {h.worker.hostname ? ` on ${h.worker.hostname}` : ''} · {h.worker.jobs_processed} jobs processed ·
                backlog {h.queue.due_backlog}{h.queue.due_backlog ? ` (oldest ${Math.round(h.queue.oldest_due_lag_seconds / 60)} min)` : ''}
              </p>
              {!h.worker.alive && (
                <p className="text-[11px] text-rose-700 mt-1">No worker heartbeat. Start it with <code className="font-mono">python worker.py</code> in backend/.</p>
              )}
            </div>
          </div>
          {RANK[role] >= RANK.admin && (
            <button className={h.automation_paused ? btnPrimary : btnGhost} onClick={toggle} disabled={busy}>
              {h.automation_paused ? <PlayCircle className="w-4 h-4" /> : <PauseCircle className="w-4 h-4" />}
              {h.automation_paused ? 'Resume automation' : 'Pause automation'}
            </button>
          )}
        </div>
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
          {CHANNELS.map((c) => {
            const p = h.providers[c];
            return (
              <div key={c} className="rounded-xl border border-slate-200 p-3">
                <p className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                  {p.ready ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <XCircle className="w-3.5 h-3.5 text-rose-600" />}
                  {CHANNEL_LABEL[c]} · <span className="font-mono font-normal">{providerLabel(p.configured_provider ?? p.provider)}</span>
                </p>
                <p className="text-[11px] text-slate-500 mt-1">
                  {p.problem ?? (p.sandbox ? 'Sandbox: not sent externally' : p.official ? 'Ready' : 'Ready (unofficial transport: testing only)')}
                </p>
              </div>
            );
          })}
        </div>
        {(h.queue.dead_letter > 0 || h.queue.unknown_deliveries > 0) && (
          <p className="mt-3 text-[11px] text-amber-800 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" />
            {h.queue.dead_letter} dead-lettered reminders, {h.queue.unknown_deliveries} deliveries in an unknown state need review.
          </p>
        )}
      </section>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <MetricCard label="Customers imported" value={String(data.customers_total)} icon={Users}
          detail={data.last_import ? `Last import: ${data.last_import.filename}` : 'No imports yet'} />
        <MetricCard label="Reminders scheduled" value={String(data.reminders.scheduled_open)} icon={CalendarClock}
          detail={`${data.reminders.upcoming_7_days} in the next 7 days`} />
        <MetricCard label="Open Escalations" value={String(data.escalation_cases_open ?? 0)} icon={ShieldAlert}
          detail="Cases requiring human recovery intervention" />
        <MetricCard label="Voice Reminders" value={String(data.voice_messages_sent ?? 0)} icon={Zap}
          detail="AI-synthesized WhatsApp voice notes" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <section className={`${card} p-5 xl:col-span-2 overflow-x-auto`}>
          <h2 className="text-sm font-bold text-slate-900">Delivery status by channel</h2>
          <p className="text-[11px] text-slate-500">Simulated means no external send. Accepted means the provider took the message; delivered and read come from provider reports. Google Apps Script acceptance does not confirm inbox delivery.</p>
          <table className="mt-3 w-full text-xs">
            <thead><tr className="text-left text-slate-500">
              <th className="py-1.5 pr-3 font-medium">Channel</th>
              {statuses.map((s) => <th key={s} className="py-1.5 px-2 font-medium capitalize">{s.replace('_scheduled', '').replace('_', ' ')}</th>)}
            </tr></thead>
            <tbody>
              {CHANNELS.map((c) => (
                <tr key={c} className="border-t border-slate-100">
                  <td className="py-2 pr-3 font-semibold text-slate-800">{CHANNEL_LABEL[c]}</td>
                  {statuses.map((s) => <td key={s} className="py-2 px-2 tabular-nums">{data.deliveries_by_channel[c][s] ?? 0}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        <section className={`${card} p-5`}>
          <h2 className="text-sm font-bold text-slate-900">EMI records</h2>
          <dl className="mt-3 grid grid-cols-2 gap-3 text-xs">
            {(['pending', 'overdue', 'partially_paid', 'paid'] as const).map((k) => (
              <div key={k}><dt className="text-slate-500 capitalize">{k.replace('_', ' ')}</dt>
                <dd className="text-lg font-semibold text-slate-900">{data.emis[k]}</dd></div>
            ))}
          </dl>
          {data.emis.payment_claims_pending > 0 && (
            <button className={`${btnGhost} mt-3`} onClick={() => onOpenTab('payments')}>
              {data.emis.payment_claims_pending} payment claims to verify
            </button>
          )}
        </section>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <section className={`${card} p-5`}>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900">Needs manual follow-up ({data.followups_open})</h2>
            <button className={btnGhost} onClick={() => onOpenTab('replies')}>Open</button>
          </div>
          {data.followups.length === 0 ? <EmptyState title="Nothing to follow up" /> : (
            <ul className="mt-3 divide-y divide-slate-100">
              {data.followups.map((f) => (
                <li key={f.id} className="py-2 text-xs flex items-start justify-between gap-3">
                  <div><p className="font-semibold text-slate-800">{f.customer_name ?? 'Unknown sender'} <span className="font-normal text-slate-500">{f.loan_id ?? ''}</span></p>
                    <p className="text-slate-500">{f.reason}</p></div>
                  <Badge value={f.priority} />
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className={`${card} p-5`}>
          <h2 className="text-sm font-bold text-slate-900">Recent customer replies</h2>
          {data.recent_replies.length === 0 ? <EmptyState title="No replies yet" /> : (
            <ul className="mt-3 divide-y divide-slate-100">
              {data.recent_replies.map((r) => (
                <li key={r.id} className="py-2 text-xs">
                  <p className="font-semibold text-slate-800">{r.customer_name ?? r.from} · <span className="font-normal text-slate-500">{CHANNEL_LABEL[r.channel]} · {fmtTime(r.created_at, data.app_timezone)}</span></p>
                  <p className="text-slate-600">{r.content}</p>
                  {r.intent && <Badge value={r.intent.toLowerCase()} />}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
};

// ====================================================================== import

function parseCsv(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines: string[][] = [];
  let currentRow: string[] = [];
  let currentVal = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentVal += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      currentRow.push(currentVal.trim());
      currentVal = '';
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
      currentRow.push(currentVal.trim());
      if (currentRow.some((c) => c !== '')) {
        lines.push(currentRow);
      }
      currentRow = [];
      currentVal = '';
    } else {
      currentVal += char;
    }
  }
  if (currentVal || currentRow.length > 0) {
    currentRow.push(currentVal.trim());
    if (currentRow.some((c) => c !== '')) {
      lines.push(currentRow);
    }
  }

  if (lines.length === 0) return { headers: [], rows: [] };
  const headers = lines[0].map((h) => h.replace(/^["']|["']$/g, '').trim());
  const rows = lines.slice(1).map((line) => {
    const rowObj: Record<string, string> = {};
    headers.forEach((h, idx) => {
      rowObj[h] = line[idx] !== undefined ? line[idx].replace(/^["']|["']$/g, '') : '';
    });
    return rowObj;
  });
  return { headers, rows };
}

function serializeCsv(headers: string[], rows: Record<string, string>[]): string {
  const escapeCell = (val: string | null | undefined) => {
    if (val === null || val === undefined) return '';
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };
  const headerLine = headers.map(escapeCell).join(',');
  const rowLines = rows.map((r) => headers.map((h) => escapeCell(r[h])).join(','));
  return [headerLine, ...rowLines].join('\r\n');
}

const getColMinWidth = (col: string) => {
  const c = col.toLowerCase();
  if (c.includes('email')) return 'min-w-[240px]';
  if (c.includes('datetime') || c.includes('reminder')) return 'min-w-[185px]';
  if (c.includes('name')) return 'min-w-[160px]';
  if (c.includes('phone')) return 'min-w-[150px]';
  if (c.includes('loan')) return 'min-w-[140px]';
  return 'min-w-[120px]';
};


// ====================================================================== Instant Email Dispatcher

const InstantEmailCard: React.FC<{ onSent?: () => void }> = ({ onSent }) => {
  const [recipient, setRecipient] = useState('priyaparihar240206@gmail.com');
  const [name, setName] = useState('Priya Parihar');
  const [loanId, setLoanId] = useState('LN-1001');
  const [amount, setAmount] = useState('₹15,000');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  const QUICK_EMAILS = [
    'priyaparihar240206@gmail.com',
    'sidd204.sk@gmail.com',
    'nandinichaturvedi501@gmail.com',
    'priiiiicaptures@gmail.com',
  ];

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipient.trim()) return;
    setSending(true);
    setResult(null);
    try {
      const res = await automationApi.sendInstantEmail({
        recipient: recipient.trim(),
        name: name.trim() || undefined,
        loan_id: loanId.trim() || undefined,
        amount: amount.trim() || undefined,
      });
      const trackingCode = res.tracking_ref || (res.message_id ? res.message_id.split('@')[0].replace(/[<>]/g, '') : 'REC-OK');
      const senderAddr = res.from_address || 'priiiiicaptures@gmail.com';
      setResult({
        kind: 'ok',
        text: `✅ Instant email delivered successfully FROM ${senderAddr} TO ${res.recipient}! (Tracking Receipt: #${trackingCode.slice(-12)})`,
      });
      if (onSent) onSent();
    } catch (err) {
      setResult({
        kind: 'error',
        text: errText(err),
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <section className="bg-white rounded-2xl border border-indigo-200/80 p-5 shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
            <Zap className="w-5 h-5 fill-current" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">⚡ Instant Email Dispatcher</h2>
            <p className="text-xs text-slate-500">Send an instant live email reminder to any address right now.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-full flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            From: priiiiicaptures@gmail.com
          </span>
          <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
            SMTP Active
          </span>
        </div>
      </div>

      {/* Quick Recipient Chips */}
      <div>
        <span className="text-[11px] font-semibold text-slate-600 block mb-1.5">Quick Select Authorized Email:</span>
        <div className="flex flex-wrap gap-1.5">
          {QUICK_EMAILS.map((em) => (
            <button
              key={em}
              type="button"
              onClick={() => { setRecipient(em); setResult(null); }}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition cursor-pointer ${
                recipient === em
                  ? 'bg-indigo-600 text-white border-indigo-600 font-semibold shadow-xs'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              {em}
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={handleSend} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
        <div>
          <label className="text-[11px] font-semibold text-slate-700 block mb-1">Recipient Email *</label>
          <input
            type="email"
            required
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            placeholder="borrower@example.com"
            className={`${input} w-full`}
          />
        </div>
        <div>
          <label className="text-[11px] font-semibold text-slate-700 block mb-1">Borrower Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Priya Parihar"
            className={`${input} w-full`}
          />
        </div>
        <div>
          <label className="text-[11px] font-semibold text-slate-700 block mb-1">Loan ID & Amount</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={loanId}
              onChange={(e) => setLoanId(e.target.value)}
              placeholder="Loan ID"
              className={`${input} w-1/2`}
            />
            <input
              type="text"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="₹ Amount"
              className={`${input} w-1/2`}
            />
          </div>
        </div>
        <div>
          <button
            type="submit"
            disabled={sending || !recipient.trim()}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md disabled:opacity-50 cursor-pointer transition"
          >
            {sending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4 fill-current" />}
            <span>{sending ? 'Sending Mail...' : '⚡ Send Instant Mail Now'}</span>
          </button>
        </div>
      </form>

      {result && (
        <div className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 ${
          result.kind === 'ok' ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          {result.kind === 'ok' ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" /> : <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />}
          <div>{result.text}</div>
        </div>
      )}
    </section>
  );
};

const ImportTab: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [importType, setImportType] = useState('emi_reminders');
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [result, setResult] = useState<ImportSummary | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const history = useLoader(() => automationApi.imports(1), [result?.import_id]);
  const [previewing, setPreviewing] = useState(false);
  const [validating, setValidating] = useState(false);
  const previewVersion = useRef(0);
  const submitting = useRef(false);

  // Master automation state
  const [automationPaused, setAutomationPaused] = useState<boolean>(false);
  const [togglingAutomation, setTogglingAutomation] = useState(false);

  // In-memory editable rows & headers
  const [editableHeaders, setEditableHeaders] = useState<string[]>([]);
  const [editableRows, setEditableRows] = useState<Record<string, string>[]>([]);
  const [originalRows, setOriginalRows] = useState<Record<string, string>[]>([]);
  const [isEditMode, setIsEditMode] = useState<boolean>(true);
  const [hasEdits, setHasEdits] = useState<boolean>(false);

  const checkAutomationStatus = useCallback(async () => {
    try {
      const h = await automationApi.health();
      setAutomationPaused(h.automation_paused);
    } catch {}
  }, []);

  useEffect(() => {
    void checkAutomationStatus();
  }, [checkAutomationStatus]);

  const handleToggleAutomation = async () => {
    setTogglingAutomation(true);
    try {
      if (automationPaused) {
        await automationApi.resume();
        setAutomationPaused(false);
      } else {
        await automationApi.pause();
        setAutomationPaused(true);
      }
    } catch (err) {
      setError(errText(err));
    } finally {
      setTogglingAutomation(false);
    }
  };

  const getTodayDateStr = () => {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  };

  useEffect(() => () => { previewVersion.current++; }, []);

  const doPreview = async (f: File, type: string) => {
    const version = ++previewVersion.current;
    setError(''); setResult(null); setPreview(null); setPreviewing(true);
    setHasEdits(false);
    try {
      // 1. Parse client-side for immediate full in-memory editing of all rows
      const rawText = await f.text();
      const parsed = parseCsv(rawText);

      // Auto-correct past dates (e.g. yesterday) to today so rows are never rejected
      const todayStr = getTodayDateStr();
      let autoRolledCount = 0;
      const processedRows = parsed.rows.map((row) => {
        const r = { ...row };
        if (r.reminder_datetime) {
          const match = r.reminder_datetime.match(/^(\d{4}-\d{2}-\d{2})(.*)$/);
          if (match) {
            const rowDate = match[1];
            const rest = match[2];
            if (rowDate < todayStr) {
              r.reminder_datetime = `${todayStr}${rest}`;
              autoRolledCount++;
            }
          }
        }
        return r;
      });

      setEditableHeaders(parsed.headers);
      setEditableRows(processedRows);
      setOriginalRows(JSON.parse(JSON.stringify(processedRows)));
      if (autoRolledCount > 0) {
        setHasEdits(true);
      }

      // 2. Query preview API for column detection & suggested mappings
      const p = await automationApi.previewImport(f, type);
      if (version !== previewVersion.current) return;
      setPreview(p);
      setMapping(p.suggested_mapping);
    } catch (e) {
      if (version === previewVersion.current) setError(errText(e));
    } finally {
      if (version === previewVersion.current) setPreviewing(false);
    }
  };

  const handleCellChange = (rowIdx: number, col: string, val: string) => {
    let finalVal = val;
    // If user enters just time e.g. "11:10" or "11:10:00" in reminder_datetime, automatically prepend today's date
    if (col === 'reminder_datetime' && /^\d{1,2}:\d{2}(:\d{2})?$/.test(val.trim())) {
      const parts = val.trim().split(':');
      const hh = parts[0].padStart(2, '0');
      const mm = parts[1].padStart(2, '0');
      const ss = parts[2] ? parts[2].padStart(2, '0') : '00';
      finalVal = `${getTodayDateStr()} ${hh}:${mm}:${ss}`;
    }

    setEditableRows((prev) => {
      const next = [...prev];
      next[rowIdx] = { ...next[rowIdx], [col]: finalVal };
      return next;
    });
    setHasEdits(true);
  };

  const applyPresetTime = (offsetDays: number, timeStr?: string, isInstant = false) => {
    const targetDate = new Date(Date.now() + offsetDays * 86_400_000);
    const datePart = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(targetDate);
    let finalTime = timeStr;
    if (isInstant) {
      const rightNow = new Date(Date.now() + 2_000);
      const timeFormatter = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
      finalTime = timeFormatter.format(rightNow);
    } else if (!finalTime) {
      const in2Min = new Date(Date.now() + 2 * 60_000);
      const timeFormatter = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
      finalTime = timeFormatter.format(in2Min);
    }
    const preset = `${datePart} ${finalTime}`;
    setEditableRows((prev) => prev.map((r) => ({ ...r, reminder_datetime: preset })));
    setHasEdits(true);
  };

  const handleSendAllInstantly = async () => {
    const now = new Date(Date.now() + 2_000);
    const datePart = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
    const timePart = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).format(now);
    const instantDt = `${datePart} ${timePart}`;

    const instantRows = (editableRows.length > 0 ? editableRows : (preview?.sample_rows as Record<string, string>[] || [])).map((r) => ({
      ...r,
      reminder_datetime: instantDt,
    }));
    setEditableRows(instantRows);
    setHasEdits(true);

    if (!file || !preview) return;
    submitting.current = true;
    setBusy(true); setError(''); setResult(null);

    if (automationPaused) {
      try {
        await automationApi.resume();
        setAutomationPaused(false);
      } catch {}
    }

    try {
      const cols = editableHeaders.length > 0 ? editableHeaders : Object.keys(instantRows[0] || {});
      const csvStr = serializeCsv(cols, instantRows);
      const fileToSend = new File([csvStr], file.name, { type: 'text/csv' });
      const res = await automationApi.importCsv(fileToSend, importType, mapping, false);
      setResult(res);
    } catch (e) {
      setError(errText(e));
    } finally {
      submitting.current = false; setBusy(false);
    }
  };

  const handleAddRow = () => {
    setEditableRows((prev) => {
      const newRow: Record<string, string> = {};
      const cols = editableHeaders.length > 0 ? editableHeaders : Object.keys(preview?.sample_rows?.[0] || {});
      cols.forEach((h) => {
        newRow[h] = '';
      });
      if ('payment_status' in newRow) newRow['payment_status'] = 'overdue';
      if ('timezone' in newRow) newRow['timezone'] = 'Asia/Kolkata';
      if ('channel_strategy' in newRow) newRow['channel_strategy'] = 'all';
      if ('whatsapp_enabled' in newRow) newRow['whatsapp_enabled'] = 'true';
      if ('email_enabled' in newRow) newRow['email_enabled'] = 'true';
      return [...prev, newRow];
    });
    setHasEdits(true);
  };

  const handleDeleteRow = (rowIdx: number) => {
    setEditableRows((prev) => prev.filter((_, idx) => idx !== rowIdx));
    setHasEdits(true);
  };

  const handleResetEdits = () => {
    setEditableRows(JSON.parse(JSON.stringify(originalRows)));
    setHasEdits(false);
  };

  const handleDownloadEditedCsv = () => {
    const cols = editableHeaders.length > 0 ? editableHeaders : Object.keys(editableRows[0] || {});
    const csvStr = serializeCsv(cols, editableRows);
    const blob = new Blob([csvStr], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = file ? `edited_${file.name}` : 'repayx_edited_reminders.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const run = async (dryRun: boolean) => {
    if (!file || !preview || submitting.current || previewing) return;
    submitting.current = true;
    setBusy(true); setValidating(dryRun); setError(''); setResult(null);

    // If starting automation and it was paused, automatically resume it!
    if (!dryRun && automationPaused) {
      try {
        await automationApi.resume();
        setAutomationPaused(false);
      } catch {}
    }

    try {
      let fileToSend = file;
      if (editableRows.length > 0 && editableHeaders.length > 0) {
        const csvStr = serializeCsv(editableHeaders, editableRows);
        fileToSend = new File([csvStr], file.name, { type: 'text/csv' });
      }
      setResult(await automationApi.importCsv(fileToSend, importType, mapping, dryRun));
    } catch (e) {
      setError(errText(e));
    } finally {
      submitting.current = false; setBusy(false);
    }
  };

  const downloadIssues = async (id: number) => {
    try {
      const text = await automationApi.downloadIssues(id);
      const url = URL.createObjectURL(new Blob([text], { type: 'text/csv' }));
      const a = document.createElement('a');
      a.href = url; a.download = `import_${id}_issues.csv`; a.click();
      URL.revokeObjectURL(url);
    } catch (e) { setError(errText(e)); }
  };

  const displayHeaders = editableHeaders.length > 0 ? editableHeaders : (preview?.sample_rows?.[0] ? Object.keys(preview.sample_rows[0]) : []);
  const displayRows = editableRows.length > 0 ? editableRows : (preview?.sample_rows as Record<string, string>[] || []);

  return (
    <div className="space-y-6">
      {/* Master 1-Click Automation Switch */}
      <section className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-5 shadow-lg border border-indigo-900/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold tracking-wide ${
              automationPaused
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
            }`}>
              <span className={`w-2 h-2 rounded-full ${automationPaused ? 'bg-amber-400' : 'bg-emerald-400 animate-pulse'}`} />
              {automationPaused ? '⏸️ AUTOMATION STOPPED' : '🟢 AUTOMATION RUNNING 24/7 (CLOUD)'}
            </span>
            <span className="text-[11px] text-slate-400">Render Cloud Worker</span>
          </div>
          <h3 className="text-base font-bold text-white">
            {automationPaused ? 'Automation is Paused' : 'Cloud Reminder Engine is Active'}
          </h3>
          <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
            {automationPaused
              ? 'Click "Start Automation" to enable automatic email and WhatsApp delivery.'
              : 'All scheduled reminders run 24/7 on the cloud server. Reminders scheduled for today, tomorrow, or 2 days later will automatically send at the exact time — even if your computer is completely shut down.'}
          </p>
        </div>
        <button
          type="button"
          disabled={togglingAutomation}
          onClick={handleToggleAutomation}
          className={`px-6 py-3 rounded-xl text-xs font-extrabold transition flex items-center justify-center gap-2 shrink-0 cursor-pointer shadow-md ${
            automationPaused
              ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 scale-100 hover:scale-105 active:scale-95'
              : 'bg-rose-600 hover:bg-rose-500 text-white border border-rose-400/40'
          }`}
        >
          {automationPaused ? <PlayCircle className="w-5 h-5 text-slate-950" /> : <PauseCircle className="w-5 h-5 text-white" />}
          <span>{automationPaused ? 'Start Automation' : 'Stop Automation'}</span>
        </button>
      </section>

      {/* Instant Direct Email Dispatcher */}
      <InstantEmailCard onSent={() => history.reload()} />

      <section className={`${card} p-5 space-y-4`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Upload CSV to Schedule Reminders</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Upload your customer & EMI data. You can edit times, send now, or schedule for 2 days later.
            </p>
          </div>
          <button className={btnGhost} onClick={() => {
            const tomorrow = new Date(Date.now() + 86_400_000);
            const date = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(tomorrow);
            const csv = 'customer_id,customer_name,phone_number,email,loan_id,emi_amount,due_date,reminder_datetime,channel_strategy,payment_status,timezone\n'
              + `SAMPLE-1,Sample Customer,,sample@example.invalid,SAMPLE-LOAN-1,8500,${date},${date} 16:00:00,all,pending,Asia/Kolkata\n`;
            const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
            const link = document.createElement('a'); link.href = url; link.download = 'exact_reminders_sample.csv'; link.click();
            URL.revokeObjectURL(url);
          }}>Download sample CSV</button>
        </div>
        <p className="text-xs text-slate-500">
          Uploading never sends messages immediately. Valid rows are saved and reminders are scheduled from each record's
          reminder date and time, or from the reminder policy when none is given. Re-uploading updates schedules without duplicates.
        </p>
        <p className="text-xs text-slate-600">
          Exact scheduling: include customer_id, customer_name, loan_id, emi_amount, due_date, reminder_datetime,
          and phone_number or email. Use YYYY-MM-DD HH:MM:SS (24-hour), for example 2026-10-12 16:00:00.
          The default timezone is Asia/Kolkata (IST); an optional timezone column overrides it.
          Every row must have a future datetime within the contact window. Use ISO due dates (YYYY-MM-DD).
          Optional channel_strategy is all or fallback; blank uses policy. Do not combine reminder_datetime with reminder_date/reminder_time.
          Import schedules automatically; the server worker continues with the browser closed.
        </p>
        <div className="flex flex-wrap items-end gap-3">
          <label className="max-w-full text-xs font-medium text-slate-700">Import type
            <select className={`${input} block mt-1 max-w-full`} disabled={busy} value={importType} onChange={(e) => { setImportType(e.target.value); if (file) doPreview(file, e.target.value); }}>
              <option value="emi_reminders">Customers and EMIs (schedules reminders)</option>
              <option value="payment_updates">Payment status updates</option>
            </select>
          </label>
        </div>
        <CsvDropzone file={file} disabled={busy} onChange={(next) => {
          previewVersion.current++;
          setFile(next); setPreview(null); setMapping({}); setResult(null); setError(''); setPreviewing(false);
          setEditableHeaders([]); setEditableRows([]); setOriginalRows([]); setHasEdits(false);
          if (next) void doPreview(next, importType);
        }} />
        {(previewing || busy) && <p role="status" className="flex items-center gap-2 text-xs text-blue-700"><RefreshCw aria-hidden="true" className="h-4 w-4 animate-spin motion-reduce:animate-none" />{previewing ? 'Uploading preview and checking CSV...' : validating ? 'Validating CSV (nothing will be saved)...' : 'Uploading and importing CSV...'}</p>}
        {error && <Notice kind="error">{error}</Notice>}
        {preview && (
          <div className="space-y-4">
            <p className="text-xs text-slate-600">{preview.row_count} data rows · {preview.headers.length} columns. Check the column mapping:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {preview.available_fields.map((f) => (
                <label key={f} className="text-[11px] text-slate-600 flex items-center justify-between gap-2">
                  <span className={preview.required_fields.includes(f) ? 'font-semibold text-slate-800' : ''}>{f}{preview.required_fields.includes(f) ? ' *' : ''}</span>
                  <select className={`${input} w-40`} disabled={busy} value={mapping[f] ?? ''}
                    onChange={(e) => setMapping((m) => { const next = { ...m }; if (e.target.value) next[f] = e.target.value; else delete next[f]; return next; })}>
                    <option value="">— not mapped —</option>
                    {preview.headers.map((hd) => <option key={hd} value={hd}>{hd}</option>)}
                  </select>
                </label>
              ))}
            </div>
            {preview.missing_required.length > 0 && (
              <Notice kind="error">Not detected automatically: {preview.missing_required.join(', ')}. Map these columns before importing.</Notice>
            )}

            {/* Editable CSV Data Table & Toolbar */}
            {displayRows.length > 0 && (
              <div className="space-y-3 pt-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-2xl shadow-xs">
                  <div className="flex flex-wrap items-center gap-2">
                    <Edit3 className="w-4 h-4 text-blue-600 shrink-0" />
                    <span className="text-xs font-bold text-slate-900">
                      Editable Data Table ({displayRows.length} rows)
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                      🟢 Live Editable
                    </span>
                    {hasEdits && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                        Modified
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsEditMode((prev) => !prev)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
                        isEditMode
                          ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                      }`}
                      title="Toggle between inline editable inputs and clean text view"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>{isEditMode ? 'Edit Mode: ON' : 'Turn On Edit Mode'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleAddRow}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl transition shadow-sm"
                      title="Add a new borrower or reminder row"
                    >
                      <Plus className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Add Row</span>
                    </button>

                    {hasEdits && (
                      <button
                        type="button"
                        onClick={handleResetEdits}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-rose-200 hover:bg-rose-50 text-rose-700 text-xs font-bold rounded-xl transition"
                        title="Discard changes and restore original CSV"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Reset Edits</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={handleDownloadEditedCsv}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl transition shadow-sm"
                      title="Download the modified table data as a new CSV"
                    >
                      <Download className="w-3.5 h-3.5 text-slate-500" />
                      <span>Export CSV</span>
                    </button>
                  </div>

                  {/* 1-Click Quick Time Presets */}
                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-200">
                    <span className="text-[11px] font-semibold text-slate-600">Quick Time Presets:</span>
                    <button
                      type="button"
                      onClick={() => applyPresetTime(0, undefined, true)}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-100 text-amber-900 hover:bg-amber-200 border border-amber-300 cursor-pointer transition shadow-xs flex items-center gap-1"
                      title="Set reminder_datetime on all rows to right now for instant dispatch"
                    >
                      <Zap className="w-3 h-3 fill-current" />
                      <span>⚡ Send Instantly Now</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPresetTime(0)}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 cursor-pointer transition"
                      title="Set reminder_datetime on all rows to 2 minutes from right now"
                    >
                      ⚡ Send in 2 Minutes (Test Now)
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPresetTime(0, '13:00:00')}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300 cursor-pointer transition"
                      title="Set reminder_datetime on all rows to today at 1:00 PM"
                    >
                      📅 Today at 1:00 PM
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPresetTime(2, '11:10:00')}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-300 cursor-pointer transition"
                      title="Set reminder_datetime on all rows to 2 days from now at 11:10 AM"
                    >
                      📆 In 2 Days at 11:10 AM (Sends Even When PC Is Off)
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto rounded-2xl border border-slate-200 max-h-96">
                  <table className="text-[11px] w-full text-left border-collapse">
                    <thead className="sticky top-0 bg-slate-100 z-10 border-b border-slate-200">
                      <tr className="text-slate-700 font-bold uppercase tracking-wider text-[10px]">
                        <th className="p-2.5 w-12 text-center bg-slate-200/60">#</th>
                        {displayHeaders.map((k) => (
                          <th key={k} className="p-2.5 font-bold whitespace-nowrap">
                            {k}
                          </th>
                        ))}
                        <th className="p-2.5 text-center w-14">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {displayRows.map((r, i) => (
                        <tr key={i} className="hover:bg-slate-50/80 transition">
                          <td className="p-2 text-center text-slate-400 font-mono text-[10px] bg-slate-50/50">
                            {i + 1}
                          </td>
                          {displayHeaders.map((col) => (
                            <td key={col} className="p-1.5">
                              {isEditMode ? (
                                <input
                                  type="text"
                                  value={r[col] ?? ''}
                                  onChange={(e) => handleCellChange(i, col, e.target.value)}
                                  className={`w-full ${getColMinWidth(col)} px-2.5 py-1 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-900 font-medium`}
                                  placeholder={`Enter ${col}...`}
                                />
                              ) : (
                                <span className="text-xs text-slate-800 whitespace-nowrap px-1">
                                  {r[col] !== undefined && r[col] !== '' ? r[col] : '—'}
                                </span>
                              )}
                            </td>
                          ))}
                          <td className="p-1.5 text-center">
                            <button
                              type="button"
                              onClick={() => handleDeleteRow(i)}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition"
                              title="Delete this row"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {hasEdits && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-center justify-between">
                    <span>✏️ <strong>Live Edits Active:</strong> Changes made in the table above will be automatically saved and scheduled when you click <strong>Upload CSV</strong>. (Clicking <em>Validate only</em> runs a test simulation without saving).</span>
                    <span className="font-semibold text-amber-800 font-mono text-[11px]">{displayRows.length} rows ready</span>
                  </div>
                )}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3 pt-3">
              <button
                type="button"
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white shadow-md disabled:opacity-50 cursor-pointer transition"
                disabled={busy}
                onClick={() => run(false)}
              >
                <PlayCircle className="w-4 h-4 text-emerald-400" />
                <span>🚀 Start Automation & Schedule Reminders {hasEdits ? '(with Edits)' : ''}</span>
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md disabled:opacity-50 cursor-pointer transition"
                disabled={busy}
                onClick={handleSendAllInstantly}
                title="Set all reminder dates to right now and dispatch immediately"
              >
                <Zap className="w-4 h-4 text-slate-950 fill-current" />
                <span>⚡ Send All Instantly Now</span>
              </button>
              <button
                type="button"
                className={`${btnGhost} text-slate-500 hover:text-slate-700`}
                disabled={busy}
                onClick={() => run(true)}
              >
                <span>Test / Validate only (Dry run)</span>
              </button>
            </div>
          </div>
        )}
      </section>

      {result && (
        <section className={`${card} p-5 space-y-4`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 role="status" className="text-sm font-bold text-slate-900">
                {result.status === 'dry_run' ? 'Validation result (Dry Run - Nothing Saved)' : `Import #${result.import_id} complete`}
              </h2>
              {result.status === 'dry_run' ? (
                <p className="text-xs text-amber-700 mt-1">
                  ⚠️ This was a preview validation check only. No reminders were saved and no emails will be sent until you click <strong>Start Automation & Schedule Reminders</strong>.
                </p>
              ) : (
                <div className="mt-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-start gap-2.5">
                  <span className="text-base">☁️</span>
                  <div>
                    <strong className="text-emerald-950 font-semibold">Cloud Automation Active:</strong> Reminders are queued on the 24/7 cloud server. Scheduled emails and messages will dispatch at the exact time — even if this browser tab is closed or your computer is turned off.
                  </div>
                </div>
              )}
            </div>
            {result.status === 'dry_run' && (
              <button
                type="button"
                className={btnPrimary}
                disabled={busy}
                onClick={() => run(false)}
              >
                <FileUp className="w-4 h-4" />
                <span>Upload CSV & Schedule Reminders Now</span>
              </button>
            )}
          </div>
          <dl className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 text-xs">
            {([['Total rows', result.total_rows], ['Imported', result.imported_rows], ['Unchanged', result.unchanged_rows],
              ['Rejected', result.rejected_rows], ['Warnings', result.warning_count], [result.status === 'dry_run' ? 'Reminders proposed' : 'Reminders scheduled', result.reminders_scheduled],
              ['Rescheduled', result.reminders_updated], ['Cancelled', result.reminders_cancelled]] as const).map(([k, v]) => (
              <div key={k}><dt className="text-slate-500">{k}</dt><dd className="text-lg font-semibold text-slate-900">{v}</dd></div>
            ))}
          </dl>
          {result.reminders_skipped_past > 0 && (
            <p className="text-[11px] text-slate-500">{result.reminders_skipped_past} policy reminders were already in the past and were not created.</p>
          )}
          {result.issues.length > 0 && (
            <>
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-slate-800">Row issues</p>
                {result.status !== 'dry_run' && <button className={btnGhost} onClick={() => downloadIssues(result.import_id)}>Download CSV</button>}
              </div>
              <div className="max-h-72 overflow-y-auto">
                <table className="w-full text-[11px]">
                  <thead><tr className="text-left text-slate-500"><th className="py-1 pr-3">Row</th><th className="pr-3">Severity</th><th className="pr-3">Field</th><th>Problem</th></tr></thead>
                  <tbody>{result.issues.map((i, idx) => (
                    <tr key={idx} className="border-t border-slate-100"><td className="py-1 pr-3">{i.row}</td><td className="pr-3"><Badge value={i.severity === 'error' ? 'failed' : 'retry'} title={i.severity} /></td>
                      <td className="pr-3 font-mono">{i.field ?? '—'}</td><td>{i.message}</td></tr>
                  ))}</tbody>
                </table>
              </div>
            </>
          )}
        </section>
      )}

      <section className={card}>
        <h2 className="text-sm font-bold text-slate-900 px-5 pt-5">Import history</h2>
        {!history.data ? <LoadingState /> : history.data.imports.length === 0 ? <EmptyState title="No imports yet" /> : (
          <div className="overflow-x-auto p-5 pt-3">
            <table className="w-full text-xs">
              <thead><tr className="text-left text-slate-500"><th className="py-1.5 pr-3">#</th><th className="pr-3">File</th><th className="pr-3">Type</th><th className="pr-3">By</th><th className="pr-3">When</th><th className="pr-3">Status</th><th className="pr-3">Rows (ok / rejected)</th><th>Reminders</th></tr></thead>
              <tbody>{history.data.imports.map((i) => (
                <tr key={i.id} className="border-t border-slate-100">
                  <td className="py-2 pr-3">{i.id}</td><td className="pr-3">{i.filename}</td><td className="pr-3">{i.import_type}</td>
                  <td className="pr-3">{i.uploaded_by}</td><td className="pr-3">{fmtTime(i.created_at)}</td><td className="pr-3"><Badge value={i.status} /></td>
                  <td className="pr-3">{i.imported_rows + i.unchanged_rows} / {i.rejected_rows}</td><td>{i.reminders_scheduled}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};

// ====================================================================== reminders

const ReminderDetail: React.FC<{ id: string; role: Role; onChanged: () => void; onClose: () => void }> = ({ id, role, onChanged, onClose }) => {
  const { data, error, reload } = useLoader(() => automationApi.reminder(id), [id], 5_000);
  const [when, setWhen] = useState('');
  const [reason, setReason] = useState('');
  const [msg, setMsg] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const act = async (fn: () => Promise<unknown>, ok: string) => {
    setMsg(null);
    try { await fn(); setMsg({ kind: 'ok', text: ok }); reload(); onChanged(); } catch (e) { setMsg({ kind: 'error', text: errText(e) }); }
  };
  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (!data) return <LoadingState />;
  const r = data.reminder;
  const open = r.status === 'pending' || r.status === 'retry';
  const canOperate = RANK[role] >= RANK.operator;
  return (
    <section className={`${card} p-5 space-y-4`} aria-label="Reminder details">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900">{r.customer_id} · {r.loan_id} · {r.reminder_type.replace('_', ' ')}</h3>
          <p className="text-[11px] text-slate-500">Scheduled {fmtTime(r.scheduled_at_utc)} IST · EMI {money(data.emi.outstanding)} outstanding, due {data.emi.due_date} · payment status <Badge value={data.emi.payment_status} /></p>
          <Badge value={r.display_status ?? r.status} />
          {r.schedule_note && <p className="text-[11px] text-slate-500">{r.schedule_note}</p>}
          {r.outcome_reason && <p className="text-[11px] text-slate-700">Outcome: {r.outcome_reason}</p>}
        </div>
        <button className={btnGhost} onClick={onClose}>Close</button>
      </div>
      <table className="w-full text-xs">
        <thead><tr className="text-left text-slate-500"><th className="py-1 pr-3">Channel</th><th className="pr-3">Status</th><th className="pr-3">To</th><th className="pr-3">Provider</th><th className="pr-3">Attempts</th><th className="pr-3">Last attempt (IST)</th><th>Detail</th></tr></thead>
        <tbody>{(r.deliveries ?? []).map((d) => (
          <tr key={d.id} className="border-t border-slate-100 align-top">
            <td className="py-1.5 pr-3 font-semibold">{CHANNEL_LABEL[d.channel]}</td><td className="pr-3"><Badge value={d.display_status ?? d.status} /></td>
            <td className="pr-3 font-mono">{d.recipient ?? '—'}</td><td className="pr-3">{d.provider ? providerLabel(d.provider) : '—'}</td><td className="pr-3">{d.attempt_count}</td><td className="pr-3">{fmtTime(d.last_attempt_at ?? null)}</td>
            <td className="text-[11px] text-slate-600">{d.skip_reason ?? (d.error_code ? `${d.error_code}: ${d.error_message ?? ''}` : d.next_retry_at ? `retry at ${fmtTime(d.next_retry_at)}` : d.provider_message_id ?? '')}</td>
          </tr>
        ))}</tbody>
      </table>
      {canOperate && (
        <div className="flex flex-wrap items-end gap-3 border-t border-slate-100 pt-3">
          {open && (<>
            <label className="text-[11px] text-slate-600">New local time ({r.timezone})
              <input type="datetime-local" className={`${input} block mt-1`} value={when} onChange={(e) => setWhen(e.target.value)} /></label>
            <button className={btnGhost} disabled={!when} onClick={() => act(() => automationApi.reschedule(r.id, when), 'Rescheduled.')}>Reschedule</button>
            <label className="text-[11px] text-slate-600">Cancel reason
              <input className={`${input} block mt-1`} value={reason} onChange={(e) => setReason(e.target.value)} /></label>
            <button className={btnGhost} disabled={reason.trim().length < 3} onClick={() => act(() => automationApi.cancel(r.id, reason), 'Cancelled.')}>Cancel reminder</button>
          </>)}
          {['failed', 'dead_letter', 'partially_completed'].includes(r.status) && (
            <button className={btnGhost} onClick={() => act(() => automationApi.retry(r.id), 'Queued for retry. Channels already accepted will not be re-sent.')}>
              <RefreshCw className="w-3.5 h-3.5" />Retry failed channels</button>
          )}
        </div>
      )}
      {msg && <Notice kind={msg.kind}>{msg.text}</Notice>}
      <details className="text-[11px] text-slate-600">
        <summary className="cursor-pointer font-semibold">History ({data.history.length})</summary>
        <ul className="mt-2 space-y-1">{data.history.map((h, i) => (
          <li key={i}>{fmtTime(h.created_at)} · {h.actor} · {h.action}{h.details ? ` · ${JSON.stringify(h.details)}` : ''}</li>
        ))}</ul>
      </details>
    </section>
  );
};


// ====================================================================== escalations (3-Stage Workflow)

const EscalationsTab: React.FC<{ role: Role }> = ({ role }) => {
  const [status, setStatus] = useState<string>('open,under_review');
  const [resolvingId, setResolvingId] = useState<number | null>(null);
  const [resolveNote, setResolveNote] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  const { data, error, reload } = useLoader(
    () => automationApi.escalations(status),
    [status],
    5_000
  );

  const handleTakeover = async (id: number) => {
    try {
      await automationApi.takeoverEscalation(id, 'Recovery Officer');
      reload();
    } catch (err) {
      alert(errText(err));
    }
  };

  const handleResolve = async (id: number) => {
    if (!resolveNote.trim()) {
      alert('Please enter a resolution note before resolving.');
      return;
    }
    setSubmitting(true);
    try {
      await automationApi.resolveEscalation(id, resolveNote.trim());
      setResolvingId(null);
      setResolveNote('');
      reload();
    } catch (err) {
      alert(errText(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className={`${card} p-4 flex flex-wrap gap-3 items-end justify-between`}>
        <div className="flex flex-wrap gap-3 items-end">
          <label className="text-[11px] text-slate-600">Escalation Status
            <select
              className={`${input} block mt-1`}
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="open,under_review">Active (Open & Under Review)</option>
              <option value="">All Statuses</option>
              <option value="open">Open</option>
              <option value="under_review">Under Review / Paused</option>
              <option value="resolved">Resolved</option>
            </select>
          </label>
        </div>
        <div className="text-xs text-slate-500">
          Showing automated escalations after exactly 3 exhausted reminder stages.
        </div>
      </div>

      <section className={card}>
        {error && !data ? (
          <ErrorState error={error} onRetry={reload} />
        ) : !data ? (
          <LoadingState />
        ) : !data.escalations || data.escalations.length === 0 ? (
          <EmptyState
            title="No escalation cases"
            message="Borrowers who complete all 3 reminder stages without payment or valid dispute will automatically appear here for human recovery intervention."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-slate-500 border-b border-slate-100">
                  <th className="py-2.5 px-4 font-medium">Customer</th>
                  <th className="px-2 font-medium">Loan ID</th>
                  <th className="px-2 font-medium">Overdue Days</th>
                  <th className="px-2 font-medium">Outstanding</th>
                  <th className="px-2 font-medium">Stage Reached</th>
                  <th className="px-2 font-medium">Status</th>
                  <th className="px-2 font-medium">Human Takeover</th>
                  <th className="px-2 font-medium">Escalated At (IST)</th>
                  <th className="px-2 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.escalations.map((esc: EscalationCase) => (
                  <tr key={esc.id} className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="py-2.5 px-4">
                      <span className="font-semibold text-slate-800">{esc.customer_name ?? esc.customer_id}</span>
                      <br />
                      <span className="text-[10px] text-slate-500">{esc.phone ?? esc.customer_id}</span>
                    </td>
                    <td className="px-2 font-mono font-medium text-slate-700">{esc.loan_id}</td>
                    <td className="px-2">
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                        {esc.overdue_days} days
                      </span>
                    </td>
                    <td className="px-2 font-semibold text-slate-900">{money(esc.outstanding_amount)}</td>
                    <td className="px-2">
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                        Stage {esc.stage_reached} (Final)
                      </span>
                    </td>
                    <td className="px-2">
                      <Badge value={esc.status} />
                    </td>
                    <td className="px-2">
                      {esc.human_takeover ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200">
                          Assigned ({esc.assigned_to ?? 'Officer'})
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400">Unassigned</span>
                      )}
                    </td>
                    <td className="px-2 text-slate-500">{fmtTime(esc.escalated_at)}</td>
                    <td className="px-2 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {role !== 'viewer' && esc.status !== 'resolved' && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleTakeover(esc.id)}
                              className={`${btnGhost} text-[11px] py-1 px-2`}
                              title="Toggle manual human takeover for this borrower"
                            >
                              <Users className="w-3 h-3" />
                              <span>{esc.human_takeover ? 'Release' : 'Take Over'}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setResolvingId(esc.id);
                                setResolveNote('');
                              }}
                              className={`${btnPrimary} text-[11px] py-1 px-2 bg-emerald-700 hover:bg-emerald-600`}
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Resolve</span>
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Resolution Modal */}
      {resolvingId !== null && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 max-w-md w-full shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Resolve Escalation Case #{resolvingId}</h3>
            <p className="text-xs text-slate-500">
              Provide an audit note documenting the recovery agreement, restructured installment, or verified settlement.
            </p>
            <textarea
              className="w-full border border-slate-300 rounded-lg p-2.5 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              rows={3}
              placeholder="e.g. Borrower visited branch; agreed to restructured payment plan starting 15th."
              value={resolveNote}
              onChange={(e) => setResolveNote(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className={btnGhost}
                onClick={() => setResolvingId(null)}
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="button"
                className={`${btnPrimary} bg-emerald-700 hover:bg-emerald-600`}
                onClick={() => handleResolve(resolvingId)}
                disabled={submitting}
              >
                {submitting ? 'Resolving...' : 'Confirm Resolution'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


const RemindersTab: React.FC<{ role: Role }> = ({ role }) => {
  const [status, setStatus] = useState('pending,retry,processing');
  const [type, setType] = useState('');
  const [customer, setCustomer] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string | null>(null);
  const { data, error, reload } = useLoader(
    () => automationApi.reminders({ status, reminder_type: type, customer_id: customer.trim(), page, page_size: 25 }),
    [status, type, customer, page], 5_000);
  return (
    <div className="space-y-4">
      <div className={`${card} p-4 flex flex-wrap gap-3 items-end`}>
        <label className="text-[11px] text-slate-600">Status
          <select className={`${input} block mt-1`} value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
            <option value="pending,retry,processing">Open</option><option value="">All</option>
            <option value="completed,partially_completed">Completed / simulated</option><option value="failed,dead_letter">Failed / unknown</option>
            <option value="cancelled,skipped,missed">Cancelled / skipped / missed</option>
          </select></label>
        <label className="text-[11px] text-slate-600">Type
          <select className={`${input} block mt-1`} value={type} onChange={(e) => { setType(e.target.value); setPage(1); }}>
            <option value="">All</option><option value="explicit">Explicit (from CSV)</option><option value="pre_due">Pre-due</option>
            <option value="due_date">Due date</option><option value="overdue">Overdue</option>
          </select></label>
        <label className="text-[11px] text-slate-600">Customer ID
          <input className={`${input} block mt-1`} value={customer} onChange={(e) => { setCustomer(e.target.value); setPage(1); }} /></label>
      </div>
      {selected && <ReminderDetail id={selected} role={role} onChanged={reload} onClose={() => setSelected(null)} />}
      <section className={card}>
        {error && !data ? <ErrorState error={error} onRetry={reload} /> : !data ? <LoadingState /> : data.reminders.length === 0 ? (
          <EmptyState title="No reminders match" message="Import a CSV to schedule reminders automatically." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead><tr className="text-left text-slate-500 border-b border-slate-100">
                <th className="py-2 px-4 font-medium">Customer</th><th className="px-2 font-medium">Loan</th><th className="px-2 font-medium">Stage</th><th className="px-2 font-medium">Voice Audio</th>
                <th className="px-2 font-medium">Scheduled (IST)</th><th className="px-2 font-medium">Status</th><th className="px-2 font-medium">Channels</th><th className="px-2 font-medium">Attempts</th><th className="px-2 font-medium text-right">Action</th>
              </tr></thead>
              <tbody>{data.reminders.map((r: Reminder) => (
                <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50 cursor-pointer" onClick={() => setSelected(r.id)}>
                  <td className="py-2 px-4"><span className="font-semibold text-slate-800">{r.customer_name ?? r.customer_id}</span><br /><span className="text-[10px] text-slate-500">{r.customer_id}</span></td>
                  <td className="px-2">{r.loan_id}</td>
                  <td className="px-2">
                    {r.stage ? (
                      <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold border ${
                        r.stage === 1 ? 'bg-blue-50 text-blue-700 border-blue-200' :
                        r.stage === 2 ? 'bg-amber-50 text-amber-700 border-amber-200' :
                        'bg-rose-50 text-rose-700 border-rose-200'
                      }`}>
                        Stage {r.stage} ({r.stage_name ?? (r.stage === 1 ? 'Friendly' : r.stage === 2 ? 'Firm' : 'Final')})
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-500 capitalize">{r.reminder_type.replace('_', ' ')}</span>
                    )}
                  </td>
                  <td className="px-2" onClick={(e) => e.stopPropagation()}>
                    {r.media_url ? (
                      <audio controls className="h-6 w-32" src={r.media_url.startsWith('http') ? r.media_url : `${import.meta.env.VITE_API_BASE_URL ?? ''}${r.media_url}`} />
                    ) : (
                      <span className="text-[10px] text-slate-400">None (Text)</span>
                    )}
                  </td>
                  <td className="px-2">{fmtTime(r.scheduled_at_utc)} IST</td>
                  <td className="px-2"><Badge value={r.display_status ?? r.status} title={r.outcome_reason ?? undefined} /></td>
                  <td className="px-2"><div className="flex flex-wrap gap-1">{(r.deliveries?.length ? r.deliveries : r.channels.map((c) => ({ channel: c, status: 'queued' }))).map((d) => (
                    <span key={d.channel} className="text-[10px]">{CHANNEL_LABEL[d.channel as Channel]}: <Badge value={'display_status' in d ? String(d.display_status ?? d.status) : d.status} /></span>))}</div></td>
                  <td className="px-2">{r.attempt_count}</td>
                  <td className="px-2 text-right">
                    {(r.status === 'pending' || r.status === 'retry') && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          automationApi.sendNowReminder(r.id).then(() => reload()).catch((err) => alert(errText(err)));
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 cursor-pointer transition shadow-xs"
                        title="Dispatch this reminder right now"
                      >
                        <Zap className="w-3 h-3 fill-current" />
                        <span>Send Now</span>
                      </button>
                    )}
                  </td>
                </tr>
              ))}</tbody>
            </table>
            <Pager p={data.pagination} onPage={setPage} />
          </div>
        )}
      </section>
    </div>
  );
};

// ====================================================================== payments

const PaymentForm: React.FC<{ emi: Emi; onDone: () => void }> = ({ emi, onDone }) => {
  const [status, setStatus] = useState('paid');
  const [amount, setAmount] = useState('');
  const [reference, setReference] = useState('');
  const [note, setNote] = useState('');
  const [msg, setMsg] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const r = await automationApi.updatePayment(emi.emi_id, { payment_status: status, amount_paid: amount || undefined,
        reference: reference || undefined, note: note || undefined });
      setMsg({ kind: 'ok', text: `Saved. ${r.reminders_cancelled} pending reminders cancelled.` });
      onDone();
    } catch (err) { setMsg({ kind: 'error', text: errText(err) }); }
  };
  return (
    <form onSubmit={submit} className="flex flex-wrap items-end gap-2 bg-slate-50 rounded-lg p-3">
      <label className="text-[11px] text-slate-600">Status<select className={`${input} block mt-1`} value={status} onChange={(e) => setStatus(e.target.value)}>
        {['paid', 'partially_paid', 'pending', 'overdue', 'waived', 'cancelled'].map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}</select></label>
      <label className="text-[11px] text-slate-600">Amount paid<input className={`${input} block mt-1 w-28`} inputMode="decimal" value={amount} placeholder={status === 'paid' ? emi.emi_amount : ''} onChange={(e) => setAmount(e.target.value)} /></label>
      <label className="text-[11px] text-slate-600">Payment reference<input className={`${input} block mt-1`} value={reference} onChange={(e) => setReference(e.target.value)} /></label>
      <label className="text-[11px] text-slate-600">Evidence note<input className={`${input} block mt-1`} value={note} onChange={(e) => setNote(e.target.value)} /></label>
      <button className={btnPrimary} type="submit">Save verified status</button>
      {msg && <div className="w-full"><Notice kind={msg.kind}>{msg.text}</Notice></div>}
    </form>
  );
};

const PaymentsTab: React.FC<{ role: Role }> = ({ role }) => {
  const [filter, setFilter] = useState('');
  const [claims, setClaims] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<number | null>(null);
  const { data, error, reload } = useLoader(
    () => automationApi.emis({ payment_status: filter, claim_pending: claims || undefined, search: search.trim(), page }),
    [filter, claims, search, page]);
  const reject = async (emi: Emi) => {
    const note = window.prompt('Why could the payment not be verified?');
    if (note && note.trim().length >= 3) { await automationApi.rejectClaim(emi.emi_id, note.trim()); reload(); }
  };
  return (
    <div className="space-y-4">
      <Notice kind="ok">
        Payment status comes from CSV imports, this page, and signed payment webhooks. Reminders re-check it immediately before sending.
        A customer saying "I paid" only pauses reminders until someone verifies it here.
      </Notice>
      <div className={`${card} p-4 flex flex-wrap gap-3 items-end`}>
        <label className="text-[11px] text-slate-600">Status<select className={`${input} block mt-1`} value={filter} onChange={(e) => { setFilter(e.target.value); setPage(1); }}>
          <option value="">All</option><option value="pending,overdue,partially_paid">Unpaid</option><option value="paid">Paid</option></select></label>
        <label className="text-[11px] text-slate-600 flex items-center gap-1.5"><input type="checkbox" checked={claims} onChange={(e) => { setClaims(e.target.checked); setPage(1); }} />Payment claims to verify</label>
        <label className="text-[11px] text-slate-600">Search<input className={`${input} block mt-1`} placeholder="Loan, customer ID or name" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} /></label>
      </div>
      <section className={card}>
        {error && !data ? <ErrorState error={error} onRetry={reload} /> : !data ? <LoadingState /> : data.emis.length === 0 ? <EmptyState title="No EMI records" /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead><tr className="text-left text-slate-500 border-b border-slate-100"><th className="py-2 px-4 font-medium">Customer</th><th className="px-2 font-medium">Loan</th><th className="px-2 font-medium">Due</th>
                <th className="px-2 font-medium">EMI</th><th className="px-2 font-medium">Outstanding</th><th className="px-2 font-medium">Status</th><th className="px-2 font-medium">Source</th><th className="px-2" /></tr></thead>
              <tbody>{data.emis.map((e) => (
                <React.Fragment key={e.emi_id}>
                  <tr className="border-b border-slate-50">
                    <td className="py-2 px-4"><span className="font-semibold text-slate-800">{e.customer_name}</span><br /><span className="text-[10px] text-slate-500">{e.customer_id}</span></td>
                    <td className="px-2">{e.loan_id}{e.installment !== 'current' ? ` #${e.installment}` : ''}</td><td className="px-2">{e.due_date}</td>
                    <td className="px-2 tabular-nums">{money(e.emi_amount)}</td><td className="px-2 tabular-nums">{money(e.outstanding)}</td>
                    <td className="px-2"><Badge value={e.payment_status} />{e.payment_claim_pending && <span className="ml-1"><Badge value="claim pending" title="Customer says they paid" /></span>}</td>
                    <td className="px-2 text-[11px] text-slate-500">{e.payment_status_source}</td>
                    <td className="px-2 text-right whitespace-nowrap">{RANK[role] >= RANK.operator && (<>
                      {e.payment_claim_pending && <button className={`${btnGhost} mr-1`} onClick={() => reject(e)}>Not verified</button>}
                      <button className={btnGhost} onClick={() => setEditing(editing === e.emi_id ? null : e.emi_id)}><Wallet className="w-3.5 h-3.5" />Update</button></>)}</td>
                  </tr>
                  {editing === e.emi_id && <tr><td colSpan={8} className="px-4 pb-3"><PaymentForm emi={e} onDone={reload} /></td></tr>}
                </React.Fragment>
              ))}</tbody>
            </table>
            <Pager p={data.pagination} onPage={setPage} />
          </div>
        )}
      </section>
    </div>
  );
};

// ====================================================================== replies and follow-ups

const RepliesTab: React.FC<{ role: Role }> = ({ role }) => {
  const tasks = useLoader(() => automationApi.followups('open'), [], 30_000);
  const [page, setPage] = useState(1);
  const comms = useLoader(() => automationApi.communications({ page }), [page], 30_000);
  const resolve = async (f: FollowUp) => {
    const note = window.prompt('Resolution note');
    if (!note || note.trim().length < 3) return;
    const release = f.kind === 'dispute' && window.confirm('Release the reminder hold for this customer?');
    await automationApi.resolveFollowup(f.id, note.trim(), release);
    tasks.reload();
  };
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      <section className={card}>
        <h2 className="text-sm font-bold text-slate-900 px-5 pt-5">Open follow-ups</h2>
        {!tasks.data ? <LoadingState /> : tasks.data.followups.length === 0 ? <EmptyState title="Nothing needs attention" /> : (
          <ul className="divide-y divide-slate-100 px-5 pb-3">{tasks.data.followups.map((f) => (
            <li key={f.id} className="py-3 text-xs flex justify-between gap-3">
              <div>
                <p className="font-semibold text-slate-800">{f.customer_name ?? 'Unknown sender'} <span className="text-slate-500 font-normal">{f.customer_id ?? ''} {f.loan_id ?? ''}</span></p>
                <p className="text-slate-600">{f.reason}</p>
                <p className="text-[10px] text-slate-400">{f.kind.replace(/_/g, ' ')} · {fmtTime(f.created_at)}{f.due_at ? ` · check on ${f.due_at}` : ''}</p>
              </div>
              <div className="flex flex-col items-end gap-1"><Badge value={f.priority} />
                {RANK[role] >= RANK.operator && <button className={btnGhost} onClick={() => resolve(f)}>Resolve</button>}</div>
            </li>
          ))}</ul>
        )}
      </section>
      <section className={card}>
        <h2 className="text-sm font-bold text-slate-900 px-5 pt-5">Communication history</h2>
        {!comms.data ? <LoadingState /> : comms.data.communications.length === 0 ? <EmptyState title="No messages yet" /> : (
          <>
            <ul className="divide-y divide-slate-100 px-5">{comms.data.communications.map((c: Communication) => (
              <li key={c.id} className="py-2.5 text-xs">
                <p className="text-[10px] text-slate-500">{c.direction === 'inbound' ? 'From' : 'To'} {c.customer_id ?? c.identifier} · {CHANNEL_LABEL[c.channel]} · {c.kind.replace('_', ' ')} · {fmtTime(c.created_at)}
                  {c.status && <> · <Badge value={c.status} /></>}{c.intent && <> · <Badge value={c.intent.toLowerCase()} /></>}</p>
                <p className={`mt-0.5 whitespace-pre-line ${c.direction === 'inbound' ? 'text-slate-900' : 'text-slate-600'}`}>{c.content}</p>
              </li>
            ))}</ul>
            <Pager p={comms.data.pagination} onPage={setPage} />
          </>
        )}
      </section>
    </div>
  );
};

// ====================================================================== settings

const parseDays = (s: string) => s.split(',').map((x) => Number(x.trim())).filter((n) => Number.isInteger(n) && n > 0);

const SettingsTab: React.FC<{ role: Role }> = ({ role }) => {
  const { data, error, reload } = useLoader(automationApi.settings, []);
  const [draft, setDraft] = useState<Policy | null>(null);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  useEffect(() => { if (data) setDraft(data.settings); }, [data]);
  const readOnly = RANK[role] < RANK.admin;
  if (error && !data) return <div className={card}><ErrorState error={error} onRetry={reload} /></div>;
  if (!draft || !data) return <div className={card}><LoadingState /></div>;
  const set = <K extends keyof Policy>(k: K, v: Policy[K]) => setDraft({ ...draft, [k]: v });
  const save = async () => {
    setMsg(null);
    try {
      const r = await automationApi.updateSettings(draft);
      setMsg({ kind: 'ok', text: `Saved. ${r.reminders_scheduled} reminders scheduled, ${r.reminders_updated} rescheduled, ${r.reminders_cancelled} cancelled.` });
      reload();
    } catch (e) { setMsg({ kind: 'error', text: errText(e) }); }
  };
  const field = 'text-[11px] text-slate-600 block';
  return (
    <section className={`${card} p-5 space-y-5`}>
      <div>
        <h2 className="text-sm font-bold text-slate-900">Reminder policy</h2>
        <p className="text-[11px] text-slate-500">Times are in each customer's timezone (default {data.app_timezone}). Saving reschedules pending reminders that were created by the policy.
          {readOnly && ' Only administrators can change these settings.'}</p>
      </div>
      <fieldset disabled={readOnly} className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <label className={field}>Default reminder time<input type="time" className={`${input} block mt-1`} value={draft.default_reminder_time} onChange={(e) => set('default_reminder_time', e.target.value)} /></label>
        <label className={field}>Pre-due reminders (days before, comma-separated)<input className={`${input} block mt-1`} defaultValue={draft.pre_due_days.join(', ')} onBlur={(e) => set('pre_due_days', parseDays(e.target.value))} /></label>
        <label className={`${field} flex items-center gap-2 mt-5`}><input type="checkbox" checked={draft.due_date_reminder} onChange={(e) => set('due_date_reminder', e.target.checked)} />Remind on the due date</label>
        <label className={field}>Overdue reminders (days after)<input className={`${input} block mt-1`} defaultValue={draft.overdue_days.join(', ')} onBlur={(e) => set('overdue_days', parseDays(e.target.value))} /></label>
        <label className={field}>Then repeat every N days (0 = off)<input type="number" min={0} max={60} className={`${input} block mt-1`} value={draft.overdue_repeat_every_days} onChange={(e) => set('overdue_repeat_every_days', Number(e.target.value))} /></label>
        <label className={field}>Max overdue reminders<input type="number" min={0} max={20} className={`${input} block mt-1`} value={draft.overdue_max_reminders} onChange={(e) => set('overdue_max_reminders', Number(e.target.value))} /></label>
        <label className={field}>Contact window start<input type="time" className={`${input} block mt-1`} value={draft.contact_window_start} onChange={(e) => set('contact_window_start', e.target.value)} /></label>
        <label className={field}>Contact window end<input type="time" className={`${input} block mt-1`} value={draft.contact_window_end} onChange={(e) => set('contact_window_end', e.target.value)} /></label>
        <label className={field}>Skip jobs more than N minutes late (after downtime)<input type="number" min={0} className={`${input} block mt-1`} value={draft.max_lateness_minutes} onChange={(e) => set('max_lateness_minutes', Number(e.target.value))} /></label>
        <div className={field}>Channels enabled
          <div className="flex gap-3 mt-1">{CHANNELS.map((c) => (
            <label key={c} className="flex items-center gap-1"><input type="checkbox" checked={draft.channels_enabled[c]} onChange={(e) => set('channels_enabled', { ...draft.channels_enabled, [c]: e.target.checked })} />{CHANNEL_LABEL[c]}</label>))}</div></div>
        <label className={field}>Channel strategy<select className={`${input} block mt-1`} value={draft.channel_strategy} onChange={(e) => set('channel_strategy', e.target.value as Policy['channel_strategy'])}>
          <option value="fallback">Fallback: stop at the first channel that accepts</option><option value="all">All: send on every eligible channel</option></select></label>
        <label className={field}>Channel order<select className={`${input} block mt-1`} value={draft.channel_order.join(',')} onChange={(e) => set('channel_order', e.target.value.split(',') as Channel[])}>
          {['whatsapp,sms,email', 'whatsapp,email,sms', 'sms,whatsapp,email', 'sms,email,whatsapp', 'email,whatsapp,sms', 'email,sms,whatsapp'].map((o) => (
            <option key={o} value={o}>{o.split(',').map((c) => CHANNEL_LABEL[c as Channel]).join(' → ')}</option>))}</select></label>
        <label className={`${field} flex items-center gap-2`}><input type="checkbox" checked={draft.require_explicit_consent} onChange={(e) => set('require_explicit_consent', e.target.checked)} />Require explicit consent (block 'unknown')</label>
        <label className={`${field} flex items-center gap-2`}><input type="checkbox" checked={draft.suppress_on_payment_claim} onChange={(e) => set('suppress_on_payment_claim', e.target.checked)} />Pause reminders when a customer says they paid</label>
        <label className={`${field} flex items-center gap-2`}><input type="checkbox" checked={draft.auto_reply_enabled} onChange={(e) => set('auto_reply_enabled', e.target.checked)} />Automatic replies to customer messages</label>
      </fieldset>
      {!readOnly && <button className={btnPrimary} onClick={save}><Settings2 className="w-4 h-4" />Save policy</button>}
      {msg && <Notice kind={msg.kind}>{msg.text}</Notice>}
    </section>
  );
};

// ====================================================================== page

const TABS: { id: Tab; label: string; icon: React.ComponentType<{ className?: string }>; minRole: Role }[] = [
  { id: 'overview', label: 'Overview', icon: Activity, minRole: 'viewer' },
  { id: 'import', label: 'Import CSV', icon: FileUp, minRole: 'operator' },
  { id: 'reminders', label: 'Reminders', icon: ListChecks, minRole: 'viewer' },
  { id: 'escalations', label: 'Escalations', icon: ShieldAlert, minRole: 'viewer' },
  { id: 'payments', label: 'Payments', icon: Wallet, minRole: 'viewer' },
  { id: 'replies', label: 'Replies & follow-ups', icon: MessageSquareReply, minRole: 'viewer' },
  { id: 'settings', label: 'Policy', icon: Settings2, minRole: 'viewer' },
];

export const AutomationPage: React.FC = () => {
  const [user, setUser] = useState<{ name: string; role: Role }>({ name: 'Admin', role: 'admin' });
  const [tab, setTab] = useState<Tab>('overview');

  useEffect(() => {
    automationApi.me()
      .then((me) => setUser({ name: me.name, role: me.role }))
      .catch(() => {
        // Fall back gracefully to admin access
        setUser({ name: 'Admin', role: 'admin' });
      });
  }, []);

  const visible = useMemo(() => TABS.filter((t) => RANK[user.role] >= RANK[t.minRole]), [user]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-2">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">EMI Reminder Automation</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">Reminders are scheduled from imported data and sent by the background worker over WhatsApp, SMS and email.</p>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-slate-500">
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-100 text-emerald-800">
            Active Mode
          </span>
          Signed in as <span className="font-semibold text-slate-700">{user.name}</span> ({user.role})
        </div>
      </div>
      <nav className="flex flex-wrap gap-1.5 p-1 bg-[#F5F7F3] rounded-full border border-[#E7EBE3] w-fit" aria-label="Automation sections">
        {visible.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} aria-current={tab === t.id ? 'page' : undefined}
            className={`inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold cursor-pointer transition-all ${tab === t.id ? 'bg-[#245C35] text-white shadow-2xs rounded-full' : 'text-[#777E77] hover:text-[#171A17] rounded-full'}`}>
            <t.icon className="w-4 h-4" />{t.label}
          </button>
        ))}
      </nav>
      {tab === 'overview' && <Overview role={user.role} onOpenTab={setTab} />}
      {tab === 'import' && <ImportTab />}
      {tab === 'reminders' && <RemindersTab role={user.role} />}
      {tab === 'escalations' && <EscalationsTab role={user.role} />}
      {tab === 'payments' && <PaymentsTab role={user.role} />}
      {tab === 'replies' && <RepliesTab role={user.role} />}
      {tab === 'settings' && (
        <div className="space-y-6">
          <SettingsTab role={user.role} />
          {user.role === 'admin' && (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <SmsTestPanel />
              <EmailTestPanel />
            </div>
          )}
        </div>
      )}
    </div>
  );
};
