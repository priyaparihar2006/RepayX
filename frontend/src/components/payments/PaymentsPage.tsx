import React, { useEffect, useState } from 'react';
import {
  CreditCard,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  Search,
  Check,
  Building2,
  Eye,
  RefreshCw,
  QrCode,
  Zap,
  ExternalLink,
  Copy,
  Plus,
  ShieldCheck,
  ArrowUpRight,
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { useToast } from '../common/Toast';
import { DynamicUpiModal } from '../features/DynamicUpiModal';
import { paymentsApi, PaymentSummary, RazorpayPaymentItem } from '../../services/payments';

export const PaymentsPage: React.FC = () => {
  const { addToast } = useToast();

  const [summary, setSummary] = useState<PaymentSummary | null>(null);
  const [payments, setPayments] = useState<RazorpayPaymentItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [upiModalOpen, setUpiModalOpen] = useState(false);
  const [createLinkModalOpen, setCreateLinkModalOpen] = useState(false);
  const [creatingLink, setCreatingLink] = useState(false);

  // New link form fields
  const [formCustName, setFormCustName] = useState('Nancy');
  const [formCustId, setFormCustId] = useState('385057');
  const [formLoanId, setFormLoanId] = useState('LN_385057');
  const [formAmount, setFormAmount] = useState('63502.51');
  const [formPhone, setFormPhone] = useState('+917060200849');
  const [formEmail, setFormEmail] = useState('nancysharmandmitteami@gmail.com');

  const loadData = async () => {
    setLoading(true);
    try {
      const [sumData, txData] = await Promise.all([
        paymentsApi.getSummary().catch(() => null),
        paymentsApi.getTransactions(statusFilter, search).catch(() => []),
      ]);
      if (sumData) setSummary(sumData);
      setPayments(txData);
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Failed to load payments',
        message: err.message || 'Error communicating with backend',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void loadData();
  };

  const handleCopyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    addToast({
      type: 'success',
      title: 'Link Copied',
      message: 'Razorpay short URL copied to clipboard.',
    });
  };

  const handleCreateLinkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(formAmount);
    if (!amt || amt <= 0) {
      addToast({ type: 'error', title: 'Invalid amount', message: 'Please enter a valid amount in ₹' });
      return;
    }
    setCreatingLink(true);
    try {
      const result = await paymentsApi.createPaymentLink({
        customer_id: formCustId,
        customer_name: formCustName,
        loan_id: formLoanId,
        amount: amt,
        phone: formPhone,
        email: formEmail,
      });
      addToast({
        type: 'success',
        title: 'Payment Link Created',
        message: `Generated Razorpay link: ${result.short_url}`,
      });
      setCreateLinkModalOpen(false);
      void loadData();
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Link Generation Failed',
        message: err.message || 'Could not connect to Razorpay',
      });
    } finally {
      setCreatingLink(false);
    }
  };

  const handleTestSettle = async (item: RazorpayPaymentItem) => {
    try {
      await paymentsApi.simulateWebhook(item.loan_id, item.amount, item.customer_id, false);
      addToast({
        type: 'success',
        title: 'Payment Confirmed',
        message: `Webhook simulated successfully: ${item.loan_id} marked as PAID.`,
      });
      void loadData();
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Simulation failed',
        message: err.message,
      });
    }
  };

  const filtered = payments.filter((p) => {
    const s = search.toLowerCase();
    const matchesSearch =
      !s ||
      (p.customer_name && p.customer_name.toLowerCase().includes(s)) ||
      (p.loan_id && p.loan_id.toLowerCase().includes(s)) ||
      (p.payment_link_id && p.payment_link_id.toLowerCase().includes(s)) ||
      (p.customer_id && p.customer_id.toLowerCase().includes(s));
    return matchesSearch;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-[#171A17] tracking-tight font-heading">
              Razorpay Payments & Settlement Ledger
            </h1>
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                summary?.gateway_mode === 'live'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                  : 'bg-amber-50 text-amber-800 border-amber-300'
              }`}
            >
              <ShieldCheck className="w-3 h-3" />
              {summary?.gateway_mode === 'live' ? 'Razorpay Live Mode' : 'Razorpay Test Mode'}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[#777E77] mt-0.5">
            Real-time webhook reconciliation, dynamic payment link issuance, and automated ledger settlement.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => void loadData()}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-[#E7EBE3] hover:bg-[#F5F7F3] text-xs font-semibold text-[#171A17] shadow-2xs transition-colors cursor-pointer"
            title="Refresh payment records"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={() => setCreateLinkModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#245C35] hover:bg-[#1E4D2C] text-white text-xs font-bold shadow-sm transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4 text-[#B5F078]" />
            New Razorpay Link
          </button>
          <button
            onClick={() => setUpiModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-sm transition-colors cursor-pointer"
          >
            <QrCode className="w-4 h-4 text-[#B5F078]" />
            Dynamic UPI QR
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-[20px] p-5 border border-[#E7EBE3] shadow-fintech-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#777E77]">Total Collected</span>
            <div className="w-8 h-8 rounded-full bg-[#EDF5E5] text-[#245C35] flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold font-heading text-[#171A17] mt-2 tabular-nums">
            ₹{summary?.total_collected?.toLocaleString('en-IN') || '0'}
          </p>
          <span className="text-[11px] text-[#245C35] font-semibold mt-1 block">
            {summary?.successful_payments || 0} cleared payments
          </span>
        </div>

        <div className="bg-white rounded-[20px] p-5 border border-[#E7EBE3] shadow-fintech-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#B45309]">Pending Links</span>
            <div className="w-8 h-8 rounded-full bg-[#FEF7EA] text-[#D97706] flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold font-heading text-[#D97706] mt-2 tabular-nums">
            {summary?.pending_payments || 0}
          </p>
          <span className="text-[11px] text-[#B45309] font-medium mt-1 block">
            Awaiting customer payment
          </span>
        </div>

        <div className="bg-white rounded-[20px] p-5 border border-[#E7EBE3] shadow-fintech-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#245C35]">Successful Settlements</span>
            <div className="w-8 h-8 rounded-full bg-[#EDF5E5] text-[#16A34A] flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold font-heading text-[#16A34A] mt-2 tabular-nums">
            {summary?.successful_payments || 0}
          </p>
          <span className="text-[11px] text-[#16A34A] font-medium mt-1 block">
            Webhook verified & reconciled
          </span>
        </div>

        <div className="bg-white rounded-[20px] p-5 border border-[#E7EBE3] shadow-fintech-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700">Outstanding Portfolio</span>
            <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold font-heading text-[#171A17] mt-2 tabular-nums">
            ₹{summary?.outstanding_balance?.toLocaleString('en-IN') || '0'}
          </p>
          <span className="text-[11px] text-slate-500 font-medium mt-1 block">
            Active overdue recovery
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-[20px] p-4 border border-[#E7EBE3] shadow-fintech-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Status segmented buttons */}
        <div className="flex items-center gap-1 bg-[#F5F7F3] p-1 rounded-full border border-[#E7EBE3] text-xs font-semibold overflow-x-auto">
          {(['all', 'paid', 'pending', 'partially_paid', 'failed'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              className={`px-3.5 py-1.5 rounded-full capitalize transition-all cursor-pointer whitespace-nowrap ${
                statusFilter === tab
                  ? 'bg-[#245C35] text-white shadow-2xs font-bold'
                  : 'text-[#777E77] hover:text-[#171A17]'
              }`}
            >
              {tab.replace('_', ' ')}
            </button>
          ))}
        </div>

        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="relative min-w-[280px]">
          <Search className="w-4 h-4 absolute left-3.5 top-2.5 text-[#777E77]" />
          <input
            type="text"
            placeholder="Search customer, loan ID, reference..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#F5F7F3] border border-[#E7EBE3] rounded-full pl-10 pr-4 py-2 text-xs text-[#171A17] placeholder-[#777E77] focus:outline-none focus:ring-2 focus:ring-[#245C35]/20 focus:border-[#245C35] transition-all"
          />
        </form>
      </div>

      {/* Table */}
      <div className="bg-white rounded-[20px] border border-[#E7EBE3] shadow-fintech-card overflow-hidden transition-all duration-200">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F5F7F3] text-[#777E77] uppercase tracking-wider text-[10px] font-semibold border-b border-[#E7EBE3]">
              <tr>
                <th className="py-3.5 px-4 font-semibold">Customer Name</th>
                <th className="py-3.5 px-4 font-semibold">Loan ID</th>
                <th className="py-3.5 px-4 font-semibold">Payment Amount</th>
                <th className="py-3.5 px-4 font-semibold">Transaction Date</th>
                <th className="py-3.5 px-4 font-semibold">Razorpay Payment / Link ID</th>
                <th className="py-3.5 px-4 font-semibold">Status</th>
                <th className="py-3.5 px-4 text-right font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E7EBE3] text-[#171A17]">
              {loading && filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-[#777E77]">
                    Loading Razorpay payments...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-[#777E77]">
                    No payment records match the current filter.
                  </td>
                </tr>
              ) : (
                filtered.map((item) => (
                  <tr key={item.id} className="hover:bg-[#EDF5E5]/40 transition-colors">
                    <td className="py-3.5 px-4">
                      <p className="font-bold text-[#171A17]">{item.customer_name || 'Valued Customer'}</p>
                      <span className="text-[10px] text-[#777E77] font-mono">{item.customer_id}</span>
                    </td>

                    <td className="py-3.5 px-4 font-mono font-semibold text-[#171A17]">
                      {item.loan_id}
                    </td>

                    <td className="py-3.5 px-4 font-mono font-bold text-[#171A17] tabular-nums">
                      ₹{item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>

                    <td className="py-3.5 px-4 font-mono text-[11px] text-[#777E77]">
                      {item.created_at ? item.created_at.replace('T', ' ').slice(0, 19) : '—'}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-[11px] text-[#777E77]">
                          {item.gateway_payment_id || item.payment_link_id}
                        </span>
                        {item.short_url && (
                          <button
                            onClick={() => handleCopyLink(item.short_url)}
                            className="p-1 hover:bg-[#EDF5E5] text-[#245C35] rounded transition-colors"
                            title="Copy Payment URL"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                          item.status === 'paid'
                            ? 'bg-[#EDF5E5] text-[#245C35] border-[#D1E8BC]'
                            : item.status === 'partially_paid'
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : item.status === 'pending' || item.status === 'created'
                            ? 'bg-[#FEF7EA] text-[#B45309] border-amber-200'
                            : 'bg-[#FDF2F4] text-rose-700 border-rose-200'
                        }`}
                      >
                        {item.status.toUpperCase()}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {item.short_url && (
                          <a
                            href={item.short_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2.5 py-1 rounded-full text-[#245C35] hover:bg-[#EDF5E5] font-semibold text-[11px] inline-flex items-center gap-1 border border-[#D1E8BC]"
                          >
                            <span>Pay Link</span>
                            <ArrowUpRight className="w-3 h-3" />
                          </a>
                        )}

                        {item.status !== 'paid' && (
                          <button
                            onClick={() => handleTestSettle(item)}
                            className="px-2.5 py-1 rounded-full bg-[#245C35] hover:bg-[#1E4D2C] text-white font-semibold text-[11px] inline-flex items-center gap-1 shadow-2xs cursor-pointer"
                            title="Simulate Webhook Payment Confirmation"
                          >
                            <Check className="w-3 h-3 text-[#B5F078]" />
                            <span>Confirm</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Dynamic Payment Link Modal */}
      <Modal
        isOpen={createLinkModalOpen}
        onClose={() => setCreateLinkModalOpen(false)}
        title="Generate Dynamic Razorpay Payment Link"
        subtitle="Generates an official Razorpay short link for real-time customer settlement"
      >
        <form onSubmit={handleCreateLinkSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Customer Name</label>
              <input
                type="text"
                value={formCustName}
                onChange={(e) => setFormCustName(e.target.value)}
                required
                className="w-full bg-[#F5F7F3] border border-[#E7EBE3] rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-[#245C35]"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Customer ID</label>
              <input
                type="text"
                value={formCustId}
                onChange={(e) => setFormCustId(e.target.value)}
                required
                className="w-full bg-[#F5F7F3] border border-[#E7EBE3] rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-[#245C35]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Loan Account ID</label>
              <input
                type="text"
                value={formLoanId}
                onChange={(e) => setFormLoanId(e.target.value)}
                required
                className="w-full bg-[#F5F7F3] border border-[#E7EBE3] rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-[#245C35]"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Outstanding Amount (₹)</label>
              <input
                type="number"
                step="0.01"
                value={formAmount}
                onChange={(e) => setFormAmount(e.target.value)}
                required
                className="w-full bg-[#F5F7F3] border border-[#E7EBE3] rounded-xl px-3 py-2 text-xs text-slate-800 font-bold focus:outline-none focus:border-[#245C35]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Customer Phone</label>
              <input
                type="text"
                value={formPhone}
                onChange={(e) => setFormPhone(e.target.value)}
                className="w-full bg-[#F5F7F3] border border-[#E7EBE3] rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-[#245C35]"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Customer Email</label>
              <input
                type="email"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                className="w-full bg-[#F5F7F3] border border-[#E7EBE3] rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-[#245C35]"
              />
            </div>
          </div>

          <div className="p-3 rounded-xl bg-[#EDF5E5] border border-[#D1E8BC] text-[#245C35] text-[11px]">
            ⚡ The backend connects to <code>POST https://api.razorpay.com/v1/payment_links</code>, converts INR to paise, enables partial payments, and stores the resulting short link.
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setCreateLinkModalOpen(false)}
              className="px-4 py-2 rounded-xl text-slate-600 hover:bg-[#F5F7F3] font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creatingLink}
              className="px-5 py-2 rounded-xl bg-[#245C35] hover:bg-[#1E4D2C] text-white font-bold flex items-center gap-1.5 shadow-sm disabled:opacity-50"
            >
              {creatingLink ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Connecting to Razorpay...</span>
                </>
              ) : (
                <>
                  <Zap className="w-3.5 h-3.5 text-[#B5F078]" />
                  <span>Generate Link</span>
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* Dynamic UPI Modal */}
      <DynamicUpiModal isOpen={upiModalOpen} onClose={() => setUpiModalOpen(false)} />
    </div>
  );
};
