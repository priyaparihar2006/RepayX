import { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Bot,
  Calendar,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock,
  Download,
  FileCode,
  FileSpreadsheet,
  FileText,
  FileUp,
  Layers,
  LogOut,
  MessageSquare,
  QrCode,
  RefreshCw,
  Send,
  ShieldAlert,
  Smartphone,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Upload,
  UploadCloud,
  UserCheck,
  Zap,
} from 'lucide-react';
import {
  whatsapp,
  type DemoContact,
  type ExtractedDefaulter,
  type LoanEmiDataResponse,
  type ScheduledRecord,
  type SchedulingSummary,
  type UserLoanEmiRecord,
  type WhatsAppHistoryItem,
  type WhatsAppStatus,
} from '../services/whatsapp';

type Draft = DemoContact & {
  requestId: string;
  result: string;
  error: string;
  total_loan?: number;
  emi_paid?: number;
};

const sender = '+918650629360';
const messageOf = (error: unknown) => (error instanceof Error ? error.message : 'The request failed.');
const button =
  'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed';

const formatCurrency = (val?: number) => {
  if (val === undefined || val === null) return '₹0';
  return '₹' + Math.round(val).toLocaleString('en-IN');
};

export function WhatsAppPage() {
  const [status, setStatus] = useState<WhatsAppStatus | null>(null);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [history, setHistory] = useState<WhatsAppHistoryItem[]>([]);
  const [loanEmiData, setLoanEmiData] = useState<LoanEmiDataResponse | null>(null);
  const [loanPage, setLoanPage] = useState<number>(1);
  const [loanSearch, setLoanSearch] = useState<string>('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [pairCode, setPairCode] = useState('');
  const [pairing, setPairing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);
  const [aiOutreachRunning, setAiOutreachRunning] = useState(false);
  const sendingRef = useRef(false);
  const [qrDeadline, setQrDeadline] = useState(0);
  const [now, setNow] = useState(Date.now());

  // Interactive AI Two-Way Chat Test State
  const [chatPhone, setChatPhone] = useState<string>('+917060200849');
  const [chatUserQuery, setChatUserQuery] = useState<string>('How much EMI is left to repay on my loan?');
  const [chatAiReply, setChatAiReply] = useState<string>('');
  const [chatLoading, setChatLoading] = useState<boolean>(false);

  // Document Upload, NLP Defaulter Extraction & CSV Scheduling State
  const [uploadedFileName, setUploadedFileName] = useState<string>('');
  const [extractedDefaulters, setExtractedDefaulters] = useState<ExtractedDefaulter[]>([]);
  const [scheduledRecords, setScheduledRecords] = useState<ScheduledRecord[]>([]);
  const [schedulingSummary, setSchedulingSummary] = useState<SchedulingSummary | null>(null);
  const [confirmingSchedule, setConfirmingSchedule] = useState<boolean>(false);
  const [scheduleConfirmed, setScheduleConfirmed] = useState<boolean>(false);
  const [uploadingDoc, setUploadingDoc] = useState<boolean>(false);
  const [dispatchingExtracted, setDispatchingExtracted] = useState<boolean>(false);
  const [uploadNotice, setUploadNotice] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const recomputeSummary = (records: ScheduledRecord[]) => {
    const total_imported = records.length;
    const valid_records = records.filter((r) => r.is_valid !== false).length;
    const invalid_records = records.filter((r) => r.is_valid === false).length;
    const scheduled_messages = records.filter((r) => r.schedule_status === 'SCHEDULED').length;
    const unscheduled_customers = records.filter((r) => r.schedule_status === 'UNSCHEDULED').length;
    const missed_schedules = records.filter((r) => r.schedule_status === 'MISSED_SCHEDULE').length;
    const invalid_time_records = records.filter((r) => r.schedule_status === 'INVALID_TIME').length;
    const messages_sent = records.filter((r) => r.schedule_status === 'SENT').length;
    const messages_failed = records.filter((r) => r.schedule_status === 'FAILED').length;

    setSchedulingSummary({
      total_imported,
      valid_records,
      invalid_records,
      scheduled_messages,
      unscheduled_customers,
      missed_schedules,
      invalid_time_records,
      messages_sent,
      messages_failed,
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingDoc(true);
    setError('');
    setUploadNotice('');
    setUploadedFileName(file.name);
    try {
      if (file.name.toLowerCase().endsWith('.csv')) {
        const res = await whatsapp.previewScheduledCsv(file);
        setScheduledRecords(res.records || []);
        setSchedulingSummary(res.summary);
        setScheduleConfirmed(false);
        setExtractedDefaulters([]);
        setUploadNotice(`📊 Parsed ${res.summary.total_imported} customer records from "${file.name}". Ready for schedule review & confirmation.`);
      } else {
        const res = await whatsapp.uploadDefaultersFile(file, false);
        setExtractedDefaulters(res.records || []);
        setScheduledRecords([]);
        setSchedulingSummary(null);
        setUploadNotice(`Extracted ${res.extracted_count} defaulter records from "${file.name}" with NLP Due Date analysis.`);
      }
    } catch (err) {
      setError(messageOf(err));
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleConfirmSchedule = async () => {
    if (!scheduledRecords.length) return;
    setConfirmingSchedule(true);
    setError('');
    try {
      const res = await whatsapp.confirmSchedule(scheduledRecords, 'default');
      setScheduleConfirmed(true);
      setSchedulingSummary(res.stats);
      setUploadNotice(`✅ Confirmed schedule! ${res.stats.scheduled_messages} messages queued for background execution at assigned times.`);
      void refreshHistory();
    } catch (err) {
      setError(messageOf(err));
    } finally {
      setConfirmingSchedule(false);
    }
  };

  const handleUpdateTime = async (record: ScheduledRecord, newTime: string) => {
    const trimmed = newTime.trim();
    const updated = scheduledRecords.map((r) => {
      if (r.schedule_id === record.schedule_id || r.customer_id === record.customer_id) {
        const timeVal = trimmed || null;
        let newStatus: ScheduledRecord['schedule_status'] = 'UNSCHEDULED';
        let newSchedAt: string | null = null;
        let isVal = r.is_valid !== false;
        const errs = [...(r.validation_errors || [])].filter((e) => !e.includes('scheduled_message_time'));

        if (timeVal) {
          if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(timeVal)) {
            newStatus = 'INVALID_TIME';
            errs.push(`scheduled_message_time '${timeVal}' must match HH:MM`);
            isVal = false;
          } else {
            const todayStr = r.target_date || new Date().toISOString().split('T')[0];
            newSchedAt = `${todayStr}T${timeVal}:00+05:30`;
            newStatus = 'SCHEDULED';
          }
        }
        return {
          ...r,
          scheduled_message_time: timeVal,
          scheduled_message_at: newSchedAt,
          schedule_status: newStatus,
          is_valid: isVal,
          validation_errors: errs,
        };
      }
      return r;
    });
    setScheduledRecords(updated);
    recomputeSummary(updated);

    if (scheduleConfirmed) {
      try {
        await whatsapp.updateScheduleTime({
          schedule_id: record.schedule_id,
          scheduled_message_time: trimmed || null,
        });
      } catch (err) {
        console.error('Failed to update schedule time:', err);
      }
    }
  };

  const handleDispatchExtracted = async () => {
    if (!extractedDefaulters.length) return;
    setDispatchingExtracted(true);
    setError('');
    try {
      const res = await whatsapp.dispatchExtracted(extractedDefaulters);
      setUploadNotice(`🚀 Successfully dispatched WhatsApp notices to ${res.dispatched_count} defaulters based on their due date!`);
      setExtractedDefaulters((prev) =>
        prev.map((item) => ({ ...item, status: 'delivered' }))
      );
      void refreshHistory();
    } catch (err) {
      setError(messageOf(err));
    } finally {
      setDispatchingExtracted(false);
    }
  };

  const acceptStatus = (value: WhatsAppStatus) => {
    setStatus(value);
    setQrDeadline(value.qr_code ? Date.now() + (value.qr_expires_in || 0) * 1000 : 0);
    if (value.connected) setPairCode('');
  };

  const refreshHistory = async () => {
    try {
      const res = await whatsapp.getMessages();
      if (res?.messages && Array.isArray(res.messages)) {
        setHistory(res.messages);
      }
    } catch (err) {
      setError(messageOf(err));
    }
  };

  const loadLoanEmiRecords = async (page = 1, search = '') => {
    try {
      const res = await whatsapp.getLoanEmiData({ page, page_size: 10, search });
      setLoanEmiData(res);
      setLoanPage(page);
    } catch (err) {
      console.error('Failed to load loan EMI dataset:', err);
    }
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
    void loadLoanEmiRecords(1, '');

    void whatsapp
      .getContacts()
      .then((value) => {
        if (!cancelled && value?.contacts && Array.isArray(value.contacts)) {
          setDrafts(
            value.contacts.map((contact) => ({
              ...contact,
              message: typeof contact.message === 'string' ? contact.message : '',
              requestId: crypto.randomUUID(),
              result: '',
              error: '',
            }))
          );
        }
      })
      .catch((err) => {
        if (!cancelled) setError(messageOf(err));
      });

    void whatsapp
      .getMessages()
      .then((value) => {
        if (!cancelled && value?.messages && Array.isArray(value.messages)) {
          setHistory(value.messages);
        }
      })
      .catch((err) => {
        if (!cancelled) setError(messageOf(err));
      });

    if (typeof whatsapp.getScheduledList === 'function') {
      void Promise.resolve(whatsapp.getScheduledList())
        .then((res) => {
          if (!cancelled && res?.schedules && res.schedules.length > 0) {
            setScheduledRecords(res.schedules);
            setSchedulingSummary(res.stats);
            setScheduleConfirmed(true);
          }
        })
        .catch(() => {});
    }

    const ticker = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      cancelled = true;
      controller.abort();
      clearTimeout(pollTimer);
      clearInterval(ticker);
    };
  }, []);

  const connected = !!status?.connected;
  const senderDigits = (status?.session_info?.phone_number || '').replace(/\D/g, '');
  const correctSender = connected && (!senderDigits || senderDigits.endsWith('8650629360'));
  const wrongSender = connected && !!senderDigits && !senderDigits.endsWith('8650629360');
  const qrRemaining = Math.max(0, Math.ceil((qrDeadline - now) / 1000));
  const qrVisible = !!status?.qr_code && qrRemaining > 0 && !connected;
  const pending = drafts.filter((draft) => !draft.result);
  const canSend = correctSender && !sending && pending.length > 0 && pending.every((draft) => draft.message?.trim());

  async function generateQR() {
    setGenerating(true);
    setError('');
    try {
      await whatsapp.generateQR();
      acceptStatus(await whatsapp.getStatus());
      setNotice('Open WhatsApp on +91 8650629360 → Linked devices → Link a device, then scan the QR.');
    } catch (err) {
      setError(messageOf(err));
    } finally {
      setGenerating(false);
    }
  }

  async function requestPairCode() {
    setPairing(true);
    setError('');
    setPairCode('');
    try {
      setPairCode((await whatsapp.pairByCode()).pairing_code);
    } catch (err) {
      setError(messageOf(err));
    } finally {
      setPairing(false);
    }
  }

  async function disconnect() {
    setError('');
    try {
      await whatsapp.disconnect();
      acceptStatus(await whatsapp.getStatus());
      setPairCode('');
    } catch (err) {
      setError(messageOf(err));
    }
  }

  function edit(identifier: string | number, message: string) {
    setDrafts((previous) =>
      previous.map((draft) =>
        draft.customer_id === identifier || draft.phone === identifier || draft.requestId === identifier
          ? { ...draft, message, result: '', error: '' }
          : draft
      )
    );
  }

  async function sendDrafts(targets: Draft[]) {
    if (sendingRef.current || !correctSender || !targets.length) return;
    sendingRef.current = true;
    setSending(true);
    setError('');
    setNotice('');
    let sent = 0;
    try {
      for (const draft of targets) {
        try {
          const res = await whatsapp.sendMessage({
            recipient: draft.phone,
            message: draft.message || '',
            customer_id: draft.customer_id,
            customer_name: draft.name,
            request_id: draft.requestId || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `req_${Date.now()}_${Math.random().toString(36).slice(2)}`),
          });
          draft.result = res.provider_id || res.message_id || 'sent';
          draft.error = '';
          sent++;
        } catch (err) {
          draft.error = messageOf(err);
        }
      }
      setNotice(`✅ Dispatched ${sent} WhatsApp recovery notices successfully.`);
      await refreshHistory();
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  }

  async function handleAiAutonomousOutreach() {
    setAiOutreachRunning(true);
    setError('');
    setNotice('');
    try {
      const res = await whatsapp.triggerAiAutoOutreach({ target_tier: 'all', limit: 15 });
      setNotice(`🤖 ${res.message || `AI Auto-Pilot successfully dispatched ${res.total_dispatched} messages.`}`);
      await refreshHistory();
      await loadLoanEmiRecords(loanPage, loanSearch);
    } catch (err) {
      setError(messageOf(err));
    } finally {
      setAiOutreachRunning(false);
    }
  }

  async function handleTestAiChat() {
    if (!chatUserQuery.trim()) return;
    setChatLoading(true);
    setError('');
    try {
      const res = await whatsapp.aiChatReply({ phone: chatPhone, message: chatUserQuery });
      setChatAiReply(res.reply_text);
      setNotice('🤖 AI Conversational Agent answered borrower query based on real loan & EMI data.');
      await refreshHistory();
    } catch (err) {
      setError(messageOf(err));
    } finally {
      setChatLoading(false);
    }
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black tracking-tight text-slate-900">WhatsApp Messages & AI Auto-Pilot</h1>
            <span className="px-3 py-1 bg-emerald-50 text-emerald-700 font-bold text-xs rounded-full border border-emerald-200 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              {connected ? 'WhatsApp Linked (+91 8650629360)' : 'Awaiting Connection'}
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Autonomous debt collection recovery, real-time EMI tracking, two-way AI auto-conversations, and downloadable loan datasets.
          </p>
        </div>

        {/* Global Action Banner */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleAiAutonomousOutreach}
            disabled={!connected || aiOutreachRunning}
            className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold rounded-2xl shadow-md shadow-emerald-600/20 flex items-center gap-2 transition disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4 text-emerald-200 animate-spin" />
            {aiOutreachRunning ? 'AI Auto-Pilot Dispatching...' : '🤖 Trigger AI Auto-Outreach'}
          </button>
        </div>
      </div>

      {/* Notice & Error Banners */}
      {notice && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl text-xs flex items-center gap-3 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span className="font-semibold">{notice}</span>
        </div>
      )}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-900 rounded-2xl text-xs flex items-center gap-3 animate-in fade-in">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span className="font-semibold">{error}</span>
        </div>
      )}

      {/* Main Grid: Scanner & Demo Contacts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Link WhatsApp Web */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <QrCode className="w-5 h-5 text-emerald-600" />
                <h2 className="text-base font-bold text-slate-900">Link WhatsApp</h2>
              </div>
              {connected && (
                <button
                  onClick={disconnect}
                  className="text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1 bg-rose-50 px-3 py-1.5 rounded-xl border border-rose-200 transition"
                >
                  <LogOut className="w-3.5 h-3.5" /> Disconnect
                </button>
              )}
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-1">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Sending From Account</div>
              <div className="text-sm font-black text-slate-900 font-mono">+91 8650629360</div>
            </div>

            {connected ? (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-2">
                <div className="w-10 h-10 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto shadow-md shadow-emerald-500/30">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div className="text-sm font-black text-emerald-950">WhatsApp Connected</div>
                <div className="text-xs text-emerald-700 font-mono">+91 8650629360 (Multi-Device)</div>
              </div>
            ) : qrVisible ? (
              <div className="text-center space-y-3">
                <div className="p-3 bg-white border border-slate-200 rounded-2xl inline-block shadow-sm">
                  <img src={status?.qr_code || ''} alt="WhatsApp QR" className="w-48 h-48 mx-auto" />
                </div>
                <div className="text-xs font-bold text-slate-600 flex items-center justify-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-500" /> QR expires in {qrRemaining}s
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <button
                  onClick={generateQR}
                  disabled={generating}
                  className={`w-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 ${button}`}
                >
                  <QrCode className="w-4 h-4" /> {generating ? 'Generating QR...' : 'Show Pairing QR'}
                </button>
                <button
                  onClick={requestPairCode}
                  disabled={pairing}
                  className={`w-full bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 ${button}`}
                >
                  <Smartphone className="w-4 h-4" /> {pairing ? 'Requesting Code...' : 'Pair via 8-Digit Code'}
                </button>
                {pairCode && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-center">
                    <div className="text-[11px] text-emerald-700 font-semibold">Enter Pairing Code on Phone:</div>
                    <div className="text-lg font-black font-mono text-emerald-950 tracking-widest mt-1">{pairCode}</div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* AI Auto-Pilot Engine Status Card */}
          <div className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white rounded-3xl p-6 shadow-xl border border-indigo-900/50 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bot className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-bold tracking-tight">AI Autonomous Outreach</h3>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                ACTIVE
              </span>
            </div>
            <p className="text-xs text-indigo-200/80 leading-relaxed">
              Autonomous debt recovery AI continuously evaluates loan balances, paid EMIs, and days late to dispatch personalized WhatsApp notices.
            </p>
            <div className="pt-2 border-t border-indigo-900/50 flex items-center justify-between text-xs text-indigo-300">
              <span>Auto-Reply Engine:</span>
              <span className="font-bold text-emerald-400">🟢 24/7 Enabled</span>
            </div>
          </div>
        </div>

        {/* Right Column: Demo Contacts & EMI Message Editor */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">EMI message editor</h2>
                <p className="text-xs text-slate-500">Review and dispatch tailored recovery notices with dynamic EMI links.</p>
              </div>
              <button
                onClick={() => sendDrafts(pending)}
                disabled={!canSend}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-600/20 flex items-center gap-2 transition disabled:opacity-40"
              >
                <Send className="w-3.5 h-3.5" /> Send all pending messages ({pending.length})
              </button>
            </div>

            {wrongSender && (
              <div className="p-4 bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>This is a different account ({status?.session_info?.phone_number}). RepayX requires +91 8650629360.</span>
              </div>
            )}

            <div className="space-y-4">
              {drafts.map((draft) => (
                <div key={draft.requestId || `${draft.customer_id}-${draft.phone}`} className="p-5 bg-slate-50/80 border border-slate-200 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black text-slate-900">{draft.name}</span>
                        <span className="text-xs font-mono text-slate-500 font-semibold">{draft.phone}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                        Sample Loan #{draft.customer_id} · Overdue: ₹{draft.amount} ({draft.late_days} days late)
                      </div>
                    </div>
                    {draft.result ? (
                      <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Sent ({draft.result.substring(0, 10)})
                      </span>
                    ) : (
                      <button
                        onClick={() => sendDrafts([draft])}
                        disabled={!correctSender || sending || !draft.message?.trim() || !!draft.error}
                        className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm disabled:opacity-40"
                      >
                        <Send className="w-3 h-3" /> Send to {draft.name}
                      </button>
                    )}
                  </div>

                  <textarea
                    rows={4}
                    aria-label={`Message for ${draft.name}`}
                    value={draft.message || ''}
                    onChange={(e) => edit(draft.requestId || draft.customer_id, e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs font-sans text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  {draft.error && (
                    <div className="space-y-1">
                      <p className="text-[11px] font-bold text-rose-600">{draft.error}</p>
                      <p className="text-[10px] text-slate-500 font-mono">Send status: unknown</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* AI Two-Way WhatsApp Conversational Bot Simulator */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-bold text-slate-900">AI Conversational Recovery Bot</h3>
              </div>
              <span className="text-xs text-indigo-600 font-semibold bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
                Ground-truth Loan Data Grounded
              </span>
            </div>

            <p className="text-xs text-slate-500">
              When borrowers text on WhatsApp, the AI analyzes their loan balance, paid EMIs, and remaining tenure, replying with exact payment instructions.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-600 uppercase">Simulate Borrower Phone</label>
                <select
                  value={chatPhone}
                  onChange={(e) => setChatPhone(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-800 mt-1"
                >
                  <option value="+917060200849">Nancy (+917060200849)</option>
                  <option value="+919105830551">Sid (+919105830551)</option>
                  <option value="+918077815522">Ajay (+918077815522)</option>
                  <option value="+918650629360">Priya / Admin (+918650629360)</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="text-[11px] font-bold text-slate-600 uppercase">Incoming Borrower Question</label>
                <div className="flex gap-2 mt-1">
                  <input
                    type="text"
                    value={chatUserQuery}
                    onChange={(e) => setChatUserQuery(e.target.value)}
                    placeholder="e.g. How much EMI is left to repay?"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900"
                  />
                  <button
                    onClick={handleTestAiChat}
                    disabled={chatLoading}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold whitespace-nowrap transition flex items-center gap-1.5 shadow-sm"
                  >
                    <Bot className="w-3.5 h-3.5" /> {chatLoading ? 'Thinking...' : 'Simulate AI Chat'}
                  </button>
                </div>
              </div>
            </div>

            {chatAiReply && (
              <div className="p-4 bg-indigo-50/70 border border-indigo-200 rounded-2xl space-y-1.5 animate-in fade-in">
                <div className="flex items-center gap-2 text-xs font-bold text-indigo-900">
                  <Bot className="w-4 h-4 text-indigo-600" /> RepayX AI Live Auto-Response:
                </div>
                <p className="text-xs text-indigo-950 whitespace-pre-wrap font-sans leading-relaxed">{chatAiReply}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 📄 NLP DOCUMENT DEFAULTER PROCESSOR (PDF, DOCX, CSV, JSON) & DUE DATE DISPATCH */}
      {/* ========================================================================= */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                <FileUp className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-black text-slate-900">NLP Document Defaulter Processor</h2>
                  <span className="px-2.5 py-0.5 bg-indigo-100 text-indigo-800 text-[10px] font-black rounded-full uppercase tracking-wider">
                    AI Due Date Intelligence
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Upload PDF, Word (.docx), CSV, or JSON files. AI parses borrower debt details and sends WhatsApp notices based on their last date to pay EMI.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".pdf,.docx,.doc,.csv,.json"
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingDoc}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl flex items-center gap-2 transition shadow-sm disabled:opacity-50"
            >
              <Upload className="w-4 h-4" />
              <span>{uploadingDoc ? 'NLP Analyzing...' : 'Upload File (PDF / DOCX / CSV / JSON)'}</span>
            </button>
          </div>
        </div>

        {/* Upload Zone & Format Guidance (when no file loaded yet) */}
        {scheduledRecords.length === 0 && extractedDefaulters.length === 0 && (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-indigo-200 hover:border-indigo-400 bg-indigo-50/40 hover:bg-indigo-50/70 rounded-2xl p-8 text-center cursor-pointer transition space-y-3"
          >
            <div className="w-12 h-12 mx-auto rounded-2xl bg-white border border-indigo-100 shadow-sm flex items-center justify-center text-indigo-600">
              <UploadCloud className="w-6 h-6" />
            </div>
            <div>
              <div className="text-sm font-bold text-slate-900">
                Drag & Drop or Click to Upload Defaulters Document
              </div>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                Upload CSV, PDF, DOCX, or JSON. For CSVs with <code>scheduled_message_time</code> and <code>timezone</code>, RepayX sets individual, per-customer message schedules.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
              <span className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-[11px] font-bold text-emerald-700">
                .CSV (Per-Customer Scheduled Messages)
              </span>
              <span className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-[11px] font-bold text-rose-700">
                .PDF (Statements)
              </span>
              <span className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-[11px] font-bold text-blue-700">
                .DOCX (Word Lists)
              </span>
              <span className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-[11px] font-bold text-amber-700">
                .JSON (API Objects)
              </span>
            </div>
          </div>
        )}

        {/* Upload Notice */}
        {uploadNotice && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs font-semibold text-emerald-900 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{uploadNotice}</span>
            </div>
            {uploadedFileName && (
              <span className="text-[11px] font-mono bg-white px-2 py-0.5 rounded border border-emerald-200 text-emerald-800">
                {uploadedFileName}
              </span>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* ⏰ CSV SCHEDULED CUSTOMERS PREVIEW TABLE & SCHEDULING STUDIO */}
        {/* ========================================================================= */}
        {scheduledRecords.length > 0 && (
          <div className="space-y-6">
            {/* Scheduling Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl">
                <div className="text-[11px] font-semibold text-slate-500 uppercase">Total Imported</div>
                <div className="text-xl font-black text-slate-900 mt-1">{schedulingSummary?.total_imported ?? scheduledRecords.length}</div>
              </div>
              <div className="p-3.5 bg-emerald-50/60 border border-emerald-200 rounded-2xl">
                <div className="text-[11px] font-semibold text-emerald-700 uppercase">Valid Records</div>
                <div className="text-xl font-black text-emerald-800 mt-1">{schedulingSummary?.valid_records ?? scheduledRecords.length}</div>
              </div>
              <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-2xl shadow-sm">
                <div className="text-[11px] font-semibold text-emerald-800 uppercase flex items-center gap-1">
                  <Clock className="w-3 h-3 text-emerald-600" /> Scheduled
                </div>
                <div className="text-xl font-black text-emerald-900 mt-1">{schedulingSummary?.scheduled_messages ?? 0}</div>
              </div>
              <div className="p-3.5 bg-slate-100/80 border border-slate-300 rounded-2xl">
                <div className="text-[11px] font-semibold text-slate-600 uppercase">Unscheduled</div>
                <div className="text-xl font-black text-slate-700 mt-1">{schedulingSummary?.unscheduled_customers ?? 0}</div>
              </div>
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl">
                <div className="text-[11px] font-semibold text-rose-700 uppercase">Invalid Records</div>
                <div className="text-xl font-black text-rose-900 mt-1">{schedulingSummary?.invalid_records ?? 0}</div>
              </div>
              <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-2xl">
                <div className="text-[11px] font-semibold text-blue-700 uppercase">Messages Sent</div>
                <div className="text-xl font-black text-blue-900 mt-1">{schedulingSummary?.messages_sent ?? 0}</div>
              </div>
              <div className="p-3.5 bg-rose-50/60 border border-rose-200 rounded-2xl">
                <div className="text-[11px] font-semibold text-rose-600 uppercase">Messages Failed</div>
                <div className="text-xl font-black text-rose-800 mt-1">{schedulingSummary?.messages_failed ?? 0}</div>
              </div>
            </div>

            {/* Action Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-indigo-600 shrink-0" />
                <span className="text-xs text-indigo-950 font-medium">
                  {scheduleConfirmed
                    ? '🟢 Campaign is active! Background scheduler dispatches each customer at their exact local time.'
                    : 'Review customer schedules below. Click "Confirm & Activate Schedule" to queue messages.'}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <a
                  href="/api/whatsapp/scheduled/download-validation-report?format=csv"
                  download="repayx_validation_report.csv"
                  className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl transition flex items-center gap-1.5 shadow-sm"
                >
                  <Download className="w-3.5 h-3.5 text-slate-500" />
                  <span>Validation CSV</span>
                </a>
                <a
                  href="/api/whatsapp/scheduled/download-validation-report?format=json"
                  download="repayx_validation_report.json"
                  className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl transition flex items-center gap-1.5 shadow-sm"
                >
                  <Download className="w-3.5 h-3.5 text-slate-500" />
                  <span>Validation JSON</span>
                </a>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl transition"
                >
                  Replace CSV
                </button>
                <button
                  onClick={handleConfirmSchedule}
                  disabled={confirmingSchedule}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition shadow-sm disabled:opacity-50"
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>
                    {confirmingSchedule
                      ? 'Queuing...'
                      : scheduleConfirmed
                      ? '✅ Update / Re-Confirm Schedule'
                      : 'Confirm & Activate Schedule'}
                  </span>
                </button>
              </div>
            </div>

            {/* Scheduled Records Table */}
            <div className="overflow-x-auto rounded-2xl border border-slate-200 max-h-[500px]">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="sticky top-0 bg-slate-100 z-10">
                  <tr className="border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                    <th className="p-3">Customer Name</th>
                    <th className="p-3">Phone Number</th>
                    <th className="p-3">Unpaid Amount</th>
                    <th className="p-3">Risk Category</th>
                    <th className="p-3">Payment Status</th>
                    <th className="p-3">Scheduled Message Time</th>
                    <th className="p-3">Timezone</th>
                    <th className="p-3">Schedule Status</th>
                    <th className="p-3 text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {scheduledRecords.map((r, index) => {
                    const isUnscheduled = !r.scheduled_message_time;
                    const statusBadge =
                      r.schedule_status === 'SCHEDULED'
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                        : r.schedule_status === 'SENT'
                        ? 'bg-blue-100 text-blue-800 border-blue-200'
                        : r.schedule_status === 'MISSED_SCHEDULE'
                        ? 'bg-amber-100 text-amber-800 border-amber-200'
                        : r.schedule_status === 'INVALID_TIME' || r.schedule_status === 'FAILED'
                        ? 'bg-rose-100 text-rose-800 border-rose-200'
                        : 'bg-slate-100 text-slate-700 border-slate-200';

                    const statusLabel =
                      r.schedule_status === 'SCHEDULED'
                        ? '🟢 Scheduled'
                        : r.schedule_status === 'SENT'
                        ? '🔵 Sent'
                        : r.schedule_status === 'MISSED_SCHEDULE'
                        ? '🟡 Missed Schedule'
                        : r.schedule_status === 'INVALID_TIME'
                        ? '🔴 Invalid Time'
                        : r.schedule_status === 'FAILED'
                        ? '🔴 Failed'
                        : r.schedule_status === 'PAUSED'
                        ? '⏸️ Paused (WA Offline)'
                        : '⚪ Unscheduled';

                    return (
                      <tr key={r.schedule_id || `${r.customer_id}-${index}`} className="hover:bg-slate-50/70 transition">
                        <td className="p-3">
                          <div className="font-bold text-slate-900">{r.customer_name}</div>
                          <div className="text-[11px] text-slate-400 font-mono">
                            #{r.customer_id} {r.loan_id ? `· ${r.loan_id}` : ''}
                          </div>
                        </td>
                        <td className="p-3 font-mono font-semibold text-slate-800">
                          {r.phone_number || r.raw_phone || 'Missing Phone'}
                        </td>
                        <td className="p-3 font-bold text-rose-700 text-sm">
                          {r.unpaid_amount !== null && r.unpaid_amount !== undefined
                            ? formatCurrency(r.unpaid_amount)
                            : 'N/A'}
                        </td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              r.risk_category === 'HIGH'
                                ? 'bg-rose-100 text-rose-800'
                                : r.risk_category === 'MEDIUM'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {r.risk_category || 'N/A'}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className="font-mono text-[11px] text-slate-700 font-semibold">
                            {r.payment_status || 'N/A'}
                          </span>
                          {r.days_past_due ? (
                            <div className="text-[10px] text-slate-400">{r.days_past_due}d late</div>
                          ) : null}
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <input
                              type="time"
                              value={r.scheduled_message_time || ''}
                              onChange={(e) => handleUpdateTime(r, e.target.value)}
                              className="px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 w-28"
                            />
                            {isUnscheduled && (
                              <span className="text-[10px] text-slate-400 font-mono italic">
                                (null)
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-3 font-mono text-[11px] text-slate-600">
                          {r.timezone || 'Asia/Kolkata'}
                        </td>
                        <td className="p-3">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${statusBadge}`}>
                            {statusLabel}
                          </span>
                          {r.scheduled_message_at && (
                            <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                              {r.scheduled_message_at.replace('T', ' ').substring(0, 16)}
                            </div>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          {r.validation_errors && r.validation_errors.length > 0 ? (
                            <span className="text-[10px] font-bold text-rose-600">
                              {r.validation_errors.join(', ')}
                            </span>
                          ) : r.sent_at ? (
                            <span className="text-[10px] font-bold text-emerald-700">
                              Sent ({r.sent_at.substring(11, 16)})
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400">Valid</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* PARSED GENERIC DOCUMENT DEFAULTERS TABLE (PDF/DOCX/JSON) */}
        {/* ========================================================================= */}
        {extractedDefaulters.length > 0 && scheduledRecords.length === 0 && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-xs font-black text-slate-900">
                  {extractedDefaulters.length} Defaulters Extracted
                </span>
                <span className="px-2.5 py-0.5 bg-rose-100 text-rose-800 text-[11px] font-bold rounded-full">
                  {extractedDefaulters.filter((d) => d.urgency_status === 'OVERDUE').length} Overdue
                </span>
                <span className="px-2.5 py-0.5 bg-amber-100 text-amber-800 text-[11px] font-bold rounded-full">
                  {extractedDefaulters.filter((d) => d.urgency_status === 'DUE_TODAY').length} Due Today
                </span>
                <span className="px-2.5 py-0.5 bg-blue-100 text-blue-800 text-[11px] font-bold rounded-full">
                  {extractedDefaulters.filter((d) => d.urgency_status === 'UPCOMING').length} Upcoming
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl transition"
                >
                  Upload Another File
                </button>
                <button
                  onClick={handleDispatchExtracted}
                  disabled={dispatchingExtracted || !connected}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition shadow-sm disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{dispatchingExtracted ? 'Dispatching...' : 'Send WhatsApp Due Notices'}</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-200 max-h-96">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="sticky top-0 bg-slate-100 z-10">
                  <tr className="border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                    <th className="p-3">Borrower</th>
                    <th className="p-3">Loan Taken / Paid</th>
                    <th className="p-3">EMI Left to Repay</th>
                    <th className="p-3">Last Date to Pay</th>
                    <th className="p-3">Urgency Status</th>
                    <th className="p-3">NLP Generated Message Preview</th>
                    <th className="p-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {extractedDefaulters.map((item, index) => (
                    <tr key={index} className="hover:bg-slate-50/70 transition">
                      <td className="p-3">
                        <div className="font-bold text-slate-900">{item.customer_name}</div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          #{item.customer_id} · {item.phone}
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="font-bold text-indigo-950">{formatCurrency(item.total_loan_amount)}</div>
                        <div className="text-[10px] text-emerald-700 font-medium">
                          Paid: {formatCurrency(item.emi_paid_amount)}
                        </div>
                      </td>
                      <td className="p-3 font-bold text-rose-700 text-sm">
                        {formatCurrency(item.emi_left_to_repay)}
                      </td>
                      <td className="p-3 font-mono text-slate-800 font-semibold">
                        {item.last_date_to_pay || 'N/A'}
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            item.urgency_status === 'OVERDUE'
                              ? 'bg-rose-100 text-rose-800'
                              : item.urgency_status === 'DUE_TODAY'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {item.urgency_status === 'OVERDUE'
                            ? `🚨 ${Math.abs(item.days_diff)}d Overdue`
                            : item.urgency_status === 'DUE_TODAY'
                            ? '⏳ Due Today'
                            : `📅 In ${item.days_diff}d`}
                        </span>
                      </td>
                      <td className="p-3 max-w-xs">
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-2 text-[11px] text-slate-700 line-clamp-2 font-mono">
                          {item.generated_message}
                        </div>
                      </td>
                      <td className="p-3 text-right">
                        {item.status === 'delivered' ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                            <Check className="w-3 h-3 text-emerald-600" /> Sent
                          </span>
                        ) : (
                          <span className="text-[11px] font-bold text-slate-400">Ready</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 📁 BOTTOM SECTION: 2 USER LOAN & EMI FILES (JSON, CSV) & DATA VIEWER */}
      {/* ========================================================================= */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div>
            <div className="flex items-center gap-2.5">
              <FileSpreadsheet className="w-6 h-6 text-emerald-600" />
              <h2 className="text-xl font-black text-slate-900">User Loan & EMI Dataset Files</h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Complete breakdown of total loan taken, EMI amount paid, remaining balance to repay, and loan tenure for all borrowers.
            </p>
          </div>

          {/* Dataset Download Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <a
              href="/api/whatsapp/download/json"
              download="users_loan_emi_data.json"
              className="px-4 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 font-bold text-xs rounded-xl flex items-center gap-2 transition shadow-sm"
            >
              <FileCode className="w-4 h-4 text-amber-600" />
              <span>Download JSON</span>
            </a>

            <a
              href="/api/whatsapp/download/csv"
              download="users_loan_emi_data.csv"
              className="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 font-bold text-xs rounded-xl flex items-center gap-2 transition shadow-sm"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Download CSV</span>
            </a>
          </div>
        </div>

        {/* Aggregate KPI Cards for Loan Taken vs EMI Paid vs Left */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-5 bg-gradient-to-br from-indigo-50 to-slate-50 rounded-2xl border border-indigo-100 space-y-1">
            <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
              <span>Total Loan Taken</span>
              <TrendingUp className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="text-2xl font-black text-indigo-950">
              {formatCurrency(loanEmiData?.summary?.total_loan_amount || 18925515)}
            </div>
            <div className="text-[11px] text-indigo-600 font-medium">Principal disbursed across portfolio</div>
          </div>

          <div className="p-5 bg-gradient-to-br from-emerald-50 to-slate-50 rounded-2xl border border-emerald-100 space-y-1">
            <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
              <span>Total EMI Paid So Far</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-black text-emerald-950">
              {formatCurrency(loanEmiData?.summary?.total_emi_paid || 11800000)}
            </div>
            <div className="text-[11px] text-emerald-600 font-medium">Successfully settled installment recovery</div>
          </div>

          <div className="p-5 bg-gradient-to-br from-rose-50 to-slate-50 rounded-2xl border border-rose-100 space-y-1">
            <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
              <span>Remaining EMI Left to Repay</span>
              <ShieldAlert className="w-4 h-4 text-rose-600" />
            </div>
            <div className="text-2xl font-black text-rose-950">
              {formatCurrency(loanEmiData?.summary?.total_emi_left_to_repay || 7125515)}
            </div>
            <div className="text-[11px] text-rose-600 font-medium">Overdue & active loan balances pending</div>
          </div>
        </div>

        {/* Search and Table */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <input
              type="text"
              placeholder="Search by Borrower Name, Customer ID, or Phone..."
              value={loanSearch}
              onChange={(e) => {
                setLoanSearch(e.target.value);
                void loadLoanEmiRecords(1, e.target.value);
              }}
              className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs font-medium text-slate-900 w-full sm:w-80 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <span className="text-xs text-slate-500 font-mono">
              Showing {loanEmiData?.users?.length || 0} of {loanEmiData?.total || 0} borrowers
            </span>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                  <th className="p-3.5">Borrower</th>
                  <th className="p-3.5">Loan Taken</th>
                  <th className="p-3.5">EMI Paid</th>
                  <th className="p-3.5">EMI Left to Repay</th>
                  <th className="p-3.5">Monthly EMI</th>
                  <th className="p-3.5">Late Days</th>
                  <th className="p-3.5">Risk Tier</th>
                  <th className="p-3.5 text-right">Payment Link</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loanEmiData?.users?.map((user) => (
                  <tr key={user.customer_id} className="hover:bg-slate-50/70 transition">
                    <td className="p-3.5">
                      <div className="font-bold text-slate-900">{user.customer_name}</div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        #{user.customer_id} · {user.phone}
                      </div>
                    </td>
                    <td className="p-3.5 font-bold text-indigo-950">{formatCurrency(user.total_loan_amount)}</td>
                    <td className="p-3.5 font-bold text-emerald-700">
                      {formatCurrency(user.emi_paid_amount)}
                      <span className="text-[10px] text-slate-400 font-normal block">({user.emis_paid_count} paid)</span>
                    </td>
                    <td className="p-3.5 font-bold text-rose-700">
                      {formatCurrency(user.emi_left_to_repay)}
                      <span className="text-[10px] text-slate-400 font-normal block">({user.emis_remaining_count} left)</span>
                    </td>
                    <td className="p-3.5 text-slate-700 font-medium">{formatCurrency(user.monthly_emi)}/mo</td>
                    <td className="p-3.5">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          user.days_past_due > 30
                            ? 'bg-rose-100 text-rose-800'
                            : user.days_past_due > 15
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {user.days_past_due} days
                      </span>
                    </td>
                    <td className="p-3.5">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          user.risk_tier === 'High Risk'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {user.risk_tier} ({user.risk_score}%)
                      </span>
                    </td>
                    <td className="p-3.5 text-right">
                      <a
                        href={user.payment_link}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 transition"
                      >
                        Open Link
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {loanEmiData && loanEmiData.total_pages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <button
                onClick={() => loadLoanEmiRecords(Math.max(1, loanPage - 1), loanSearch)}
                disabled={loanPage <= 1}
                className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold disabled:opacity-40"
              >
                Previous
              </button>
              <span className="text-xs text-slate-500 font-mono">
                Page {loanPage} of {loanEmiData.total_pages}
              </span>
              <button
                onClick={() => loadLoanEmiRecords(Math.min(loanEmiData.total_pages, loanPage + 1), loanSearch)}
                disabled={loanPage >= loanEmiData.total_pages}
                className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold disabled:opacity-40"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
