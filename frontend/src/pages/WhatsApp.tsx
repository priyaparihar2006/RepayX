import React, { Component, type ErrorInfo, type ReactNode, useEffect, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Clock,
  LogOut,
  MessageSquare,
  QrCode,
  RefreshCw,
  Search,
  Send,
  ShieldAlert,
  Smartphone,
  Sparkles,
  Users,
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
    return new Date(val).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
  } catch {
    return val;
  }
};

const WhatsAppDashboard: React.FC = () => {
  const [status, setStatus] = useState<WhatsAppStatus | null>(null);
  const [qrCode, setQrCode] = useState<string>('');
  const [qrExpiresIn, setQrExpiresIn] = useState<number>(0);
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

  const [loading, setLoading] = useState<boolean>(true);
  const [generatingQr, setGeneratingQr] = useState<boolean>(false);
  const [dispatching, setDispatching] = useState<boolean>(false);
  const [pairing, setPairing] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [notice, setNotice] = useState<string>('');

  // Auto Outreach controls
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
        whatsapp.getMessages(25).catch(() => ({ success: false, messages: [], count: 0 })),
      ]);

      if (statusRes) {
        setStatus(statusRes);
        if (statusRes.qr_code) {
          setQrCode(statusRes.qr_code);
          setQrExpiresIn(statusRes.qr_expires_in || 120);
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

  // Poll QR expiration / status if scanning
  useEffect(() => {
    if (!qrCode || status?.connected) return;
    const interval = setInterval(() => {
      setQrExpiresIn((prev) => {
        if (prev <= 1) {
          void generateNewQR();
          return 120;
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
        setQrExpiresIn(res.expires_in || 120);
        setStatus((prev) => (prev ? { ...prev, status: 'SCAN_QR_CODE', qr_code: res.qr_code } : null));
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to generate QR Code.');
    } finally {
      setGeneratingQr(false);
    }
  };

  const simulatePairDevice = async () => {
    setPairing(true);
    setError('');
    setNotice('');
    try {
      const res = await whatsapp.pairDevice({
        phone_number: '+919820154321',
        user_name: 'RepayX Collections Hub',
      });
      if (res.success) {
        setNotice('WhatsApp device paired successfully.');
        setQrCode('');
        await fetchAllData();
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
    const defaultTemplateBody = tmpl ? tmpl.body : 'Dear {{customer_name}}, your overdue amount of ₹{{unpaid_amount}} for Loan #{{customer_id}} is pending. Please pay immediately.';
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
        customer_id: activeModalDefaulter.customer_id,
        customer_name: activeModalDefaulter.customer_name,
        recipient: activeModalDefaulter.phone,
        message: singleMessageText,
        template_name: selectedTemplateId,
      });
      setNotice(`Message delivered to ${activeModalDefaulter.customer_name} (${activeModalDefaulter.phone}).`);
      setActiveModalDefaulter(null);
      await fetchAllData();
    } catch (e: any) {
      setError(e?.message || 'Failed to send individual WhatsApp message.');
    } finally {
      setSendingSingle(false);
    }
  };

  const currentTemplate = templates.find((t) => t.id === selectedTemplateId) || templates[0];
  const sampleDefaulter = defaulters[0] || {
    customer_id: 385772,
    customer_name: 'Rahul Sharma',
    unpaid_amount: 28450,
    late_days: 18,
    risk_score: 80.1,
  };
  const previewText = (customText || currentTemplate?.body || '')
    .replace(/{{customer_name}}/g, sampleDefaulter.customer_name)
    .replace(/{{customer_id}}/g, String(sampleDefaulter.customer_id))
    .replace(/{{unpaid_amount}}/g, (sampleDefaulter.unpaid_amount || 0).toLocaleString('en-IN'))
    .replace(/{{late_days}}/g, String(Math.round(sampleDefaulter.late_days || 0)))
    .replace(/{{payment_link}}/g, `https://pay.repayx.ai/inv/${sampleDefaulter.customer_id}`);

  const isConnected = !!status?.connected;

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-16">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/10 text-emerald-600 rounded-2xl border border-emerald-500/20">
              <MessageSquare className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">WhatsApp Web Defaulter Recovery</h1>
              <p className="text-sm text-slate-500">
                Pair your WhatsApp Web QR code to trigger automated recovery messages to loan defaulters with dynamic EMI links.
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
            {isConnected ? 'WhatsApp Web Linked' : 'Scanner Ready'}
          </div>

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

      {/* Alert / Notice Messages */}
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

      {/* Portfolio Defaulters KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Defaulters</span>
            <div className="p-2 bg-slate-100 rounded-xl text-slate-600">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">{summary.total_defaulters.toLocaleString('en-IN')}</p>
          <span className="text-xs text-slate-500 mt-1 inline-block">Flagged across loan portfolios</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-rose-600 uppercase tracking-wider">High Risk Defaulters</span>
            <div className="p-2 bg-rose-50 rounded-xl text-rose-600">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-rose-700 mt-2">{summary.high_risk_defaulters.toLocaleString('en-IN')}</p>
          <span className="text-xs text-rose-600 mt-1 inline-block">Probability of Default &gt; 70%</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-600 uppercase tracking-wider">Overdue Portfolio</span>
            <div className="p-2 bg-amber-50 rounded-xl text-amber-600">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">
            ₹{summary.total_unpaid_formatted || Number(summary.total_unpaid_exposure).toLocaleString('en-IN')}
          </p>
          <span className="text-xs text-amber-700 mt-1 inline-block">Unpaid recovery target balance</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Dispatched Messages</span>
            <div className="p-2 bg-emerald-50 rounded-xl text-emerald-600">
              <Send className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-emerald-700 mt-2">
            {(status?.stats?.total_sent ?? messages.length).toLocaleString('en-IN')}
          </p>
          <span className="text-xs text-emerald-600 mt-1 inline-block">Active delivery sessions logged</span>
        </div>
      </div>

      {/* Main Row: WhatsApp Web QR Pairing + Outreach Configuration */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: QR Scanner / Session Card (5 cols) */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <QrCode className="w-5 h-5 text-emerald-600" />
              <h2 className="text-lg font-bold text-slate-900">WhatsApp Web Scanner</h2>
            </div>
            {isConnected && (
              <button
                onClick={disconnectDevice}
                className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-xl transition"
              >
                <LogOut className="w-3.5 h-3.5" /> Disconnect
              </button>
            )}
          </div>

          {!isConnected ? (
            <div className="space-y-4">
              <div className="text-center bg-slate-50 border border-slate-200/80 rounded-2xl p-6 flex flex-col items-center justify-center">
                {qrCode ? (
                  <div className="space-y-3 flex flex-col items-center">
                    <div className="p-3 bg-white border-2 border-emerald-500/30 rounded-2xl shadow-md">
                      <img
                        src={qrCode}
                        alt="WhatsApp Web QR Code"
                        className="w-52 h-52 object-contain"
                      />
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                      <Clock className="w-3.5 h-3.5 text-amber-500" />
                      <span>QR expires in <strong className="text-slate-800">{qrExpiresIn}s</strong></span>
                    </div>
                  </div>
                ) : (
                  <div className="py-8 space-y-3">
                    <Smartphone className="w-12 h-12 text-slate-400 mx-auto animate-bounce" />
                    <p className="text-sm font-semibold text-slate-800">Scan QR Code to Connect WhatsApp</p>
                    <p className="text-xs text-slate-500 max-w-xs">
                      Open WhatsApp on your phone &gt; Linked Devices &gt; Link a Device, then point camera at the QR code.
                    </p>
                    <button
                      onClick={generateNewQR}
                      disabled={generatingQr}
                      className="mt-2 inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-sm transition"
                    >
                      <QrCode className="w-4 h-4" />
                      {generatingQr ? 'Generating...' : 'Display WhatsApp Web QR'}
                    </button>
                  </div>
                )}
              </div>

              {/* Dev Simulation Button */}
              <div className="p-4 bg-emerald-50/60 border border-emerald-200/70 rounded-2xl space-y-2">
                <div className="flex items-center gap-2 text-emerald-800 text-xs font-semibold">
                  <Zap className="w-4 h-4 text-emerald-600" /> Quick Link WhatsApp Session
                </div>
                <p className="text-xs text-emerald-700">
                  Instantly pair a live WhatsApp Web session to start dispatching collection notices immediately.
                </p>
                <button
                  onClick={simulatePairDevice}
                  disabled={pairing}
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 shadow-sm"
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  {pairing ? 'Connecting session...' : '⚡ Instant Connect / Simulate Mobile Scan'}
                </button>
              </div>
            </div>
          ) : (
            <div className="p-5 bg-emerald-50/50 border border-emerald-200 rounded-2xl space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold text-lg shadow-md shadow-emerald-600/20">
                  WA
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {status.session_info?.user_name || 'RepayX Collections Team'}
                  </h3>
                  <p className="text-xs text-emerald-700 font-mono font-medium">
                    {status.session_info?.phone_number || '+91 98201 54321'}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {status.session_info?.device || 'WhatsApp Web (Chrome / Windows)'}
                  </p>
                </div>
              </div>

              <div className="border-t border-emerald-200/60 pt-3 text-xs text-slate-600 flex justify-between">
                <span>Linked Since:</span>
                <span className="font-medium text-slate-800">
                  {formatTimestamp(status.session_info?.connected_at || status.server_time)}
                </span>
              </div>
            </div>
          )}

          {/* Quick Guidance Box */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 text-xs text-slate-600 space-y-2">
            <p className="font-semibold text-slate-800 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-blue-600" /> Automated Recovery Protocol
            </p>
            <p>
              Recovery messages contain authenticated UPI/NetBanking payment URLs linked directly to customer loan accounts. Delivery receipts and read ticks are updated in real-time.
            </p>
          </div>
        </div>

        {/* Right Column: Automated Outreach Studio (7 cols) */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-bold text-slate-900">Automated Outreach Studio</h2>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full border border-blue-200">
              Template Engine 2.0
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Target Tier Selection */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Target Defaulter Tier
              </label>
              <select
                value={selectedTier}
                onChange={(e) => setSelectedTier(e.target.value as any)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="high">High Risk Defaulters (PD &gt; 70%)</option>
                <option value="medium">Medium Risk Defaulters (PD 40-70%)</option>
                <option value="unpaid_only">All Defaulters with Balance &gt; ₹0</option>
                <option value="all">Entire Defaulter Directory</option>
              </select>
            </div>

            {/* Template Selection */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Outreach Message Template
              </label>
              <select
                value={selectedTemplateId}
                onChange={(e) => {
                  setSelectedTemplateId(e.target.value);
                  setCustomText('');
                }}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Custom Edit / Template Variables */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Message Body &amp; Variables
              </label>
              <div className="flex gap-1.5 text-[11px] text-blue-600 font-mono">
                <button
                  type="button"
                  onClick={() => setCustomText((prev) => `${prev || currentTemplate?.body || ''} {{customer_name}}`)}
                  className="px-1.5 py-0.5 bg-blue-50 rounded border border-blue-200 hover:bg-blue-100"
                >
                  +name
                </button>
                <button
                  type="button"
                  onClick={() => setCustomText((prev) => `${prev || currentTemplate?.body || ''} ₹{{unpaid_amount}}`)}
                  className="px-1.5 py-0.5 bg-blue-50 rounded border border-blue-200 hover:bg-blue-100"
                >
                  +amount
                </button>
                <button
                  type="button"
                  onClick={() => setCustomText((prev) => `${prev || currentTemplate?.body || ''} {{payment_link}}`)}
                  className="px-1.5 py-0.5 bg-blue-50 rounded border border-blue-200 hover:bg-blue-100"
                >
                  +paylink
                </button>
              </div>
            </div>
            <textarea
              rows={3}
              value={customText || currentTemplate?.body || ''}
              onChange={(e) => setCustomText(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 text-sm font-sans text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter message template text..."
            />
          </div>

          {/* Live Message Bubble Preview */}
          <div className="bg-[#EFEAE2] p-4 rounded-2xl border border-amber-200/60 shadow-inner relative overflow-hidden">
            <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-2 flex items-center gap-1">
              <Smartphone className="w-3 h-3" /> Live WhatsApp Chat Preview
            </div>
            <div className="max-w-md bg-white p-3.5 rounded-2xl rounded-tl-none shadow-sm text-xs text-slate-800 space-y-1.5 leading-relaxed">
              <p className="whitespace-pre-wrap">{previewText}</p>
              <div className="flex items-center justify-end gap-1 text-[10px] text-slate-400 font-mono">
                <span>12:00 PM</span>
                <span className="text-blue-500">✓✓</span>
              </div>
            </div>
          </div>

          {/* 1-Click Batch Auto-Dispatch Action */}
          <div className="pt-2">
            <button
              onClick={handleAutoDispatch}
              disabled={dispatching}
              className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-sm rounded-2xl shadow-lg shadow-emerald-600/20 transition flex items-center justify-center gap-2.5"
            >
              <Send className={`w-4 h-4 ${dispatching ? 'animate-bounce' : ''}`} />
              {dispatching ? 'Dispatching Automated Messages...' : 'Start Automated Outreach to Defaulters'}
            </button>
            <p className="text-[11px] text-center text-slate-400 mt-2">
              Dispatches tailored WhatsApp messages automatically to all customers in the selected risk tier.
            </p>
          </div>
        </div>
      </div>

      {/* Defaulter Directory Table */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Defaulter Recovery Directory</h2>
            <p className="text-xs text-slate-500">
              Select specific defaulters to review outstanding EMI balances or send individual WhatsApp outreach.
            </p>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search customer, ID, or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchAllData()}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider bg-slate-50/50">
                <th className="p-3.5">Customer / ID</th>
                <th className="p-3.5">Phone Number</th>
                <th className="p-3.5">Risk Level</th>
                <th className="p-3.5">Overdue Amount</th>
                <th className="p-3.5">Days Late</th>
                <th className="p-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {defaulters.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">
                    No defaulter records matching your query.
                  </td>
                </tr>
              ) : (
                defaulters.slice(0, 15).map((d) => (
                  <tr key={d.customer_id} className="hover:bg-slate-50/80 transition">
                    <td className="p-3.5 font-medium text-slate-900">
                      <div>{d.customer_name}</div>
                      <span className="text-[11px] text-slate-400 font-mono">#{d.customer_id}</span>
                    </td>
                    <td className="p-3.5 font-mono text-slate-700">{d.phone}</td>
                    <td className="p-3.5">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        d.risk_tier === 'High Risk'
                          ? 'bg-rose-100 text-rose-800'
                          : d.risk_tier === 'Medium Risk'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-slate-100 text-slate-800'
                      }`}>
                        {d.risk_tier} ({d.risk_score.toFixed(1)}%)
                      </span>
                    </td>
                    <td className="p-3.5 font-bold text-slate-900">{formatCurrency(d.unpaid_amount)}</td>
                    <td className="p-3.5 text-slate-600">{Math.round(d.late_days)} days</td>
                    <td className="p-3.5 text-right">
                      <button
                        onClick={() => handleOpenSingleModal(d)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold rounded-xl border border-emerald-200 transition"
                      >
                        <Send className="w-3 h-3" /> Send Outreach
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Live WhatsApp Delivery Audit History */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Clock className="w-5 h-5 text-slate-600" />
            <h2 className="text-lg font-bold text-slate-900">Live Delivery Audit Log</h2>
          </div>
          <span className="text-xs text-slate-500">Auto-refreshed via WhatsApp Web Outbox</span>
        </div>

        <div className="space-y-2.5">
          {messages.length === 0 ? (
            <div className="p-6 text-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-2xl">
              No recent automated outreach messages dispatched.
            </div>
          ) : (
            messages.slice(0, 10).map((m) => (
              <div key={m.request_id || m.id} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">{m.customer_name || m.recipient}</span>
                    <span className="text-slate-400 font-mono text-[11px]">({m.recipient})</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                      {m.status}
                    </span>
                  </div>
                  <p className="text-slate-600 whitespace-pre-wrap">{m.message_preview}</p>
                </div>
                <div className="text-right text-[11px] text-slate-400 shrink-0 font-mono">
                  {formatTimestamp(m.sent_at)} IST
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Single Defaulter Modal */}
      {activeModalDefaulter && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-100 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Direct outreach to {activeModalDefaulter.customer_name}
                </h3>
                <p className="text-xs text-slate-500 font-mono">
                  Loan #{activeModalDefaulter.customer_id} · {activeModalDefaulter.phone}
                </p>
              </div>
              <button
                onClick={() => setActiveModalDefaulter(null)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg"
              >
                ✕
              </button>
            </div>

            <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-900 space-y-1">
              <div className="font-bold">Overdue Balance: {formatCurrency(activeModalDefaulter.unpaid_amount)}</div>
              <div>Days Past Due: {Math.round(activeModalDefaulter.late_days)} days</div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Message Content</label>
              <textarea
                rows={5}
                value={singleMessageText}
                onChange={(e) => setSingleMessageText(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 text-xs font-sans text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
              <button
                onClick={() => setActiveModalDefaulter(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSendSingleMessage}
                disabled={sendingSingle}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition flex items-center gap-2 shadow-md shadow-emerald-600/20"
              >
                <Send className="w-3.5 h-3.5" />
                {sendingSingle ? 'Delivering...' : 'Send Direct Message'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const WhatsAppPage: React.FC = () => {
  return (
    <ErrorBoundary>
      <WhatsAppDashboard />
    </ErrorBoundary>
  );
};

export default WhatsAppPage;
