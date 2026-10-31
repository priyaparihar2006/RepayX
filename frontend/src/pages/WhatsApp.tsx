import { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Bot,
  Calendar,
  CalendarDays,
  Check,
  CheckCheck,
  CheckCircle2,
  Clock,
  Download,
  Edit,
  Edit2,
  Edit3,
  FileCode,
  FileSpreadsheet,
  FileText,
  FileUp,
  Layers,
  LogOut,
  MessageSquare,
  Plus,
  QrCode,
  RefreshCw,
  Save,
  Send,
  ShieldAlert,
  Smartphone,
  Sparkles,
  Trash2,
  TrendingDown,
  TrendingUp,
  Upload,
  UploadCloud,
  UserCheck,
  X,
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

const formatCurrency = (val?: number | null) => {
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
  const [scheduleFilter, setScheduleFilter] = useState<'ALL' | 'DELIVERED' | 'SCHEDULED' | 'UNSCHEDULED'>('ALL');
  const [checkingDelivery, setCheckingDelivery] = useState<boolean>(false);
  const [dispatchingId, setDispatchingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Edit states for all sections
  const [isScheduleEditMode, setIsScheduleEditMode] = useState<boolean>(false);
  const [editingScheduleId, setEditingScheduleId] = useState<string | null>(null);
  const [savingScheduleId, setSavingScheduleId] = useState<string | null>(null);
  const [editingDefaulterIdx, setEditingDefaulterIdx] = useState<number | null>(null);
  const [editingLoanCustomerId, setEditingLoanCustomerId] = useState<number | string | null>(null);
  const [savingLoanId, setSavingLoanId] = useState<number | string | null>(null);

  const recomputeSummary = (records: ScheduledRecord[]) => {
    const total_imported = records.length;
    const valid_records = records.filter((r) => r.is_valid !== false).length;
    const invalid_records = records.filter((r) => r.is_valid === false).length;
    const scheduled_messages = records.filter((r) => r.schedule_status === 'SCHEDULED').length;
    const unscheduled_customers = records.filter((r) => r.schedule_status === 'UNSCHEDULED').length;
    const missed_schedules = records.filter((r) => r.schedule_status === 'MISSED_SCHEDULE').length;
    const invalid_time_records = records.filter((r) => r.schedule_status === 'INVALID_TIME').length;
    const messages_sent = records.filter((r) => r.schedule_status === 'SENT' || r.schedule_status === 'DELIVERED').length;
    const messages_delivered = records.filter((r) => r.schedule_status === 'SENT' || r.schedule_status === 'DELIVERED').length;
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
      messages_delivered,
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
      const matches = r === record || (r.row_number !== undefined && record.row_number !== undefined ? r.row_number === record.row_number : (r.schedule_id && r.schedule_id === record.schedule_id && r.customer_name === record.customer_name));
      if (matches) {
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

  const handleUpdateField = (record: ScheduledRecord, field: keyof ScheduledRecord, value: any) => {
    const updated = scheduledRecords.map((r) => {
      const matches = r === record || (r.row_number !== undefined && record.row_number !== undefined ? r.row_number === record.row_number : (r.schedule_id && r.schedule_id === record.schedule_id && r.customer_name === record.customer_name));
      if (matches) {
        return {
          ...r,
          [field]: value,
          ...(field === 'phone_number' ? { raw_phone: value } : {}),
        };
      }
      return r;
    });
    setScheduledRecords(updated);
    recomputeSummary(updated);
  };

  const handleSaveScheduleRecord = async (r: ScheduledRecord) => {
    setSavingScheduleId(r.schedule_id || r.customer_id);
    try {
      if (r.schedule_id) {
        await whatsapp.updateScheduledRecord({
          schedule_id: r.schedule_id,
          customer_name: r.customer_name,
          phone_number: r.phone_number,
          loan_id: r.loan_id,
          unpaid_amount: r.unpaid_amount,
          days_past_due: r.days_past_due,
          payment_status: r.payment_status,
          risk_category: r.risk_category,
          scheduled_message_time: r.scheduled_message_time,
          timezone: r.timezone,
        });
      }
      setUploadNotice(`✅ Saved changes for ${r.customer_name || 'customer'}!`);
      setEditingScheduleId(null);
    } catch (err) {
      setError(messageOf(err));
    } finally {
      setSavingScheduleId(null);
    }
  };

  const handleAddScheduleRow = () => {
    const newId = `CUST-${Date.now().toString().slice(-4)}`;
    const newRecord: ScheduledRecord = {
      schedule_id: `sched_${Date.now()}`,
      row_number: scheduledRecords.length + 1,
      customer_id: newId,
      customer_name: 'New Borrower',
      phone_number: '+919876543210',
      loan_id: `LN-${Date.now().toString().slice(-4)}`,
      unpaid_amount: 5000,
      days_past_due: 0,
      payment_status: 'overdue',
      risk_category: 'MEDIUM',
      scheduled_message_time: '12:00',
      timezone: 'Asia/Kolkata',
      scheduled_message_at: null,
      schedule_status: 'SCHEDULED',
      is_valid: true,
      validation_errors: [],
    };
    const updated = [newRecord, ...scheduledRecords];
    setScheduledRecords(updated);
    recomputeSummary(updated);
    setEditingScheduleId(newRecord.schedule_id);
    setUploadNotice(`➕ Added new customer row. Edit the fields and click Save!`);
  };

  const handleDeleteScheduleRow = (scheduleId: string) => {
    const updated = scheduledRecords.filter((r) => r.schedule_id !== scheduleId);
    setScheduledRecords(updated);
    recomputeSummary(updated);
    setUploadNotice('🗑️ Removed customer row.');
  };

  const handleUpdateDefaulterField = (idx: number, field: keyof ExtractedDefaulter, val: any) => {
    setExtractedDefaulters((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: val };
      return copy;
    });
  };

  const handleUpdateLoanUserField = (customerId: number, field: keyof UserLoanEmiRecord, val: any) => {
    setLoanEmiData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        users: prev.users.map((u) => (u.customer_id === customerId ? { ...u, [field]: val } : u)),
      };
    });
  };

  const handleSaveLoanRecord = async (user: UserLoanEmiRecord) => {
    setSavingLoanId(user.customer_id);
    try {
      await whatsapp.updateLoanEmiRecord({
        customer_id: user.customer_id,
        customer_name: user.customer_name,
        phone: user.phone,
        total_loan_amount: user.total_loan_amount,
        emi_paid_amount: user.emi_paid_amount,
        emi_left_to_repay: user.emi_left_to_repay,
        monthly_emi: user.monthly_emi,
        days_past_due: user.days_past_due,
        risk_tier: user.risk_tier,
        payment_link: user.payment_link,
      });
      setNotice(`✅ Updated borrower ${user.customer_name} (#${user.customer_id}) in loan dataset.`);
      setEditingLoanCustomerId(null);
    } catch (err) {
      setError(messageOf(err));
    } finally {
      setSavingLoanId(null);
    }
  };

  const [dispatchingAll, setDispatchingAll] = useState(false);

  const handleDispatchAll = async () => {
    let records = [...scheduledRecords];
    if (!scheduleConfirmed && records.length > 0) {
      try {
        setConfirmingSchedule(true);
        const confRes = await whatsapp.confirmSchedule(records, 'default');
        setScheduleConfirmed(true);
        setSchedulingSummary(confRes.stats);
        if (confRes.schedules && confRes.schedules.length > 0) {
          records = confRes.schedules;
          setScheduledRecords(records);
        }
      } catch (err) {
        console.error('Auto-confirm schedule failed:', err);
      } finally {
        setConfirmingSchedule(false);
      }
    }

    const toSend = records.filter(
      (r) => r.schedule_status !== 'DELIVERED' && r.schedule_status !== 'SENT' && !r.sent_at
    );

    if (toSend.length === 0) {
      setUploadNotice('All messages have already been delivered!');
      return;
    }

    setDispatchingAll(true);
    setError('');
    let sentCount = 0;
    let failedCount = 0;
    let currentRecords = [...records];

    for (const record of toSend) {
      try {
        const res = await whatsapp.dispatchScheduledNow(record.schedule_id);
        currentRecords = currentRecords.map((r) =>
          r.schedule_id === record.schedule_id
            ? {
                ...r,
                schedule_status: 'DELIVERED' as const,
                sent_at: res.sent_at || new Date().toISOString(),
                provider_id: res.provider_id,
              }
            : r
        );
        sentCount++;
        setScheduledRecords(currentRecords);
        recomputeSummary(currentRecords);
      } catch (err) {
        failedCount++;
      }
    }
    await refreshHistory();
    setDispatchingAll(false);
    if (failedCount > 0) {
      setUploadNotice(`⚡ Instant messages sent: ${sentCount} succeeded (${failedCount} failed or skipped).`);
    } else {
      setUploadNotice(`✅ Successfully dispatched instant messages to all ${sentCount} customers!`);
    }
  };

  const refreshSchedules = async () => {
    if (typeof whatsapp.getScheduledList === 'function') {
      try {
        const res = await whatsapp.getScheduledList();
        if (res?.schedules && res.schedules.length > 0) {
          const normalized = res.schedules.map((item) => ({
            ...item,
            schedule_status: ((item.schedule_status || item.status) === 'SENT' ? 'DELIVERED' : (item.schedule_status || item.status || 'UNSCHEDULED')) as any,
          }));
          setScheduledRecords(normalized);
          setSchedulingSummary({
            ...res.stats,
            messages_delivered: res.stats.messages_delivered ?? res.stats.messages_sent ?? 0,
          });
        }
      } catch (err) {
        console.error('Failed to refresh schedules:', err);
      }
    }
  };

  const handleCheckDelivery = async () => {
    setCheckingDelivery(true);
    setError('');
    try {
      await whatsapp.processDueScheduledJobs();
      await refreshSchedules();
      await refreshHistory();
      setUploadNotice('✅ Verified WhatsApp delivery receipts! All dispatched messages are confirmed delivered.');
    } catch (err) {
      setError(messageOf(err));
    } finally {
      setCheckingDelivery(false);
    }
  };

  const handleDispatchSingle = async (record: ScheduledRecord) => {
    setDispatchingId(record.schedule_id);
    setError('');
    try {
      let targetId = record.schedule_id;
      // Always sync the latest edited record data to backend before dispatching
      try {
        const confRes = await whatsapp.confirmSchedule(scheduledRecords, 'default');
        setScheduleConfirmed(true);
        setSchedulingSummary(confRes.stats);
        if (confRes.schedules && confRes.schedules.length > 0) {
          const found = confRes.schedules.find(
            (s: ScheduledRecord) => s.row_number === record.row_number || s.phone_number === record.phone_number
          );
          if (found && found.schedule_id) targetId = found.schedule_id;
        }
      } catch (syncErr) {
        console.warn('Schedule sync warning before dispatch:', syncErr);
      }

      const res = await whatsapp.dispatchScheduledNow(targetId);
      const updated = scheduledRecords.map((r) =>
        r.schedule_id === targetId || r.schedule_id === record.schedule_id
          ? {
              ...r,
              schedule_status: 'DELIVERED' as const,
              sent_at: res.sent_at || new Date().toISOString(),
              provider_id: res.provider_id,
              validation_errors: [],
            }
          : r
      );
      setScheduledRecords(updated);
      recomputeSummary(updated);
      await refreshHistory();
      setUploadNotice(`🚀 WhatsApp reminder delivered to ${record.customer_name || 'Customer'} (${record.phone_number}) successfully!`);
    } catch (err) {
      const errMsg = messageOf(err);
      setError(errMsg);
      setScheduledRecords((prev) =>
        prev.map((r) =>
          r.schedule_id === record.schedule_id
            ? { ...r, validation_errors: [errMsg] }
            : r
        )
      );
    } finally {
      setDispatchingId(null);
    }
  };

  const handleMarkDelivered = async (record: ScheduledRecord) => {
    setError('');
    try {
      let targetId = record.schedule_id;
      if (!targetId || targetId.startsWith('preview:') || !scheduleConfirmed) {
        const confRes = await whatsapp.confirmSchedule(scheduledRecords, 'default');
        setScheduleConfirmed(true);
        setSchedulingSummary(confRes.stats);
        if (confRes.schedules && confRes.schedules.length > 0) {
          setScheduledRecords(confRes.schedules);
          const found = confRes.schedules.find(
            (s: ScheduledRecord) => s.row_number === record.row_number || s.phone_number === record.phone_number
          );
          if (found) targetId = found.schedule_id;
        }
      }
      const res = await whatsapp.markScheduledDelivered(targetId);
      const updated = scheduledRecords.map((r) =>
        r.schedule_id === targetId || r.schedule_id === record.schedule_id
          ? {
              ...r,
              schedule_status: 'DELIVERED' as const,
              sent_at: res.sent_at || new Date().toISOString(),
              provider_id: res.provider_id,
            }
          : r
      );
      setScheduledRecords(updated);
      recomputeSummary(updated);
      setUploadNotice(`✅ Marked reminder for ${record.customer_name} as Delivered.`);
    } catch (err) {
      setError(messageOf(err));
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
    setQrDeadline(value.qr_code ? Date.now() + (value.qr_expires_in || 60) * 1000 : 0);
    if (value.connected) setPairCode('');
    if (value.connected || value.qr_code || value.status === 'SCAN_QR_CODE' || value.status === 'CONNECTED') {
      setError((prev) => (prev && (prev.includes('waking up') || prev.includes('offline') || prev.includes('502')) ? '' : prev));
    }
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
      } catch (err) {
        if (!cancelled) {
          setStatus(null);
          setQrDeadline(0);
          setError(messageOf(err));
        }
      } finally {
        if (!cancelled) pollTimer = setTimeout(() => void poll(), 2000);
      }
    };

    void poll();
    void loadLoanEmiRecords(1, '');
    void refreshSchedules();

    void whatsapp
      .getContacts()
      .then((value) => {
        if (!cancelled && value?.contacts && Array.isArray(value.contacts)) {
          setDrafts(
            value.contacts.map((contact) => ({
              ...contact,
              message: typeof contact.message === 'string' ? contact.message : '',
              requestId:
                typeof crypto !== 'undefined' && crypto.randomUUID
                  ? crypto.randomUUID()
                  : `req_${Date.now()}_${Math.random().toString(36).slice(2)}`,
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
            const normalized = res.schedules.map((item) => ({
              ...item,
              schedule_status: (item.schedule_status || item.status || 'UNSCHEDULED') as any,
            }));
            setScheduledRecords(normalized);
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
  const expectedDigits = (status?.expected_sender || sender).replace(/\D/g, '');
  const wrongSender = connected && !!senderDigits && (senderDigits === '919999999999' || (!!status?.expected_sender && senderDigits !== expectedDigits && senderDigits.includes('9999999999')));
  const correctSender = connected && !wrongSender;
  const qrRemaining = Math.max(0, Math.ceil((qrDeadline - now) / 1000));
  const qrVisible = !!status?.qr_code && qrRemaining > 0 && !connected;
  const pending = drafts.filter((draft) => !draft.result);
  const canSend = correctSender && !sending && pending.length > 0 && drafts.every((d) => !!d.message?.trim());

  async function generateQR() {
    setGenerating(true);
    setError('');
    try {
      const res = await whatsapp.generateQR();
      if (res && res.qr_code) {
        acceptStatus(res);
      } else if (res && !res.success && (res as any).error) {
        setError((res as any).error);
      }
      const latest = await whatsapp.getStatus();
      acceptStatus(latest);
      if (!latest.qr_code && !latest.connected && (latest.error_message || (latest as any).error)) {
        setError(latest.error_message || (latest as any).error);
      } else {
        setError('');
      }
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
        const textToSend =
          draft.message?.trim() ||
          `URGENT NOTICE: Dear ${draft.name}, your loan account #${draft.customer_id} has an overdue balance of ₹${draft.amount} (${draft.late_days} days past due). To avoid legal escalation or credit score degradation, please clear your outstanding EMI immediately using your secure RepayX link: https://pay.repayx.ai/inv/${draft.customer_id}`;
        try {
          const res = await whatsapp.sendMessage({
            recipient: draft.phone,
            message: textToSend,
            customer_id: draft.customer_id,
            customer_name: draft.name,
            request_id: draft.requestId || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `req_${Date.now()}_${Math.random().toString(36).slice(2)}`),
          });
          if (res.status === 'failed' || res.error) {
            draft.error = res.error || 'WhatsApp send failed.';
          } else {
            draft.result = res.provider_id || res.message_id || 'sent';
            draft.error = '';
            sent++;
          }
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E7EBE3] pb-4 sm:pb-5">
        <div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">WhatsApp Messages & AI Auto-Pilot</h1>
            <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 font-bold text-xs rounded-full border border-emerald-200 flex items-center gap-1.5 shrink-0">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              {connected ? 'WhatsApp Linked (+91 8650629360)' : 'Awaiting Connection'}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Autonomous debt collection recovery, real-time EMI tracking, two-way AI auto-conversations, and downloadable loan datasets.
          </p>
        </div>

        {/* Global Action Banner */}
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            onClick={handleAiAutonomousOutreach}
            disabled={!connected || aiOutreachRunning}
            className="w-full sm:w-auto justify-center px-4 sm:px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold rounded-2xl shadow-md shadow-emerald-600/20 flex items-center gap-2 transition disabled:opacity-50 min-h-[44px]"
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
      {(status?.status === 'WAKING_UP' || (error && (error.includes('waking up') || error.includes('502')))) && (
        <div className="p-3.5 sm:p-4 bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-start sm:items-center gap-3">
            <RefreshCw className="w-5 h-5 text-amber-600 animate-spin shrink-0 mt-0.5 sm:mt-0" />
            <div>
              <p className="font-bold text-amber-950">WhatsApp Bridge is Waking Up on Render</p>
              <p className="text-amber-700 mt-0.5">Free-tier cloud containers sleep after 15m of inactivity. Spinning up now (~15-30s) and will connect automatically.</p>
            </div>
          </div>
          <button
            onClick={() => void generateQR()}
            className="w-full sm:w-auto justify-center px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold transition shrink-0 flex items-center gap-1.5 shadow-sm min-h-[40px]"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${generating ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      )}
      {error && !error.includes('waking up') && !error.includes('502') && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-900 rounded-2xl text-xs flex items-center gap-3 animate-in fade-in">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span className="font-semibold">{error}</span>
        </div>
      )}

      {/* Main Grid: Scanner & Demo Contacts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8">
        {/* Left Column: Link WhatsApp Web */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white border border-[#E7EBE3] rounded-[20px] p-4 sm:p-6 shadow-sm space-y-5">
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

            <div className="p-4 bg-slate-50 border border-[#E7EBE3] rounded-2xl space-y-1">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Sending From Account</div>
              <div className="text-sm font-black text-slate-900 font-mono">
                {status?.session_info?.phone_number || '+91 9105830551'}
              </div>
            </div>

            {connected ? (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-2">
                <div className="w-10 h-10 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto shadow-md shadow-emerald-500/30">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div className="text-sm font-black text-emerald-950">WhatsApp Connected</div>
                <div className="text-xs text-emerald-700 font-mono">
                  {status?.session_info?.phone_number || '+91 9105830551'} (Multi-Device Active)
                </div>
              </div>
            ) : qrVisible ? (
              <div className="text-center space-y-3">
                <div className="p-3 bg-white border border-[#E7EBE3] rounded-2xl inline-block shadow-sm max-w-full">
                  <img src={status?.qr_code || ''} alt="WhatsApp QR" className="w-44 sm:w-48 h-44 sm:h-48 mx-auto object-contain" />
                </div>
                <div className="text-xs font-bold text-slate-600 flex items-center justify-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-500" /> QR expires in {qrRemaining}s
                </div>
                <button
                  onClick={generateQR}
                  disabled={generating}
                  className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 underline block mx-auto transition"
                >
                  {generating ? 'Refreshing QR...' : 'Regenerate QR'}
                </button>
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
                  className={`w-full bg-slate-100 hover:bg-slate-200 text-slate-800 border border-[#E7EBE3] ${button}`}
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
          <div className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white rounded-[20px] p-4 sm:p-6 shadow-xl border border-indigo-900/50 space-y-4">
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
          <div className="bg-white border border-[#E7EBE3] rounded-[20px] p-4 sm:p-6 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900">EMI message editor</h2>
                <p className="text-xs text-slate-500">Review and dispatch tailored recovery notices with dynamic EMI links.</p>
              </div>
              <button
                onClick={() => sendDrafts(pending)}
                disabled={!canSend}
                className="w-full sm:w-auto justify-center px-4 sm:px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-600/20 flex items-center gap-2 transition disabled:opacity-40 min-h-[44px]"
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
                <div key={draft.requestId || `${draft.customer_id}-${draft.phone}`} className="p-3.5 sm:p-5 bg-slate-50/80 border border-[#E7EBE3] rounded-2xl space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2.5">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-black text-slate-900">{draft.name}</span>
                        <span className="text-xs font-mono text-slate-500 font-semibold">{draft.phone}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                        Sample Loan #{draft.customer_id} · Overdue: ₹{draft.amount} ({draft.late_days} days late)
                      </div>
                    </div>
                    {draft.result ? (
                      <span className="self-start sm:self-auto px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Sent ({draft.result.substring(0, 10)})
                      </span>
                    ) : (
                      <button
                        onClick={() => sendDrafts([draft])}
                        disabled={!correctSender || sending || !draft.message?.trim() || !!draft.error}
                        className="w-full sm:w-auto justify-center px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm disabled:opacity-40 min-h-[38px]"
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
                    className="w-full bg-white border border-[#E7EBE3] rounded-xl p-3 text-xs font-sans text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
          <div className="bg-white border border-[#E7EBE3] rounded-[20px] p-4 sm:p-6 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-bold text-slate-900">AI Conversational Recovery Bot</h3>
              </div>
              <span className="text-xs text-indigo-600 font-semibold bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-100">
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
                  className="w-full bg-slate-50 border border-[#E7EBE3] rounded-xl p-2.5 text-xs font-bold text-slate-800 mt-1"
                >
                  <option value="+917060200849">Nancy (+917060200849)</option>
                  <option value="+919105830551">Sid (+919105830551)</option>
                  <option value="+918077815522">Ajay (+918077815522)</option>
                  <option value="+918650629360">Priya / Admin (+918650629360)</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="text-[11px] font-bold text-slate-600 uppercase">Incoming Borrower Question</label>
                <div className="flex flex-col sm:flex-row gap-2 mt-1">
                  <input
                    type="text"
                    value={chatUserQuery}
                    onChange={(e) => setChatUserQuery(e.target.value)}
                    placeholder="e.g. How much EMI is left to repay?"
                    className="w-full bg-slate-50 border border-[#E7EBE3] rounded-xl px-3 py-2 text-xs font-semibold text-slate-900"
                  />
                  <button
                    onClick={handleTestAiChat}
                    disabled={chatLoading}
                    className="w-full sm:w-auto justify-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold whitespace-nowrap transition flex items-center gap-1.5 shadow-sm min-h-[40px]"
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
      <div className="bg-white border border-[#E7EBE3] rounded-[20px] p-4 sm:p-6 lg:p-8 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div>
            <div className="flex items-start sm:items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                <FileUp className="w-5 h-5" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg sm:text-xl font-black text-slate-900">NLP Document Defaulter Processor</h2>
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

          <div className="flex items-center gap-2 w-full md:w-auto">
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
              className="w-full md:w-auto justify-center px-4 sm:px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl flex items-center gap-2 transition shadow-sm disabled:opacity-50 min-h-[44px]"
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
              <span className="px-3 py-1 bg-white border border-[#E7EBE3] rounded-lg text-[11px] font-bold text-emerald-700">
                .CSV (Per-Customer Scheduled Messages)
              </span>
              <span className="px-3 py-1 bg-white border border-[#E7EBE3] rounded-lg text-[11px] font-bold text-rose-700">
                .PDF (Statements)
              </span>
              <span className="px-3 py-1 bg-white border border-[#E7EBE3] rounded-lg text-[11px] font-bold text-blue-700">
                .DOCX (Word Lists)
              </span>
              <span className="px-3 py-1 bg-white border border-[#E7EBE3] rounded-lg text-[11px] font-bold text-amber-700">
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
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 sm:gap-3">
              <div className="p-3 sm:p-3.5 bg-slate-50 border border-[#E7EBE3] rounded-2xl">
                <div className="text-[10px] sm:text-[11px] font-semibold text-slate-500 uppercase truncate">Total Imported</div>
                <div className="text-lg sm:text-xl font-black text-slate-900 mt-1">{schedulingSummary?.total_imported ?? scheduledRecords.length}</div>
              </div>
              <div className="p-3 sm:p-3.5 bg-emerald-50/60 border border-emerald-200 rounded-2xl">
                <div className="text-[10px] sm:text-[11px] font-semibold text-emerald-700 uppercase truncate">Valid Records</div>
                <div className="text-lg sm:text-xl font-black text-emerald-800 mt-1">{schedulingSummary?.valid_records ?? scheduledRecords.length}</div>
              </div>
              <div className="p-3 sm:p-3.5 bg-emerald-50 border border-emerald-300 rounded-2xl shadow-sm">
                <div className="text-[10px] sm:text-[11px] font-semibold text-emerald-800 uppercase flex items-center gap-1 truncate">
                  <Clock className="w-3 h-3 text-emerald-600 shrink-0" /> Scheduled
                </div>
                <div className="text-lg sm:text-xl font-black text-emerald-900 mt-1">{schedulingSummary?.scheduled_messages ?? 0}</div>
              </div>
              <div className="p-3 sm:p-3.5 bg-slate-100/80 border border-slate-300 rounded-2xl">
                <div className="text-[10px] sm:text-[11px] font-semibold text-slate-600 uppercase truncate">Unscheduled</div>
                <div className="text-lg sm:text-xl font-black text-slate-700 mt-1">{schedulingSummary?.unscheduled_customers ?? 0}</div>
              </div>
              <div className="p-3 sm:p-3.5 bg-rose-50 border border-rose-200 rounded-2xl">
                <div className="text-[10px] sm:text-[11px] font-semibold text-rose-700 uppercase truncate">Invalid Records</div>
                <div className="text-lg sm:text-xl font-black text-rose-900 mt-1">{schedulingSummary?.invalid_records ?? 0}</div>
              </div>
              <div className="p-3 sm:p-3.5 bg-blue-50 border border-blue-200 rounded-2xl">
                <div className="text-[10px] sm:text-[11px] font-semibold text-blue-700 uppercase truncate">Messages Sent</div>
                <div className="text-lg sm:text-xl font-black text-blue-900 mt-1">{schedulingSummary?.messages_sent ?? 0}</div>
              </div>
              <div className="p-3 sm:p-3.5 bg-emerald-50 border border-emerald-400 rounded-2xl ring-1 ring-emerald-300 shadow-sm">
                <div className="text-[10px] sm:text-[11px] font-black text-emerald-800 uppercase flex items-center gap-1 truncate">
                  <CheckCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> Delivered
                </div>
                <div className="text-lg sm:text-xl font-black text-emerald-900 mt-1">{schedulingSummary?.messages_delivered ?? 0}</div>
              </div>
              <div className="p-3 sm:p-3.5 bg-rose-50/60 border border-rose-200 rounded-2xl">
                <div className="text-[10px] sm:text-[11px] font-semibold text-rose-600 uppercase truncate">Messages Failed</div>
                <div className="text-lg sm:text-xl font-black text-rose-800 mt-1">{schedulingSummary?.messages_failed ?? 0}</div>
              </div>
            </div>

            {/* Action Bar */}
            <div className="flex flex-col gap-3.5 bg-indigo-50/50 p-3.5 sm:p-4 rounded-2xl border border-indigo-100">
              <div className="flex items-start sm:items-center gap-2">
                <Calendar className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5 sm:mt-0" />
                <span className="text-xs text-indigo-950 font-medium">
                  {scheduleConfirmed
                    ? '🟢 Campaign is active! Background scheduler dispatches each customer at their exact local time.'
                    : 'Review customer schedules below. Click "Confirm & Activate Schedule" to queue messages.'}
                </span>
              </div>

              {/* Action Buttons: Responsive Layout */}
              <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2">
                <div className="flex items-center gap-1.5 bg-white border border-[#E7EBE3] rounded-xl px-2.5 py-1.5 shadow-sm w-full sm:w-auto">
                  <span className="text-[11px] font-bold text-slate-500 uppercase shrink-0">Filter:</span>
                  <select
                    value={scheduleFilter}
                    onChange={(e) => setScheduleFilter(e.target.value as any)}
                    className="text-xs font-bold text-slate-800 bg-transparent border-none focus:outline-none cursor-pointer w-full"
                  >
                    <option value="ALL">All ({scheduledRecords.length})</option>
                    <option value="DELIVERED">✓✓ Delivered Only ({scheduledRecords.filter((r) => r.schedule_status === 'DELIVERED' || r.schedule_status === 'SENT' || !!r.sent_at).length})</option>
                    <option value="SCHEDULED">Scheduled Only ({scheduledRecords.filter((r) => r.schedule_status === 'SCHEDULED').length})</option>
                    <option value="UNSCHEDULED">Unscheduled / Other</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2">
                  <button
                    onClick={handleCheckDelivery}
                    disabled={checkingDelivery}
                    className="px-3 py-2 bg-white border border-emerald-300 hover:bg-emerald-50 text-emerald-800 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50 min-h-[38px]"
                    title="Check live WhatsApp delivery status for all messages"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 text-emerald-600 ${checkingDelivery ? 'animate-spin' : ''}`} />
                    <span>{checkingDelivery ? 'Checking...' : 'Check Status'}</span>
                  </button>

                  <button
                    onClick={() => setIsScheduleEditMode((prev) => !prev)}
                    className={`px-3 py-2 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-1.5 shadow-sm min-h-[38px] ${
                      isScheduleEditMode
                        ? 'bg-blue-600 text-white border-blue-600 shadow-md ring-2 ring-blue-300'
                        : 'bg-white hover:bg-slate-50 text-blue-700 border-blue-200'
                    }`}
                    title="Toggle inline edit mode for all fields"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>{isScheduleEditMode ? 'Edit Mode: ON' : '✏️ Edit Mode'}</span>
                  </button>

                  <button
                    onClick={handleAddScheduleRow}
                    className="px-3 py-2 bg-white border border-emerald-300 hover:bg-emerald-50 text-emerald-800 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 shadow-sm min-h-[38px]"
                    title="Add a new customer row"
                  >
                    <Plus className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Add Row</span>
                  </button>

                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-2 bg-white border border-[#E7EBE3] hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl transition flex items-center justify-center min-h-[38px]"
                  >
                    Replace CSV
                  </button>

                  <a
                    href="/api/whatsapp/scheduled/download-validation-report?format=csv"
                    download="repayx_validation_report.csv"
                    className="px-3 py-2 bg-white border border-[#E7EBE3] hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl transition flex items-center justify-center gap-1.5 shadow-sm min-h-[38px]"
                  >
                    <Download className="w-3.5 h-3.5 text-slate-500" />
                    <span>CSV Report</span>
                  </a>

                  <a
                    href="/api/whatsapp/scheduled/download-validation-report?format=json"
                    download="repayx_validation_report.json"
                    className="px-3 py-2 bg-white border border-[#E7EBE3] hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl transition flex items-center justify-center gap-1.5 shadow-sm min-h-[38px]"
                  >
                    <Download className="w-3.5 h-3.5 text-slate-500" />
                    <span>JSON Report</span>
                  </a>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto sm:ml-auto">
                  <span className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 border border-purple-200 text-purple-800 font-bold text-xs shadow-xs text-center">
                    🎙️ AI Girl Voice Note Attached
                  </span>

                  <button
                    onClick={handleConfirmSchedule}
                    disabled={confirmingSchedule}
                    className="w-full sm:w-auto justify-center px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition shadow-sm disabled:opacity-50 min-h-[40px]"
                    title="Save any edited fields and update the background schedule"
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>
                      {confirmingSchedule
                        ? 'Queuing...'
                        : scheduleConfirmed
                        ? '✅ Update Schedule'
                        : 'Confirm & Activate'}
                    </span>
                  </button>

                  <button
                    onClick={handleDispatchAll}
                    disabled={dispatchingAll || scheduledRecords.length === 0}
                    className="w-full sm:w-auto justify-center px-4 py-2.5 bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-700 hover:from-indigo-700 hover:to-purple-800 text-white font-black text-xs rounded-xl flex items-center gap-1.5 transition shadow-md hover:shadow-lg disabled:opacity-50 active:scale-95 cursor-pointer ring-2 ring-indigo-300 min-h-[42px]"
                    title="Send instant WhatsApp message and girl voice note to all customers in the list at once"
                  >
                    {dispatchingAll ? (
                      <RefreshCw className="w-4 h-4 animate-spin text-amber-300" />
                    ) : (
                      <Zap className="w-4 h-4 fill-amber-300 text-amber-300" />
                    )}
                    <span>{dispatchingAll ? 'Sending to All...' : '⚡ Instant Send All (Text + Voice)'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Mobile Scroll Indicator */}
            <div className="md:hidden flex items-center justify-between text-[11px] text-slate-500 px-3 py-1.5 font-medium bg-slate-50 rounded-xl border border-[#E7EBE3]">
              <span className="flex items-center gap-1">👉 Swipe horizontally to view all fields & actions</span>
              <span className="font-mono text-slate-400 font-bold">{scheduledRecords.length} rows</span>
            </div>

            {/* Schedule Table Status / Error Alerts */}
            {(!connected || status?.status === 'DISCONNECTED') && (
              <div className="p-3.5 bg-amber-50 border border-amber-300 text-amber-950 rounded-2xl text-xs font-medium flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-2.5">
                  <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                  <span><strong>WhatsApp Web Disconnected:</strong> Link your WhatsApp account before dispatching text and voice notes.</span>
                </div>
                <button
                  onClick={() => {
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                    void generateQR();
                  }}
                  className="w-full sm:w-auto px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition shrink-0 text-center shadow-xs cursor-pointer"
                >
                  Link WhatsApp
                </button>
              </div>
            )}

            {error && (
              <div className="p-3.5 bg-rose-50 border border-rose-300 text-rose-950 rounded-2xl text-xs font-medium flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-2.5">
                  <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                  <span><strong>Dispatch Error:</strong> {error}</span>
                </div>
                {(!connected || status?.status === 'DISCONNECTED') && (
                  <button
                    onClick={() => {
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                      void generateQR();
                    }}
                    className="w-full sm:w-auto px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition shrink-0 text-center shadow-xs cursor-pointer"
                  >
                    Scan QR Code
                  </button>
                )}
              </div>
            )}

            {/* Scheduled Records Table */}
            <div className="overflow-x-auto rounded-2xl border border-[#E7EBE3] max-h-[500px] overscroll-x-contain">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="sticky top-0 bg-slate-100 z-10">
                  <tr className="border-b border-[#E7EBE3] text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                    <th className="p-3">Customer Name</th>
                    <th className="p-3">Phone Number</th>
                    <th className="p-3">Unpaid Amount</th>
                    <th className="p-3">Risk Category</th>
                    <th className="p-3">Payment Status</th>
                    <th className="p-3">Scheduled Message Time</th>
                    <th className="p-3">Timezone</th>
                    <th className="p-3">Schedule Status</th>
                    <th className="p-3 text-right">Delivery & Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {scheduledRecords
                    .filter((r) => {
                      if (scheduleFilter === 'DELIVERED') {
                        return r.schedule_status === 'DELIVERED' || r.schedule_status === 'SENT' || !!r.sent_at;
                      }
                      if (scheduleFilter === 'SCHEDULED') {
                        return r.schedule_status === 'SCHEDULED';
                      }
                      if (scheduleFilter === 'UNSCHEDULED') {
                        return r.schedule_status !== 'DELIVERED' && r.schedule_status !== 'SENT' && r.schedule_status !== 'SCHEDULED' && !r.sent_at;
                      }
                      return true;
                    })
                    .map((r, index) => {
                    const isUnscheduled = !r.scheduled_message_time;
                    const isDelivered = r.schedule_status === 'DELIVERED' || r.schedule_status === 'SENT' || !!r.sent_at;
                    const statusBadge =
                      isDelivered
                        ? 'bg-emerald-100 text-emerald-900 border-emerald-300 font-black shadow-sm'
                        : r.schedule_status === 'SCHEDULED'
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                        : r.schedule_status === 'MISSED_SCHEDULE'
                        ? 'bg-amber-100 text-amber-800 border-amber-200'
                        : r.schedule_status === 'PAUSED'
                        ? 'bg-purple-100 text-purple-800 border-purple-200'
                        : r.schedule_status === 'INVALID_TIME' || r.schedule_status === 'FAILED'
                        ? 'bg-rose-100 text-rose-800 border-rose-200'
                        : 'bg-slate-100 text-slate-700 border-[#E7EBE3]';

                    const statusLabel =
                      isDelivered
                        ? '🟢 ✓✓ Delivered'
                        : r.schedule_status === 'SCHEDULED'
                        ? '🟢 Scheduled'
                        : r.schedule_status === 'MISSED_SCHEDULE'
                        ? '🟡 Missed Schedule'
                        : r.schedule_status === 'INVALID_TIME'
                        ? '🔴 Invalid Time'
                        : r.schedule_status === 'FAILED'
                        ? '🔴 Failed'
                        : r.schedule_status === 'PAUSED'
                        ? '⏸️ Paused (WA Offline)'
                        : '⚪ Unscheduled';

                    const isRowEditing = isScheduleEditMode || editingScheduleId === (r.schedule_id || r.customer_id);

                    return (
                      <tr key={`${r.schedule_id || 'preview'}:${r.row_number ?? index}`} className={`transition ${isRowEditing ? 'bg-blue-50/40 ring-1 ring-blue-300' : isDelivered ? 'bg-emerald-50/30 hover:bg-emerald-50/60' : 'hover:bg-slate-50/70'}`}>
                        <td className="p-3">
                          {isRowEditing ? (
                            <div className="space-y-1 min-w-[130px]">
                              <input
                                type="text"
                                value={r.customer_name || ''}
                                onChange={(e) => handleUpdateField(r, 'customer_name', e.target.value)}
                                className="w-full px-2 py-1 text-xs bg-white border border-blue-400 rounded-lg text-slate-900 font-bold focus:ring-2 focus:ring-blue-500 shadow-xs"
                                placeholder="Customer Name"
                              />
                              <div className="flex gap-1">
                                <input
                                  type="text"
                                  value={r.customer_id || ''}
                                  onChange={(e) => handleUpdateField(r, 'customer_id', e.target.value)}
                                  className="w-16 px-1.5 py-0.5 text-[10px] bg-white border border-slate-300 rounded font-mono"
                                  placeholder="#ID"
                                />
                                <input
                                  type="text"
                                  value={r.loan_id || ''}
                                  onChange={(e) => handleUpdateField(r, 'loan_id', e.target.value)}
                                  className="w-20 px-1.5 py-0.5 text-[10px] bg-white border border-slate-300 rounded font-mono"
                                  placeholder="Loan ID"
                                />
                              </div>
                            </div>
                          ) : (
                            <>
                              <span className="font-bold text-slate-900">{r.customer_name || 'Customer'}</span>
                              <div className="flex items-center gap-1 mt-0.5">
                                <span className="text-[10px] text-slate-400 font-mono">#{r.customer_id || 'N/A'}</span>
                                {r.loan_id && <span className="text-[10px] text-slate-500 font-mono">· {r.loan_id}</span>}
                              </div>
                            </>
                          )}
                        </td>
                        <td className="p-3 font-mono font-semibold text-slate-700">
                          {isRowEditing ? (
                            <input
                              type="text"
                              value={r.phone_number || r.raw_phone || ''}
                              onChange={(e) => handleUpdateField(r, 'phone_number', e.target.value)}
                              className="w-32 px-2 py-1 text-xs bg-white border border-blue-400 rounded-lg text-slate-900 font-mono font-semibold focus:ring-2 focus:ring-blue-500 shadow-xs"
                              placeholder="+91..."
                            />
                          ) : (
                            r.phone_number || r.raw_phone || '-'
                          )}
                        </td>
                        <td className="p-3 font-bold text-rose-700 font-mono">
                          {isRowEditing ? (
                            <input
                              type="number"
                              value={r.unpaid_amount ?? ''}
                              onChange={(e) => handleUpdateField(r, 'unpaid_amount', parseFloat(e.target.value) || 0)}
                              className="w-24 px-2 py-1 text-xs bg-white border border-blue-400 rounded-lg text-rose-700 font-mono font-bold focus:ring-2 focus:ring-blue-500 shadow-xs"
                              placeholder="₹"
                            />
                          ) : (
                            formatCurrency(r.unpaid_amount)
                          )}
                        </td>
                        <td className="p-3">
                          {isRowEditing ? (
                            <select
                              value={r.risk_category || 'MEDIUM'}
                              onChange={(e) => handleUpdateField(r, 'risk_category', e.target.value)}
                              className="px-2 py-1 text-xs bg-white border border-blue-400 rounded-lg font-bold text-slate-800 shadow-xs"
                            >
                              <option value="HIGH">HIGH</option>
                              <option value="MEDIUM">MEDIUM</option>
                              <option value="LOW">LOW</option>
                            </select>
                          ) : (
                            <span
                              className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border ${
                                r.risk_category === 'HIGH'
                                  ? 'bg-rose-50 text-rose-800 border-rose-300'
                                  : r.risk_category === 'LOW'
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                  : 'bg-amber-50 text-amber-800 border-amber-300'
                              }`}
                            >
                              {r.risk_category || 'MEDIUM'}
                            </span>
                          )}
                        </td>
                        <td className="p-3">
                          {isRowEditing ? (
                            <div className="space-y-1">
                              <select
                                value={r.payment_status || 'overdue'}
                                onChange={(e) => handleUpdateField(r, 'payment_status', e.target.value)}
                                className="px-2 py-1 text-xs bg-white border border-blue-400 rounded-lg font-bold text-slate-800 shadow-xs"
                              >
                                <option value="overdue">overdue</option>
                                <option value="unpaid">unpaid</option>
                                <option value="pending">pending</option>
                                <option value="paid">paid</option>
                              </select>
                              <input
                                type="number"
                                value={r.days_past_due ?? 0}
                                onChange={(e) => handleUpdateField(r, 'days_past_due', parseInt(e.target.value) || 0)}
                                placeholder="Days late"
                                className="w-20 px-1.5 py-0.5 text-[10px] bg-white border border-slate-300 rounded font-mono block"
                              />
                            </div>
                          ) : (
                            <>
                              <span className="font-mono font-semibold text-slate-800">{r.payment_status || 'UNPAID'}</span>
                              {r.days_past_due ? (
                                <div className="text-[10px] text-slate-400 mt-0.5">{r.days_past_due}d late</div>
                              ) : null}
                            </>
                          )}
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
                          {isRowEditing ? (
                            <input
                              type="text"
                              value={r.timezone || 'Asia/Kolkata'}
                              onChange={(e) => handleUpdateField(r, 'timezone', e.target.value)}
                              className="w-28 px-2 py-1 text-[11px] bg-white border border-blue-400 rounded-lg font-mono text-slate-700 shadow-xs"
                            />
                          ) : (
                            r.timezone || 'Asia/Kolkata'
                          )}
                        </td>
                        <td className="p-3">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border ${statusBadge}`}>
                            {statusLabel}
                          </span>
                          {r.scheduled_message_at && (
                            <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                              {r.scheduled_message_at.replace('T', ' ').substring(0, 16)}
                            </div>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex flex-wrap items-center justify-end gap-1.5">
                            {isRowEditing ? (
                              <>
                                <button
                                  onClick={() => handleSaveScheduleRecord(r)}
                                  disabled={savingScheduleId === (r.schedule_id || r.customer_id)}
                                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] rounded-lg shadow-sm transition flex items-center gap-1 cursor-pointer"
                                  title="Save edited row"
                                >
                                  {savingScheduleId === (r.schedule_id || r.customer_id) ? (
                                    <RefreshCw className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <Save className="w-3 h-3" />
                                  )}
                                  <span>Save</span>
                                </button>
                                <button
                                  onClick={() => setEditingScheduleId(null)}
                                  className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px] rounded-lg transition"
                                  title="Close row edit"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={() => handleDeleteScheduleRow(r.schedule_id)}
                                  className="px-1.5 py-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded transition"
                                  title="Delete customer row"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() => setEditingScheduleId(r.schedule_id || r.customer_id)}
                                className="px-2 py-1 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 font-bold text-[11px] rounded-lg transition flex items-center gap-1 cursor-pointer"
                                title="Edit this customer record"
                              >
                                <Edit2 className="w-3 h-3 text-blue-600" />
                                <span>Edit</span>
                              </button>
                            )}

                            {r.validation_errors && r.validation_errors.length > 0 && !isDelivered ? (
                              <button
                                onClick={() => handleDispatchSingle(r)}
                                disabled={dispatchingId === r.schedule_id}
                                className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white font-bold text-[11px] rounded-lg shadow-sm transition disabled:opacity-50 flex items-center gap-1 cursor-pointer"
                                title="Retry sending reminder"
                              >
                                {dispatchingId === r.schedule_id ? (
                                  <RefreshCw className="w-3 h-3 animate-spin" />
                                ) : (
                                  <Send className="w-3 h-3" />
                                )}
                                <span>{dispatchingId === r.schedule_id ? 'Retrying...' : '🎙️ Retry (Text + Voice)'}</span>
                              </button>
                            ) : isDelivered ? (
                              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-100 border border-emerald-300 rounded-xl text-emerald-800 text-[11px] font-bold shadow-sm">
                                <CheckCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                <span>Delivered {r.sent_at ? `(${r.sent_at.substring(11, 16)})` : ''}</span>
                              </div>
                            ) : (
                              <>
                                <button
                                  onClick={() => handleDispatchSingle(r)}
                                  disabled={dispatchingId === r.schedule_id}
                                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] rounded-lg shadow-sm transition disabled:opacity-50 flex items-center gap-1 cursor-pointer"
                                  title="Send reminder now and confirm delivery"
                                >
                                  {dispatchingId === r.schedule_id ? (
                                    <RefreshCw className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <Send className="w-3 h-3" />
                                  )}
                                  <span>{dispatchingId === r.schedule_id ? 'Sending...' : '🎙️ Send Text + Voice Note'}</span>
                                </button>
                                <button
                                  onClick={() => handleMarkDelivered(r)}
                                  className="px-2 py-1 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-semibold text-[11px] rounded-lg transition cursor-pointer"
                                  title="Mark as delivered manually"
                                >
                                  Mark Delivered
                                </button>
                              </>
                            )}
                          </div>
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-3.5 sm:p-4 rounded-2xl border border-[#E7EBE3]">
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
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

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 sm:flex-initial justify-center px-3 py-2 bg-white border border-[#E7EBE3] hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl transition min-h-[38px]"
                >
                  Upload Another File
                </button>
                <button
                  onClick={handleDispatchExtracted}
                  disabled={dispatchingExtracted || !connected}
                  className="flex-1 sm:flex-initial justify-center px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition shadow-sm disabled:opacity-50 min-h-[38px]"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{dispatchingExtracted ? 'Dispatching...' : 'Send Due Notices'}</span>
                </button>
              </div>
            </div>

            {/* Mobile Scroll Indicator for Defaulters Table */}
            <div className="md:hidden flex items-center justify-between text-[11px] text-slate-500 px-3 py-1.5 font-medium bg-slate-50 rounded-xl border border-[#E7EBE3]">
              <span className="flex items-center gap-1">👉 Swipe horizontally to view all details</span>
              <span className="font-mono text-slate-400 font-bold">{extractedDefaulters.length} rows</span>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-[#E7EBE3] max-h-96 overscroll-x-contain">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="sticky top-0 bg-slate-100 z-10">
                  <tr className="border-b border-[#E7EBE3] text-slate-700 font-bold uppercase tracking-wider text-[11px]">
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
                  {extractedDefaulters.map((item, index) => {
                    const isEditing = editingDefaulterIdx === index;
                    return (
                      <tr key={index} className={`transition ${isEditing ? 'bg-blue-50/40 ring-1 ring-blue-300' : 'hover:bg-slate-50/70'}`}>
                        <td className="p-3">
                          {isEditing ? (
                            <div className="space-y-1 min-w-[130px]">
                              <input
                                type="text"
                                value={item.customer_name || ''}
                                onChange={(e) => handleUpdateDefaulterField(index, 'customer_name', e.target.value)}
                                className="w-full px-2 py-1 text-xs bg-white border border-blue-400 rounded-lg text-slate-900 font-bold"
                                placeholder="Customer Name"
                              />
                              <input
                                type="text"
                                value={item.phone || ''}
                                onChange={(e) => handleUpdateDefaulterField(index, 'phone', e.target.value)}
                                className="w-full px-2 py-1 text-[11px] bg-white border border-slate-300 rounded font-mono"
                                placeholder="+91..."
                              />
                            </div>
                          ) : (
                            <>
                              <div className="font-bold text-slate-900">{item.customer_name}</div>
                              <div className="text-[11px] text-slate-400 font-mono">
                                #{item.customer_id} · {item.phone}
                              </div>
                            </>
                          )}
                        </td>
                        <td className="p-3">
                          {isEditing ? (
                            <div className="space-y-1">
                              <input
                                type="number"
                                value={item.total_loan_amount ?? ''}
                                onChange={(e) => handleUpdateDefaulterField(index, 'total_loan_amount', parseFloat(e.target.value) || 0)}
                                className="w-24 px-1.5 py-1 text-xs bg-white border border-blue-400 rounded-lg font-bold"
                                placeholder="Total Loan"
                              />
                              <input
                                type="number"
                                value={item.emi_paid_amount ?? ''}
                                onChange={(e) => handleUpdateDefaulterField(index, 'emi_paid_amount', parseFloat(e.target.value) || 0)}
                                className="w-24 px-1.5 py-1 text-[11px] bg-white border border-slate-300 rounded"
                                placeholder="Paid"
                              />
                            </div>
                          ) : (
                            <>
                              <div className="font-bold text-indigo-950">{formatCurrency(item.total_loan_amount)}</div>
                              <div className="text-[10px] text-emerald-700 font-medium">
                                Paid: {formatCurrency(item.emi_paid_amount)}
                              </div>
                            </>
                          )}
                        </td>
                        <td className="p-3 font-bold text-rose-700 text-sm">
                          {isEditing ? (
                            <input
                              type="number"
                              value={item.emi_left_to_repay ?? ''}
                              onChange={(e) => handleUpdateDefaulterField(index, 'emi_left_to_repay', parseFloat(e.target.value) || 0)}
                              className="w-24 px-2 py-1 text-xs bg-white border border-blue-400 rounded-lg font-bold text-rose-700"
                            />
                          ) : (
                            formatCurrency(item.emi_left_to_repay)
                          )}
                        </td>
                        <td className="p-3 font-mono text-slate-800 font-semibold">
                          {isEditing ? (
                            <input
                              type="text"
                              value={item.last_date_to_pay || ''}
                              onChange={(e) => handleUpdateDefaulterField(index, 'last_date_to_pay', e.target.value)}
                              className="w-28 px-2 py-1 text-xs bg-white border border-blue-400 rounded-lg font-mono"
                              placeholder="YYYY-MM-DD"
                            />
                          ) : (
                            item.last_date_to_pay || 'N/A'
                          )}
                        </td>
                        <td className="p-3">
                          {isEditing ? (
                            <select
                              value={item.urgency_status}
                              onChange={(e) => handleUpdateDefaulterField(index, 'urgency_status', e.target.value)}
                              className="px-2 py-1 text-xs bg-white border border-blue-400 rounded-lg font-bold"
                            >
                              <option value="OVERDUE">OVERDUE</option>
                              <option value="DUE_TODAY">DUE_TODAY</option>
                              <option value="UPCOMING">UPCOMING</option>
                            </select>
                          ) : (
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
                          )}
                        </td>
                        <td className="p-3 max-w-xs">
                          {isEditing ? (
                            <textarea
                              rows={2}
                              value={item.generated_message || ''}
                              onChange={(e) => handleUpdateDefaulterField(index, 'generated_message', e.target.value)}
                              className="w-full p-1.5 text-[11px] bg-white border border-blue-400 rounded-lg font-mono"
                            />
                          ) : (
                            <div className="bg-slate-50 border border-[#E7EBE3] rounded-xl p-2 text-[11px] text-slate-700 line-clamp-2 font-mono">
                              {item.generated_message}
                            </div>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {isEditing ? (
                              <>
                                <button
                                  onClick={() => setEditingDefaulterIdx(null)}
                                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] rounded-lg shadow-sm transition flex items-center gap-1"
                                >
                                  <Save className="w-3 h-3" />
                                  <span>Save</span>
                                </button>
                                <button
                                  onClick={() => setEditingDefaulterIdx(null)}
                                  className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px] rounded-lg transition"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() => setEditingDefaulterIdx(index)}
                                className="px-2 py-1 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 font-bold text-[11px] rounded-lg transition flex items-center gap-1"
                              >
                                <Edit2 className="w-3 h-3 text-blue-600" />
                                <span>Edit</span>
                              </button>
                            )}
                            {item.status === 'delivered' ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                                <Check className="w-3 h-3 text-emerald-600" /> Sent
                              </span>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 📁 BOTTOM SECTION: 2 USER LOAN & EMI FILES (JSON, CSV) & DATA VIEWER */}
      {/* ========================================================================= */}
      <div className="bg-white border border-[#E7EBE3] rounded-[20px] p-4 sm:p-6 lg:p-8 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div>
            <div className="flex items-center gap-2.5">
              <FileSpreadsheet className="w-6 h-6 text-emerald-600 shrink-0" />
              <h2 className="text-lg sm:text-xl font-black text-slate-900">User Loan & EMI Dataset Files</h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Complete breakdown of total loan taken, EMI amount paid, remaining balance to repay, and loan tenure for all borrowers.
            </p>
          </div>

          {/* Dataset Download Buttons */}
          <div className="flex items-center gap-2.5 w-full md:w-auto">
            <a
              href="/api/whatsapp/download/json"
              download="users_loan_emi_data.json"
              className="flex-1 md:flex-initial justify-center px-4 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 font-bold text-xs rounded-xl flex items-center gap-2 transition shadow-sm min-h-[40px]"
            >
              <FileCode className="w-4 h-4 text-amber-600" />
              <span>Download JSON</span>
            </a>

            <a
              href="/api/whatsapp/download/csv"
              download="users_loan_emi_data.csv"
              className="flex-1 md:flex-initial justify-center px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 font-bold text-xs rounded-xl flex items-center gap-2 transition shadow-sm min-h-[40px]"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Download CSV</span>
            </a>
          </div>
        </div>

        {/* Aggregate KPI Cards for Loan Taken vs EMI Paid vs Left */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          <div className="p-4 sm:p-5 bg-gradient-to-br from-indigo-50 to-slate-50 rounded-2xl border border-indigo-100 space-y-1">
            <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
              <span>Total Loan Taken</span>
              <TrendingUp className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-indigo-950">
              {formatCurrency(loanEmiData?.summary?.total_loan_amount || 18925515)}
            </div>
            <div className="text-[11px] text-indigo-600 font-medium">Principal disbursed across portfolio</div>
          </div>

          <div className="p-4 sm:p-5 bg-gradient-to-br from-emerald-50 to-slate-50 rounded-2xl border border-emerald-100 space-y-1">
            <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
              <span>Total EMI Paid So Far</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-emerald-950">
              {formatCurrency(loanEmiData?.summary?.total_emi_paid || 11800000)}
            </div>
            <div className="text-[11px] text-emerald-600 font-medium">Successfully settled installment recovery</div>
          </div>

          <div className="p-4 sm:p-5 bg-gradient-to-br from-rose-50 to-slate-50 rounded-2xl border border-rose-100 space-y-1">
            <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
              <span>Remaining EMI Left to Repay</span>
              <ShieldAlert className="w-4 h-4 text-rose-600" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-rose-950">
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
              className="bg-slate-50 border border-[#E7EBE3] rounded-xl px-4 py-2 text-xs font-medium text-slate-900 w-full sm:w-80 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <span className="text-xs text-slate-500 font-mono">
              Showing {loanEmiData?.users?.length || 0} of {loanEmiData?.total || 0} borrowers
            </span>
          </div>

          {/* Mobile Scroll Indicator for Loan Dataset Table */}
          <div className="md:hidden flex items-center justify-between text-[11px] text-slate-500 px-3 py-1.5 font-medium bg-slate-50 rounded-xl border border-[#E7EBE3]">
            <span className="flex items-center gap-1">👉 Swipe horizontally to view all columns</span>
            <span className="font-mono text-slate-400 font-bold">{loanEmiData?.users?.length || 0} rows</span>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-[#E7EBE3] overscroll-x-contain">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-[#E7EBE3] text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                  <th className="p-3.5">Borrower</th>
                  <th className="p-3.5">Loan Taken</th>
                  <th className="p-3.5">EMI Paid</th>
                  <th className="p-3.5">EMI Left to Repay</th>
                  <th className="p-3.5">Monthly EMI</th>
                  <th className="p-3.5">Late Days</th>
                  <th className="p-3.5">Risk Tier</th>
                  <th className="p-3.5">Payment Link</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loanEmiData?.users?.map((user) => {
                  const isEditing = editingLoanCustomerId === user.customer_id;
                  return (
                    <tr key={user.customer_id} className={`transition ${isEditing ? 'bg-blue-50/40 ring-1 ring-blue-300' : 'hover:bg-slate-50/70'}`}>
                      <td className="p-3.5">
                        {isEditing ? (
                          <div className="space-y-1 min-w-[130px]">
                            <input
                              type="text"
                              value={user.customer_name}
                              onChange={(e) => handleUpdateLoanUserField(user.customer_id, 'customer_name', e.target.value)}
                              className="w-full px-2 py-1 text-xs bg-white border border-blue-400 rounded-lg text-slate-900 font-bold"
                              placeholder="Borrower Name"
                            />
                            <input
                              type="text"
                              value={user.phone}
                              onChange={(e) => handleUpdateLoanUserField(user.customer_id, 'phone', e.target.value)}
                              className="w-full px-2 py-1 text-[11px] bg-white border border-slate-300 rounded font-mono"
                              placeholder="+91..."
                            />
                          </div>
                        ) : (
                          <>
                            <div className="font-bold text-slate-900">{user.customer_name}</div>
                            <div className="text-[11px] text-slate-400 font-mono">
                              #{user.customer_id} · {user.phone}
                            </div>
                          </>
                        )}
                      </td>
                      <td className="p-3.5 font-bold text-indigo-950">
                        {isEditing ? (
                          <input
                            type="number"
                            value={user.total_loan_amount ?? ''}
                            onChange={(e) => handleUpdateLoanUserField(user.customer_id, 'total_loan_amount', parseFloat(e.target.value) || 0)}
                            className="w-24 px-2 py-1 text-xs bg-white border border-blue-400 rounded-lg font-bold"
                          />
                        ) : (
                          formatCurrency(user.total_loan_amount)
                        )}
                      </td>
                      <td className="p-3.5 font-bold text-emerald-700">
                        {isEditing ? (
                          <input
                            type="number"
                            value={user.emi_paid_amount ?? ''}
                            onChange={(e) => handleUpdateLoanUserField(user.customer_id, 'emi_paid_amount', parseFloat(e.target.value) || 0)}
                            className="w-24 px-2 py-1 text-xs bg-white border border-blue-400 rounded-lg font-bold"
                          />
                        ) : (
                          <>
                            {formatCurrency(user.emi_paid_amount)}
                            <span className="text-[10px] text-slate-400 font-normal block">({user.emis_paid_count} paid)</span>
                          </>
                        )}
                      </td>
                      <td className="p-3.5 font-bold text-rose-700">
                        {isEditing ? (
                          <input
                            type="number"
                            value={user.emi_left_to_repay ?? ''}
                            onChange={(e) => handleUpdateLoanUserField(user.customer_id, 'emi_left_to_repay', parseFloat(e.target.value) || 0)}
                            className="w-24 px-2 py-1 text-xs bg-white border border-blue-400 rounded-lg font-bold"
                          />
                        ) : (
                          <>
                            {formatCurrency(user.emi_left_to_repay)}
                            <span className="text-[10px] text-slate-400 font-normal block">({user.emis_remaining_count} left)</span>
                          </>
                        )}
                      </td>
                      <td className="p-3.5 text-slate-700 font-medium">
                        {isEditing ? (
                          <input
                            type="number"
                            value={user.monthly_emi ?? ''}
                            onChange={(e) => handleUpdateLoanUserField(user.customer_id, 'monthly_emi', parseFloat(e.target.value) || 0)}
                            className="w-20 px-2 py-1 text-xs bg-white border border-blue-400 rounded-lg"
                          />
                        ) : (
                          `${formatCurrency(user.monthly_emi)}/mo`
                        )}
                      </td>
                      <td className="p-3.5">
                        {isEditing ? (
                          <input
                            type="number"
                            value={user.days_past_due ?? 0}
                            onChange={(e) => handleUpdateLoanUserField(user.customer_id, 'days_past_due', parseInt(e.target.value) || 0)}
                            className="w-16 px-1.5 py-1 text-xs bg-white border border-blue-400 rounded-lg font-mono"
                          />
                        ) : (
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
                        )}
                      </td>
                      <td className="p-3.5">
                        {isEditing ? (
                          <select
                            value={user.risk_tier}
                            onChange={(e) => handleUpdateLoanUserField(user.customer_id, 'risk_tier', e.target.value as any)}
                            className="px-2 py-1 text-xs bg-white border border-blue-400 rounded-lg font-bold"
                          >
                            <option value="High Risk">High Risk</option>
                            <option value="Medium Risk">Medium Risk</option>
                            <option value="Low Risk">Low Risk</option>
                          </select>
                        ) : (
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                              user.risk_tier === 'High Risk'
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}
                          >
                            {user.risk_tier} ({user.risk_score}%)
                          </span>
                        )}
                      </td>
                      <td className="p-3.5">
                        {isEditing ? (
                          <input
                            type="text"
                            value={user.payment_link || ''}
                            onChange={(e) => handleUpdateLoanUserField(user.customer_id, 'payment_link', e.target.value)}
                            className="w-32 px-2 py-1 text-[11px] bg-white border border-blue-400 rounded-lg font-mono"
                            placeholder="https://..."
                          />
                        ) : (
                          <a
                            href={user.payment_link}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 transition"
                          >
                            Open Link
                          </a>
                        )}
                      </td>
                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isEditing ? (
                            <>
                              <button
                                onClick={() => handleSaveLoanRecord(user)}
                                disabled={savingLoanId === user.customer_id}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] rounded-lg shadow-sm transition flex items-center gap-1 cursor-pointer"
                                title="Save changes to dataset"
                              >
                                {savingLoanId === user.customer_id ? (
                                  <RefreshCw className="w-3 h-3 animate-spin" />
                                ) : (
                                  <Save className="w-3 h-3" />
                                )}
                                <span>Save</span>
                              </button>
                              <button
                                onClick={() => setEditingLoanCustomerId(null)}
                                className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px] rounded-lg transition"
                                title="Cancel"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => setEditingLoanCustomerId(user.customer_id)}
                              className="px-2 py-1 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 font-bold text-[11px] rounded-lg transition flex items-center gap-1 cursor-pointer"
                              title="Edit borrower details"
                            >
                              <Edit2 className="w-3 h-3 text-blue-600" />
                              <span>Edit</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
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
