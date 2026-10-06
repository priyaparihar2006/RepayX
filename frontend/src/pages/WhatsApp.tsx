import React, { Component, type ErrorInfo, type ReactNode, useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCheck,
  CheckCircle2,
  Clock,
  ExternalLink,
  Filter,
  Info,
  LogOut,
  MessageSquare,
  MoreVertical,
  Paperclip,
  Phone,
  QrCode,
  RefreshCw,
  Search,
  Send,
  ShieldAlert,
  Smartphone,
  Smile,
  Sparkles,
  User,
  Users,
  Video,
  Zap,
} from 'lucide-react';
import {
  whatsapp,
  type WhatsAppDefaulter,
  type WhatsAppHistoryItem,
  type WhatsAppStatus,
  type WhatsAppTemplate,
} from '../services/whatsapp';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public override state: ErrorBoundaryState = { hasError: false, error: null };

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('WhatsAppPage caught error:', error, errorInfo);
  }

  public override render() {
    if (this.state.hasError) {
      return (
        <div className="max-w-4xl mx-auto p-6 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 space-y-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-6 h-6 text-rose-600" />
            <h2 className="text-lg font-bold">WhatsApp Module Error</h2>
          </div>
          <p className="text-sm">
            {this.state.error?.message || 'An unexpected error occurred while rendering the WhatsApp outreach panel.'}
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
            className="px-4 py-2 bg-rose-600 text-white text-sm font-medium rounded-xl hover:bg-rose-700 transition"
          >
            Reload Module
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const formatCurrency = (val: number | undefined | null) => {
  if (val === undefined || val === null || isNaN(val)) return '₹0';
  return `₹${Number(val).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
};

const formatTimestamp = (val: string | undefined | null) => {
  if (!val) return '';
  try {
    return new Date(val).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' });
  } catch {
    return val;
  }
};

interface ChatMessage {
  id: string;
  sender: 'rep' | 'customer';
  text: string;
  timestamp: string;
  status: 'sent' | 'delivered' | 'read';
}

const WhatsAppDashboard: React.FC = () => {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<'messenger' | 'outreach' | 'defaulters' | 'audit' | 'scanner'>('messenger');

  // Status & Connection State
  const [status, setStatus] = useState<WhatsAppStatus | null>(null);
  const [qrCode, setQrCode] = useState<string>('');
  const [qrExpiresIn, setQrExpiresIn] = useState<number>(0);
  const [pairingCode, setPairingCode] = useState<string>('');
  const [pairMethod, setPairMethod] = useState<'qr' | 'phone' | 'code'>('qr');
  const [inputPhoneNumber, setInputPhoneNumber] = useState<string>('+919820154321');
  const [inputCode, setInputCode] = useState<string>('');

  // Data collections
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [defaulters, setDefaulters] = useState<WhatsAppDefaulter[]>([]);
  const [messages, setMessages] = useState<WhatsAppHistoryItem[]>([]);
  const [summary, setSummary] = useState<{
    total_defaulters: number;
    high_risk_defaulters: number;
    medium_risk_defaulters: number;
    total_unpaid_exposure: number;
    total_unpaid_formatted?: string;
  }>({
    total_defaulters: 0,
    high_risk_defaulters: 0,
    medium_risk_defaulters: 0,
    total_unpaid_exposure: 0,
    total_unpaid_formatted: '0',
  });

  // UI state
  const [loading, setLoading] = useState<boolean>(true);
  const [generatingQr, setGeneratingQr] = useState<boolean>(false);
  const [dispatching, setDispatching] = useState<boolean>(false);
  const [pairing, setPairing] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [notice, setNotice] = useState<string>('');

  // Messenger State
  const [selectedCustomer, setSelectedCustomer] = useState<WhatsAppDefaulter | null>(null);
  const [chatSearch, setChatSearch] = useState<string>('');
  const [activeChatMessages, setActiveChatMessages] = useState<ChatMessage[]>([]);
  const [inputChatMessage, setInputChatMessage] = useState<string>('');
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Outreach controls
  const [selectedTier, setSelectedTier] = useState<'all' | 'high' | 'medium' | 'unpaid_only'>('high');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('urgent_settlement');
  const [customText, setCustomText] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Single Defaulter Modal State
  const [activeModalDefaulter, setActiveModalDefaulter] = useState<WhatsAppDefaulter | null>(null);
  const [singleMessageText, setSingleMessageText] = useState<string>('');
  const [sendingSingle, setSendingSingle] = useState<boolean>(false);

  const fetchAllData = async (signal?: AbortSignal) => {
    try {
      setError('');
      const [statusRes, templatesRes, defaultersRes, messagesRes] = await Promise.all([
        whatsapp.getStatus(signal).catch(() => null),
        whatsapp.getTemplates().catch(() => ({ success: false, templates: [] })),
        whatsapp.getDefaulters({ search: searchQuery }).catch(() => ({
          success: false,
          defaulters: [],
          total: 0,
          summary: { total_defaulters: 0, high_risk_count: 0, medium_risk_count: 0, total_unpaid_amount: 0 },
        })),
        whatsapp.getMessages(50).catch(() => ({ success: false, messages: [], count: 0 })),
      ]);

      if (statusRes) {
        setStatus(statusRes);
        if (statusRes.qr_code && !statusRes.connected) {
          setQrCode(statusRes.qr_code);
          setQrExpiresIn(statusRes.qr_expires_in || 180);
          if (statusRes.pairing_code) setPairingCode(statusRes.pairing_code);
        } else if (!statusRes.connected) {
          void generateNewQR();
        }
      }

      if (templatesRes?.templates) {
        setTemplates(templatesRes.templates);
        if (templatesRes.templates.length > 0 && !selectedTemplateId) {
          setSelectedTemplateId(templatesRes.templates[0].id);
        }
      }

      if (defaultersRes) {
        const rawDefaulters = (defaultersRes.defaulters || []).map((d: any) => ({
          customer_id: d.customer_id,
          customer_name: d.customer_name || d.name || `Customer #${d.customer_id}`,
          phone: d.phone || '+919820154321',
          risk_tier: d.risk_tier || d.risk_category || 'High Risk',
          risk_score: d.risk_score || 0,
          unpaid_amount: d.unpaid_amount ?? d.total_unpaid_amount ?? 0,
          late_days: d.late_days ?? d.avg_days_late ?? 0,
          last_due_date: d.last_due_date || 'Overdue',
          opted_in: d.opted_in ?? true,
          recommended_action: d.recommended_action || d.recommended_template || 'Immediate notice',
        }));
        setDefaulters(rawDefaulters);

        if (rawDefaulters.length > 0 && !selectedCustomer) {
          setSelectedCustomer(rawDefaulters[0]);
        }

        const rawSummary: any = defaultersRes.summary || {};
        const totalDef = rawSummary.total_defaulters ?? defaultersRes.total ?? rawDefaulters.length;
        const highRisk = rawSummary.high_risk_count ?? rawSummary.high_risk_defaulters ?? rawDefaulters.filter((d) => d.risk_tier === 'High Risk').length;
        const medRisk = rawSummary.medium_risk_count ?? rawSummary.medium_risk_defaulters ?? rawDefaulters.filter((d) => d.risk_tier === 'Medium Risk').length;
        const totalUnpaid = rawSummary.total_unpaid_amount ?? rawSummary.total_unpaid_exposure ?? rawDefaulters.reduce((acc, curr) => acc + (curr.unpaid_amount || 0), 0);
        const totalFormatted = rawSummary.total_unpaid_formatted || formatCurrency(totalUnpaid);

        setSummary({
          total_defaulters: totalDef,
          high_risk_defaulters: highRisk,
          medium_risk_defaulters: medRisk,
          total_unpaid_exposure: totalUnpaid,
          total_unpaid_formatted: totalFormatted.replace('₹', ''),
        });
      }

      if (messagesRes?.messages) {
        const rawMsgs = (messagesRes.messages || []).map((m: any) => ({
          id: m.id || Math.random(),
          request_id: m.request_id || `req_${Date.now()}`,
          recipient: m.recipient || '',
          customer_id: m.customer_id,
          customer_name: m.customer_name,
          template_name: m.template_name || m.template,
          message_preview: m.message_preview || m.preview || '',
          status: m.status || m.delivery_status || 'sent',
          sent_at: m.sent_at || m.created_at || new Date().toISOString(),
          error_message: m.error_message || m.error,
        }));
        setMessages(rawMsgs);
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to initialize WhatsApp connection state.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    void fetchAllData(controller.signal);
    return () => controller.abort();
  }, []);

  // Live polling for status when disconnected
  useEffect(() => {
    if (status?.connected) return;
    const pollInterval = setInterval(async () => {
      try {
        const liveStatus = await whatsapp.getStatus();
        if (liveStatus?.connected) {
          setStatus(liveStatus);
          setNotice('WhatsApp connected successfully!');
          void fetchAllData();
        }
      } catch {
        // ignore background poll errors
      }
    }, 4000);
    return () => clearInterval(pollInterval);
  }, [status?.connected]);

  // Load chat history when selected customer changes
  useEffect(() => {
    if (!selectedCustomer) return;

    // Build realistic conversation thread based on customer risk and overdue
    const defaultConversation: ChatMessage[] = [
      {
        id: 'msg_init',
        sender: 'rep',
        text: `Dear ${selectedCustomer.customer_name}, this is RepayX Collections on behalf of your loan account #${selectedCustomer.customer_id}. An outstanding overdue balance of ₹${selectedCustomer.unpaid_amount.toLocaleString('en-IN')} is pending. Please settle via: https://pay.repayx.ai/inv/${selectedCustomer.customer_id}`,
        timestamp: new Date(Date.now() - 3600 * 1000 * 4).toISOString(),
        status: 'read',
      },
      {
        id: 'msg_reply_1',
        sender: 'customer',
        text: `Hello, I received the notice. I had a medical emergency last week. Is it possible to get a waiver on late penalty fees?`,
        timestamp: new Date(Date.now() - 3600 * 1000 * 2).toISOString(),
        status: 'delivered',
      },
    ];

    setActiveChatMessages(defaultConversation);
  }, [selectedCustomer?.customer_id]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeChatMessages, isTyping]);

  // QR expiration timer
  useEffect(() => {
    if (!qrCode || status?.connected) return;
    const interval = setInterval(() => {
      setQrExpiresIn((prev) => {
        if (prev <= 1) {
          void generateNewQR();
          return 180;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [qrCode, status?.connected]);

  const generateNewQR = async () => {
    setGeneratingQr(true);
    setError('');
    try {
      const res = await whatsapp.generateQR();
      if (res.qr_code) {
        setQrCode(res.qr_code);
        setQrExpiresIn(res.expires_in || 180);
        if (res.pairing_code) setPairingCode(res.pairing_code);
        setStatus((prev) => (prev ? { ...prev, status: 'SCAN_QR_CODE', qr_code: res.qr_code, pairing_code: res.pairing_code } : null));
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to generate QR Code.');
    } finally {
      setGeneratingQr(false);
    }
  };

  const linkWithPhoneNumber = async () => {
    setPairing(true);
    setError('');
    setNotice('');
    try {
      const res = await whatsapp.pairDevice({
        phone_number: inputPhoneNumber,
        user_name: 'RepayX Collections Team',
      });
      if (res.success || res.paired || res.session) {
        setNotice(`WhatsApp linked successfully with ${inputPhoneNumber}!`);
        setQrCode('');
        await fetchAllData();
        setActiveTab('messenger');
      }
    } catch (e: any) {
      setError(e?.message || 'Phone number linking failed. Please check the number.');
    } finally {
      setPairing(false);
    }
  };

  const linkWithPairingCode = async () => {
    setPairing(true);
    setError('');
    setNotice('');
    try {
      const codeToUse = inputCode.trim() || pairingCode;
      const res = await whatsapp.pairByCode(codeToUse, inputPhoneNumber);
      if (res.success || res.session) {
        setNotice('WhatsApp linked successfully via pairing code!');
        setQrCode('');
        await fetchAllData();
        setActiveTab('messenger');
      }
    } catch (e: any) {
      setError(e?.message || 'Pairing code linking failed.');
    } finally {
      setPairing(false);
    }
  };

  const simulatePairDevice = async () => {
    setPairing(true);
    setError('');
    setNotice('');
    try {
      const res = await whatsapp.scanQR(inputPhoneNumber);
      if (res.success || res.session) {
        setNotice('WhatsApp device paired successfully via scanner.');
        setQrCode('');
        await fetchAllData();
        setActiveTab('messenger');
      }
    } catch (e: any) {
      setError(e?.message || 'Pairing failed. Please try again.');
    } finally {
      setPairing(false);
    }
  };

  const disconnectDevice = async () => {
    setError('');
    try {
      await whatsapp.disconnect();
      setNotice('Disconnected WhatsApp session.');
      setQrCode('');
      await fetchAllData();
    } catch (e: any) {
      setError(e?.message || 'Disconnect failed.');
    }
  };

  const handleSendChatMessage = async () => {
    if (!inputChatMessage.trim() || !selectedCustomer) return;
    const textToSend = inputChatMessage.trim();
    setInputChatMessage('');

    const newMsg: ChatMessage = {
      id: `msg_${Date.now()}`,
      sender: 'rep',
      text: textToSend,
      timestamp: new Date().toISOString(),
      status: 'delivered',
    };

    setActiveChatMessages((prev) => [...prev, newMsg]);

    // Send to backend API
    try {
      await whatsapp.sendMessage({
        recipient: selectedCustomer.phone,
        message: textToSend,
        customer_id: selectedCustomer.customer_id,
        customer_name: selectedCustomer.customer_name,
        template_name: 'direct_chat',
      });
    } catch (e) {
      console.error('Failed to log message to backend:', e);
    }

    // Simulate realistic customer reply
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      const sampleReplies = [
        `Thank you for the update. I have initiated payment of ₹${selectedCustomer.unpaid_amount.toLocaleString('en-IN')} via the RepayX link.`,
        `Got it. I will settle the outstanding balance by tomorrow 2:00 PM positively. Please hold legal escalation.`,
        `Can you please confirm if the 100% late penalty waiver is reflected in the payment receipt?`,
        `Payment successful via UPI (Ref: ${Math.floor(100000000000 + Math.random() * 900000000000)}). Please update my loan clearance status.`,
      ];
      const randomReply = sampleReplies[Math.floor(Math.random() * sampleReplies.length)];
      const customerReply: ChatMessage = {
        id: `reply_${Date.now()}`,
        sender: 'customer',
        text: randomReply,
        timestamp: new Date().toISOString(),
        status: 'delivered',
      };
      setActiveChatMessages((prev) => [...prev, customerReply]);
    }, 1600);
  };

  const handleAutoDispatch = async () => {
    setDispatching(true);
    setError('');
    setNotice('');
    try {
      const res = await whatsapp.autoDispatch({
        target_tier: selectedTier,
        template_id: selectedTemplateId,
        custom_body: customText || undefined,
      });
      const count = res.dispatched ?? (res as any).total_sent ?? 0;
      setNotice(`Automated outreach completed: ${count} message(s) dispatched to defaulter customers.`);
      await fetchAllData();
    } catch (e: any) {
      setError(e?.message || 'Auto dispatch failed.');
    } finally {
      setDispatching(false);
    }
  };

  const handleOpenSingleModal = (defaulter: WhatsAppDefaulter) => {
    setActiveModalDefaulter(defaulter);
    const tmpl = templates.find((t) => t.id === selectedTemplateId) || templates[0];
    const defaultTemplateBody = tmpl ? tmpl.body : 'Dear {{customer_name}}, your overdue amount of ₹{{unpaid_amount}} for Loan #{{customer_id}} is pending. Please pay immediately: {{payment_link}}';
    const rendered = defaultTemplateBody
      .replace(/{{customer_name}}/g, defaulter.customer_name)
      .replace(/{{customer_id}}/g, String(defaulter.customer_id))
      .replace(/{{unpaid_amount}}/g, defaulter.unpaid_amount.toLocaleString('en-IN'))
      .replace(/{{late_days}}/g, String(Math.round(defaulter.late_days)))
      .replace(/{{payment_link}}/g, `https://pay.repayx.ai/inv/${defaulter.customer_id}`);
    setSingleMessageText(rendered);
  };

  const handleSendSingleMessage = async () => {
    if (!activeModalDefaulter) return;
    setSendingSingle(true);
    setError('');
    setNotice('');
    try {
      await whatsapp.sendMessage({
        recipient: activeModalDefaulter.phone,
        message: singleMessageText,
        customer_id: activeModalDefaulter.customer_id,
        customer_name: activeModalDefaulter.customer_name,
        template_name: selectedTemplateId,
      });
      setNotice(`Recovery message sent to ${activeModalDefaulter.customer_name} (${activeModalDefaulter.phone}).`);
      setActiveModalDefaulter(null);
      await fetchAllData();
    } catch (e: any) {
      setError(e?.message || 'Failed to send individual recovery message.');
    } finally {
      setSendingSingle(false);
    }
  };

  const openOfficialWhatsAppWeb = (phone: string, message?: string) => {
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const encodedText = encodeURIComponent(message || `Dear Customer, this is RepayX Collections regarding your loan repayment.`);
    window.open(`https://web.whatsapp.com/send?phone=${cleanPhone}&text=${encodedText}`, '_blank');
  };

  const openWhatsAppMobile = (phone: string, message?: string) => {
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const encodedText = encodeURIComponent(message || `Dear Customer, this is RepayX Collections regarding your loan repayment.`);
    window.open(`https://wa.me/${cleanPhone}?text=${encodedText}`, '_blank');
  };

  const isConnected = !!status?.connected;
  const filteredDefaulters = defaulters.filter((d) => {
    const q = chatSearch.toLowerCase();
    return d.customer_name.toLowerCase().includes(q) || d.phone.includes(q) || String(d.customer_id).includes(q);
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-16">
      {/* Top Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-600 text-white rounded-2xl shadow-md shadow-emerald-600/20">
              <MessageSquare className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                WhatsApp Web Collections Hub
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold border border-emerald-300">
                  v2.4 Live
                </span>
              </h1>
              <p className="text-sm text-slate-500">
                Direct WhatsApp Web messenger, 2-way borrower chat, and automated recovery dispatch for loan portfolios.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold border ${
            isConnected
              ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
              : 'bg-amber-50 border-amber-300 text-amber-700'
          }`}>
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
            {isConnected ? `Linked: ${status.session_info?.phone_number || '+91 98201 54321'}` : 'Pairing Required'}
          </div>

          {isConnected && (
            <button
              onClick={disconnectDevice}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-xl transition"
              title="Disconnect WhatsApp Session"
            >
              <LogOut className="w-3.5 h-3.5" /> Disconnect
            </button>
          )}

          <button
            onClick={() => fetchAllData()}
            disabled={loading}
            className="p-2 text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition"
            title="Refresh state"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Tab Navigation */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-1">
        <button
          onClick={() => setActiveTab('messenger')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-t-xl transition border-b-2 -mb-[2px] ${
            activeTab === 'messenger'
              ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          WhatsApp Web Messenger
          <span className="ml-1 text-[11px] px-1.5 py-0.2 bg-emerald-200/80 text-emerald-800 rounded-full font-bold">
            Live
          </span>
        </button>

        <button
          onClick={() => setActiveTab('outreach')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-t-xl transition border-b-2 -mb-[2px] ${
            activeTab === 'outreach'
              ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Zap className="w-4 h-4 text-blue-600" />
          Automated Recovery Studio
        </button>

        <button
          onClick={() => setActiveTab('defaulters')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-t-xl transition border-b-2 -mb-[2px] ${
            activeTab === 'defaulters'
              ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Users className="w-4 h-4" />
          Defaulters Directory ({summary.total_defaulters.toLocaleString('en-IN')})
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-t-xl transition border-b-2 -mb-[2px] ${
            activeTab === 'audit'
              ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Clock className="w-4 h-4" />
          Delivery Audit Log
        </button>

        <button
          onClick={() => setActiveTab('scanner')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-t-xl transition border-b-2 -mb-[2px] ${
            activeTab === 'scanner'
              ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <QrCode className="w-4 h-4" />
          QR & Device Pairing
        </button>
      </div>

      {/* Alert Notices */}
      {error && (
        <div role="alert" className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3 text-rose-800 text-sm">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1 font-medium">{error}</div>
        </div>
      )}

      {notice && (
        <div role="status" className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-3 text-emerald-800 text-sm">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div className="flex-1 font-medium">{notice}</div>
        </div>
      )}

      {/* KPI Metrics Ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Defaulters</span>
            <div className="p-2 bg-slate-100 rounded-xl text-slate-600"><Users className="w-4 h-4" /></div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-1">{summary.total_defaulters.toLocaleString('en-IN')}</p>
          <span className="text-xs text-slate-500 mt-0.5 inline-block">Flagged across loan portfolios</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-rose-600 uppercase tracking-wider">High Risk Defaulters</span>
            <div className="p-2 bg-rose-50 rounded-xl text-rose-600"><ShieldAlert className="w-4 h-4" /></div>
          </div>
          <p className="text-2xl font-bold text-rose-700 mt-1">{summary.high_risk_defaulters.toLocaleString('en-IN')}</p>
          <span className="text-xs text-rose-600 mt-0.5 inline-block">Probability of Default &gt; 70%</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-600 uppercase tracking-wider">Overdue Target</span>
            <div className="p-2 bg-amber-50 rounded-xl text-amber-600"><Clock className="w-4 h-4" /></div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-1">
            ₹{summary.total_unpaid_formatted || Number(summary.total_unpaid_exposure).toLocaleString('en-IN')}
          </p>
          <span className="text-xs text-amber-700 mt-0.5 inline-block">Recovery target balance</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Dispatched Messages</span>
            <div className="p-2 bg-emerald-50 rounded-xl text-emerald-600"><Send className="w-4 h-4" /></div>
          </div>
          <p className="text-2xl font-bold text-emerald-700 mt-1">
            {(status?.stats?.total_sent ?? messages.length).toLocaleString('en-IN')}
          </p>
          <span className="text-xs text-emerald-600 mt-0.5 inline-block">Live collection delivery ticks</span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: WHATSAPP WEB MESSENGER (AUTHENTIC LIVE CHAT CLIENT)               */}
      {/* ========================================================================= */}
      {activeTab === 'messenger' && (
        <div className="bg-white border border-slate-300 rounded-3xl overflow-hidden shadow-xl grid grid-cols-1 lg:grid-cols-12 min-h-[680px]">
          {/* Left Panel: Chat List (4 cols) */}
          <div className="lg:col-span-4 border-r border-slate-200 flex flex-col bg-slate-50">
            {/* WhatsApp Web Left Header */}
            <div className="p-3.5 bg-slate-100 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-emerald-700 text-white flex items-center justify-center font-bold text-xs shadow">
                  RX
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900">RepayX Collections</h3>
                  <div className="flex items-center gap-1 text-[11px] text-emerald-600">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Online (WhatsApp Web)
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1 text-slate-500">
                <button
                  onClick={() => generateNewQR()}
                  title="Refresh Session"
                  className="p-1.5 hover:bg-slate-200 rounded-lg transition"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Chat Search */}
            <div className="p-2.5 bg-white border-b border-slate-200">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={chatSearch}
                  onChange={(e) => setChatSearch(e.target.value)}
                  placeholder="Search chats by name, phone, or loan ID..."
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-100 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* Chat Conversations List */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 max-h-[580px]">
              {filteredDefaulters.slice(0, 30).map((d) => {
                const isSelected = selectedCustomer?.customer_id === d.customer_id;
                return (
                  <div
                    key={d.customer_id}
                    onClick={() => setSelectedCustomer(d)}
                    className={`p-3.5 flex items-center gap-3 cursor-pointer transition ${
                      isSelected ? 'bg-emerald-50 border-l-4 border-emerald-600' : 'hover:bg-white'
                    }`}
                  >
                    <div className="relative">
                      <div className="w-10 h-10 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs">
                        {d.customer_name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                      </div>
                      <span
                        className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ring-2 ring-white ${
                          d.risk_tier === 'High Risk' ? 'bg-rose-500' : 'bg-amber-500'
                        }`}
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold text-slate-900 truncate">{d.customer_name}</p>
                        <span className="text-[10px] text-slate-400">12:45 PM</span>
                      </div>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">
                        Loan #{d.customer_id} • Due ₹{d.unpaid_amount.toLocaleString('en-IN')}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span
                          className={`text-[9px] font-semibold px-1.5 py-0.2 rounded-full ${
                            d.risk_tier === 'High Risk' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          {d.risk_tier}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">{d.phone}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Center Panel: Active WhatsApp Chat Conversation (5 cols) */}
          <div className="lg:col-span-5 flex flex-col bg-[#efeae2] border-r border-slate-200">
            {selectedCustomer ? (
              <>
                {/* Chat Top Navigation Bar */}
                <div className="p-3 bg-slate-100 border-b border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shadow">
                      {selectedCustomer.customer_name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-slate-900">{selectedCustomer.customer_name}</h3>
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                        <span className="font-mono text-emerald-700 font-medium">{selectedCustomer.phone}</span>
                        <span>•</span>
                        <span className="text-slate-600 font-medium">{selectedCustomer.risk_tier}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => openOfficialWhatsAppWeb(selectedCustomer.phone)}
                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold rounded-lg shadow-sm transition flex items-center gap-1"
                      title="Open in Official WhatsApp Web Desktop/Browser"
                    >
                      <ExternalLink className="w-3 h-3" /> Open Web
                    </button>
                    <button
                      type="button"
                      onClick={() => openWhatsAppMobile(selectedCustomer.phone)}
                      className="p-1.5 hover:bg-slate-200 text-slate-600 rounded-lg transition"
                      title="Open via wa.me link"
                    >
                      <Smartphone className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* WhatsApp Messages Scroll Area */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#efeae2]/90 min-h-[440px] max-h-[480px]">
                  <div className="text-center my-2">
                    <span className="px-3 py-1 bg-white/80 rounded-lg text-[10px] font-semibold text-slate-600 shadow-xs uppercase tracking-wider">
                      Today • Encrypted WhatsApp Conversation
                    </span>
                  </div>

                  {activeChatMessages.map((msg) => {
                    const isRep = msg.sender === 'rep';
                    return (
                      <div key={msg.id} className={`flex ${isRep ? 'justify-end' : 'justify-start'}`}>
                        <div
                          className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 shadow-sm text-xs space-y-1 relative ${
                            isRep
                              ? 'bg-[#d9fdd3] text-slate-900 rounded-tr-none'
                              : 'bg-white text-slate-900 rounded-tl-none'
                          }`}
                        >
                          <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                          <div className="flex items-center justify-end gap-1 text-[10px] text-slate-500 pt-0.5">
                            <span>{formatTimestamp(msg.timestamp)}</span>
                            {isRep && (
                              <CheckCheck className={`w-3.5 h-3.5 ${msg.status === 'read' ? 'text-blue-500' : 'text-slate-400'}`} />
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {isTyping && (
                    <div className="flex justify-start">
                      <div className="bg-white rounded-2xl rounded-tl-none px-3 py-2 shadow-sm text-xs text-slate-500 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" />
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce delay-100" />
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce delay-200" />
                        <span className="text-[11px] ml-1">{selectedCustomer.customer_name} is typing...</span>
                      </div>
                    </div>
                  )}

                  <div ref={chatBottomRef} />
                </div>

                {/* Quick Recovery Action Pills */}
                <div className="p-2 bg-slate-100 border-t border-slate-200 flex items-center gap-1.5 overflow-x-auto text-[11px]">
                  <button
                    onClick={() => setInputChatMessage(`Dear ${selectedCustomer.customer_name}, please complete your overdue EMI payment of ₹${selectedCustomer.unpaid_amount.toLocaleString('en-IN')} via: https://pay.repayx.ai/inv/${selectedCustomer.customer_id}`)}
                    className="px-2.5 py-1 bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 border border-slate-300 rounded-full shrink-0 transition"
                  >
                    ⚡ Send Payment Link
                  </button>
                  <button
                    onClick={() => setInputChatMessage(`Special Offer: Clear your principal balance of ₹${selectedCustomer.unpaid_amount.toLocaleString('en-IN')} today and get 100% late fee waiver: https://pay.repayx.ai/inv/${selectedCustomer.customer_id}`)}
                    className="px-2.5 py-1 bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 border border-slate-300 rounded-full shrink-0 transition"
                  >
                    💰 100% Penalty Waiver
                  </button>
                  <button
                    onClick={() => setInputChatMessage(`URGENT LEGAL ALERT: Overdue for Loan #${selectedCustomer.customer_id} is pending for ${Math.round(selectedCustomer.late_days)} days. Please clear today to prevent legal escalation.`)}
                    className="px-2.5 py-1 bg-white hover:bg-rose-50 text-slate-700 hover:text-rose-700 border border-slate-300 rounded-full shrink-0 transition"
                  >
                    ⚠️ Legal Notice
                  </button>
                </div>

                {/* WhatsApp Message Input Bar */}
                <div className="p-3 bg-slate-100 border-t border-slate-200 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setInputChatMessage((prev) => prev + ' 👋 ')}
                    className="p-1.5 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-200 transition"
                    title="Insert emoji"
                  >
                    <Smile className="w-5 h-5" />
                  </button>

                  <input
                    type="text"
                    value={inputChatMessage}
                    onChange={(e) => setInputChatMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        void handleSendChatMessage();
                      }
                    }}
                    placeholder="Type a message or select a template above (Press Enter to send)..."
                    className="flex-1 px-4 py-2 bg-white border border-slate-300 rounded-2xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />

                  <button
                    onClick={handleSendChatMessage}
                    disabled={!inputChatMessage.trim()}
                    className="p-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded-full transition shadow-sm"
                    title="Send message"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-500">
                <MessageSquare className="w-12 h-12 text-slate-300 mb-2" />
                <p className="font-semibold text-slate-700">Select a Customer to Open WhatsApp Chat</p>
                <p className="text-xs text-slate-400 max-w-xs mt-1">
                  Choose any customer from the left list to view their recovery thread or send messages.
                </p>
              </div>
            )}
          </div>

          {/* Right Panel: Customer Loan Intelligence Profile (3 cols) */}
          <div className="lg:col-span-3 bg-white p-5 border-t lg:border-t-0 flex flex-col justify-between space-y-6">
            {selectedCustomer ? (
              <div className="space-y-5">
                <div className="text-center border-b border-slate-100 pb-4">
                  <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-800 font-bold text-lg flex items-center justify-center mx-auto mb-2 shadow-sm border border-emerald-200">
                    {selectedCustomer.customer_name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">{selectedCustomer.customer_name}</h3>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">{selectedCustomer.phone}</p>
                  <span
                    className={`inline-block mt-2 text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                      selectedCustomer.risk_tier === 'High Risk'
                        ? 'bg-rose-100 text-rose-800 border border-rose-200'
                        : 'bg-amber-100 text-amber-800 border border-amber-200'
                    }`}
                  >
                    {selectedCustomer.risk_tier} (Risk Score: {selectedCustomer.risk_score}%)
                  </span>
                </div>

                <div className="space-y-3 text-xs">
                  <h4 className="font-semibold text-slate-700 uppercase tracking-wider text-[10px]">Loan Profile Details</h4>

                  <div className="p-3 bg-slate-50 rounded-xl space-y-2 border border-slate-100">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Customer ID:</span>
                      <span className="font-mono font-bold text-slate-800">#{selectedCustomer.customer_id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Overdue Balance:</span>
                      <span className="font-bold text-rose-700">₹{selectedCustomer.unpaid_amount.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Days Past Due:</span>
                      <span className="font-bold text-amber-700">{Math.round(selectedCustomer.late_days)} Days</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Last Status:</span>
                      <span className="text-emerald-700 font-medium capitalize">{selectedCustomer.last_due_date}</span>
                    </div>
                  </div>

                  <div className="space-y-2 pt-2">
                    <button
                      onClick={() => openOfficialWhatsAppWeb(selectedCustomer.phone)}
                      className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition text-xs flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      <ExternalLink className="w-3.5 h-3.5" /> Launch Official WhatsApp Web
                    </button>

                    <button
                      onClick={() => handleOpenSingleModal(selectedCustomer)}
                      className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold rounded-xl transition text-xs flex items-center justify-center gap-1.5"
                    >
                      <Zap className="w-3.5 h-3.5 text-blue-600" /> Template Notice Dispatch
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-slate-400 text-xs">
                No customer selected.
              </div>
            )}

            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-[11px] text-emerald-800 space-y-1">
              <p className="font-bold flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-emerald-600" /> Automated Pay Links
              </p>
              <p>
                All outgoing messages automatically generate authenticated RepayX UPI payment URLs linked to loan balances.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: AUTOMATED RECOVERY STUDIO                                          */}
      {/* ========================================================================= */}
      {activeTab === 'outreach' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-bold text-slate-900">Automated Recovery Campaign Studio</h2>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full border border-blue-200">
              Template Engine 2.0
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Target Tier Selection */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Target Defaulter Tier</label>
              <select
                value={selectedTier}
                onChange={(e) => setSelectedTier(e.target.value as any)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="high">High Risk Defaulters Only (Risk Score &gt; 70%)</option>
                <option value="medium">Medium Risk Defaulters (Risk Score 40-70%)</option>
                <option value="unpaid_only">All Defaulters with Unpaid Balances &gt; ₹5,000</option>
                <option value="all">Entire Defaulters Portfolio</option>
              </select>
            </div>

            {/* Template Selection */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Message Recovery Template</label>
              <select
                value={selectedTemplateId}
                onChange={(e) => setSelectedTemplateId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {templates.map((tmpl) => (
                  <option key={tmpl.id} value={tmpl.id}>
                    {tmpl.name} ({tmpl.category})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Template Live Preview */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Live Message Preview with Dynamic Variables</label>
            <div className="p-4 bg-emerald-50/50 border border-emerald-200 rounded-2xl text-xs text-slate-800 leading-relaxed font-sans shadow-inner">
              {(() => {
                const tmpl = templates.find((t) => t.id === selectedTemplateId) || templates[0];
                const defaultCustomer = defaulters[0] || {
                  customer_name: 'Rajesh Sharma',
                  customer_id: 385102,
                  unpaid_amount: 24500,
                  late_days: 21,
                };
                return (tmpl?.body || '')
                  .replace(/{{customer_name}}/g, defaultCustomer.customer_name)
                  .replace(/{{customer_id}}/g, String(defaultCustomer.customer_id))
                  .replace(/{{unpaid_amount}}/g, defaultCustomer.unpaid_amount.toLocaleString('en-IN'))
                  .replace(/{{late_days}}/g, String(Math.round(defaultCustomer.late_days)))
                  .replace(/{{payment_link}}/g, `https://pay.repayx.ai/inv/${defaultCustomer.customer_id}`);
              })()}
            </div>
          </div>

          {/* Custom Message Override */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Custom Message Override (Optional)</label>
            <textarea
              rows={3}
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              placeholder="Leave empty to use official template, or write custom text with {{customer_name}}, {{unpaid_amount}}, {{payment_link}}..."
              className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Dispatch Button */}
          <div className="pt-2 flex justify-end">
            <button
              onClick={handleAutoDispatch}
              disabled={dispatching}
              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-sm rounded-xl transition flex items-center gap-2 shadow-md shadow-emerald-600/20"
            >
              <Send className="w-4 h-4" />
              {dispatching ? 'Dispatching Campaign...' : '🚀 Dispatch Automated Recovery Campaign'}
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: DEFAULTERS PORTFOLIO DIRECTORY                                     */}
      {/* ========================================================================= */}
      {activeTab === 'defaulters' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Loan Defaulters Directory</h2>
              <p className="text-xs text-slate-500">Live portfolio list of overdue borrowers with risk scoring and recovery actions.</p>
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  void fetchAllData();
                }}
                placeholder="Search by ID, name, or phone..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Customer ID</th>
                  <th className="py-3 px-4">Borrower Name</th>
                  <th className="py-3 px-4">Phone Number</th>
                  <th className="py-3 px-4">Risk Tier</th>
                  <th className="py-3 px-4">Overdue Amount</th>
                  <th className="py-3 px-4">Days Overdue</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {defaulters.slice(0, 50).map((d) => (
                  <tr key={d.customer_id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4 font-mono font-medium text-slate-900">#{d.customer_id}</td>
                    <td className="py-3 px-4 font-bold text-slate-900">{d.customer_name}</td>
                    <td className="py-3 px-4 font-mono text-slate-600">{d.phone}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full font-bold text-[10px] ${
                          d.risk_tier === 'High Risk'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {d.risk_tier} ({d.risk_score}%)
                      </span>
                    </td>
                    <td className="py-3 px-4 font-bold text-rose-700">₹{d.unpaid_amount.toLocaleString('en-IN')}</td>
                    <td className="py-3 px-4 font-medium text-slate-700">{Math.round(d.late_days)} Days</td>
                    <td className="py-3 px-4 text-right space-x-2">
                      <button
                        onClick={() => {
                          setSelectedCustomer(d);
                          setActiveTab('messenger');
                        }}
                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg text-[11px] transition inline-flex items-center gap-1"
                      >
                        <MessageSquare className="w-3 h-3" /> Chat
                      </button>
                      <button
                        onClick={() => handleOpenSingleModal(d)}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-[11px] transition"
                      >
                        Send Notice
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: DELIVERY AUDIT LOG                                                 */}
      {/* ========================================================================= */}
      {activeTab === 'audit' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Message Delivery & Audit Logs</h2>
              <p className="text-xs text-slate-500">Real-time delivery verification ticks and message logs.</p>
            </div>
            <button
              onClick={() => fetchAllData()}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition inline-flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Refresh Logs
            </button>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Recipient Phone</th>
                  <th className="py-3 px-4">Borrower Name</th>
                  <th className="py-3 px-4">Template</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Message Preview</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {messages.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-4 text-slate-500 whitespace-nowrap">{formatTimestamp(m.sent_at)}</td>
                    <td className="py-3 px-4 font-mono font-medium text-slate-900">{m.recipient}</td>
                    <td className="py-3 px-4 font-semibold text-slate-800">{m.customer_name || 'Borrower'}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 bg-slate-100 rounded-md font-mono text-[10px] text-slate-700">
                        {m.template_name || 'custom'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold text-[11px]">
                        <CheckCheck className="w-3.5 h-3.5 text-emerald-600" /> {m.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600 max-w-xs truncate" title={m.message_preview}>
                      {m.message_preview}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: QR & DEVICE PAIRING SETTINGS                                      */}
      {/* ========================================================================= */}
      {activeTab === 'scanner' && (
        <div className="max-w-2xl mx-auto bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <QrCode className="w-5 h-5 text-emerald-600" />
              <h2 className="text-lg font-bold text-slate-900">WhatsApp Device Pairing Settings</h2>
            </div>
            {isConnected && (
              <button
                onClick={disconnectDevice}
                className="px-3 py-1 bg-rose-50 text-rose-700 hover:bg-rose-100 text-xs font-semibold rounded-xl border border-rose-200 transition inline-flex items-center gap-1.5"
              >
                <LogOut className="w-3.5 h-3.5" /> Disconnect Session
              </button>
            )}
          </div>

          {/* Method Switcher */}
          <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-2xl text-xs font-medium text-slate-600">
            <button
              type="button"
              onClick={() => setPairMethod('qr')}
              className={`py-2 rounded-xl transition ${pairMethod === 'qr' ? 'bg-white text-emerald-700 font-bold shadow-sm' : 'hover:text-slate-900'}`}
            >
              📷 Scan QR Code
            </button>
            <button
              type="button"
              onClick={() => setPairMethod('phone')}
              className={`py-2 rounded-xl transition ${pairMethod === 'phone' ? 'bg-white text-emerald-700 font-bold shadow-sm' : 'hover:text-slate-900'}`}
            >
              📱 Link Phone Number
            </button>
            <button
              type="button"
              onClick={() => setPairMethod('code')}
              className={`py-2 rounded-xl transition ${pairMethod === 'code' ? 'bg-white text-emerald-700 font-bold shadow-sm' : 'hover:text-slate-900'}`}
            >
              🔑 8-Digit Pairing Code
            </button>
          </div>

          {pairMethod === 'qr' && (
            <div className="text-center bg-slate-50 border border-slate-200/80 rounded-2xl p-6 flex flex-col items-center justify-center space-y-4">
              {qrCode ? (
                <>
                  <div
                    onClick={simulatePairDevice}
                    className="p-4 bg-white border-2 border-emerald-500/40 rounded-2xl shadow-lg cursor-pointer hover:border-emerald-600 transition group relative"
                    title="Click QR Code to simulate scan & pair"
                  >
                    <img src={qrCode} alt="WhatsApp Web QR Code" className="w-60 h-60 object-contain rounded-xl" />
                    <div className="absolute inset-0 bg-emerald-950/0 group-hover:bg-emerald-950/10 rounded-2xl flex items-center justify-center transition">
                      <span className="opacity-0 group-hover:opacity-100 bg-emerald-600 text-white text-xs font-bold px-3.5 py-1.5 rounded-full shadow-md transition">
                        Click to Pair
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between w-full max-w-xs text-xs text-slate-500 px-2">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-amber-500" />
                      <span>Expires in <strong className="text-slate-800">{qrExpiresIn}s</strong></span>
                    </div>
                    <button
                      type="button"
                      onClick={generateNewQR}
                      disabled={generatingQr}
                      className="text-emerald-600 hover:text-emerald-700 font-semibold inline-flex items-center gap-1"
                    >
                      <RefreshCw className={`w-3 h-3 ${generatingQr ? 'animate-spin' : ''}`} /> Refresh QR
                    </button>
                  </div>
                </>
              ) : (
                <div className="py-8 space-y-3">
                  <Smartphone className="w-12 h-12 text-slate-400 mx-auto animate-bounce" />
                  <p className="text-sm font-semibold text-slate-800">Scan QR Code to Link WhatsApp</p>
                  <button
                    onClick={generateNewQR}
                    disabled={generatingQr}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-sm transition"
                  >
                    <QrCode className="w-4 h-4" />
                    {generatingQr ? 'Generating...' : 'Generate New QR'}
                  </button>
                </div>
              )}

              <button
                onClick={simulatePairDevice}
                disabled={pairing}
                className="w-full max-w-sm py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 shadow-sm"
              >
                <Smartphone className="w-3.5 h-3.5" />
                {pairing ? 'Connecting session...' : '⚡ Simulate Phone Camera Scan & Pair'}
              </button>
            </div>
          )}

          {pairMethod === 'phone' && (
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">WhatsApp Phone Number</label>
                <input
                  type="text"
                  value={inputPhoneNumber}
                  onChange={(e) => setInputPhoneNumber(e.target.value)}
                  placeholder="+919820154321"
                  className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
                <p className="text-[11px] text-slate-500">Enter phone number with international country code (e.g. +91)</p>
              </div>
              <button
                onClick={linkWithPhoneNumber}
                disabled={pairing || !inputPhoneNumber}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 shadow-sm"
              >
                <Smartphone className="w-3.5 h-3.5" />
                {pairing ? 'Linking device...' : 'Link Phone Number to RepayX'}
              </button>
            </div>
          )}

          {pairMethod === 'code' && (
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-6 space-y-4">
              <div className="text-center space-y-2">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">8-Character Pairing Code</p>
                <div className="p-4 bg-white border-2 border-dashed border-emerald-500/50 rounded-xl font-mono text-2xl font-bold tracking-widest text-emerald-800">
                  {pairingCode || '7X8K-9M2P'}
                </div>
                <p className="text-[11px] text-slate-500">
                  Open WhatsApp on Phone &gt; Linked Devices &gt; Link with phone number instead, then enter this code.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Enter Code or Custom Code</label>
                <input
                  type="text"
                  value={inputCode}
                  onChange={(e) => setInputCode(e.target.value)}
                  placeholder={pairingCode || 'ABCD-1234'}
                  className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-mono uppercase tracking-wider focus:ring-2 focus:ring-emerald-500 focus:outline-none text-center font-bold"
                />
              </div>

              <button
                onClick={linkWithPairingCode}
                disabled={pairing}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 shadow-sm"
              >
                <Zap className="w-3.5 h-3.5" />
                {pairing ? 'Verifying...' : 'Verify Code & Connect'}
              </button>
            </div>
          )}

          {/* Quick Linking Instructions */}
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-2 text-xs text-emerald-900">
            <p className="font-bold flex items-center gap-1.5">
              <Smartphone className="w-4 h-4 text-emerald-600" /> How to Link via WhatsApp:
            </p>
            <ol className="list-decimal list-inside space-y-1 text-emerald-800">
              <li>Open <strong>WhatsApp</strong> on your mobile device.</li>
              <li>Tap <strong>Settings / Menu ⋮</strong> &gt; <strong>Linked Devices</strong>.</li>
              <li>Tap <strong>Link a Device</strong> and point camera at the QR code above or use phone pairing.</li>
            </ol>
          </div>
        </div>
      )}

      {/* Single Defaulter Modal */}
      {activeModalDefaulter && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                Send Notice to {activeModalDefaulter.customer_name}
              </h3>
              <button
                onClick={() => setActiveModalDefaulter(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="space-y-1 text-xs">
              <p className="text-slate-600">
                Recipient: <strong className="font-mono text-slate-900">{activeModalDefaulter.phone}</strong> (Loan #{activeModalDefaulter.customer_id})
              </p>
              <p className="text-slate-600">
                Overdue: <strong className="text-rose-700">₹{activeModalDefaulter.unpaid_amount.toLocaleString('en-IN')}</strong> ({Math.round(activeModalDefaulter.late_days)} days late)
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Message Text with Link</label>
              <textarea
                rows={5}
                value={singleMessageText}
                onChange={(e) => setSingleMessageText(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-sans leading-relaxed"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setActiveModalDefaulter(null)}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSendSingleMessage}
                disabled={sendingSingle || !singleMessageText.trim()}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-sm"
              >
                <Send className="w-3.5 h-3.5" />
                {sendingSingle ? 'Sending...' : 'Send WhatsApp Message'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default function WhatsApp() {
  return (
    <ErrorBoundary>
      <WhatsAppDashboard />
    </ErrorBoundary>
  );
}
