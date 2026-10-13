import React, { useState } from 'react';
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
} from 'lucide-react';
import { PaymentRecord } from '../../types';
import { INITIAL_PAYMENTS } from '../../data/mockData';
import { Modal } from '../common/Modal';
import { useToast } from '../common/Toast';

export const PaymentsPage: React.FC = () => {
  const { addToast } = useToast();
  const [payments, setPayments] = useState<PaymentRecord[]>(INITIAL_PAYMENTS);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [verifyingPayment, setVerifyingPayment] = useState<PaymentRecord | null>(null);

  const filtered = payments.filter((p) => {
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    const matchesSearch =
      p.customerName.toLowerCase().includes(search.toLowerCase()) ||
      p.loanId.toLowerCase().includes(search.toLowerCase()) ||
      p.referenceNumber.toLowerCase().includes(search.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const handleVerifySubmit = () => {
    if (!verifyingPayment) return;
    setPayments((prev) =>
      prev.map((p) => (p.id === verifyingPayment.id ? { ...p, status: 'verified' } : p))
    );
    addToast({
      type: 'success',
      title: 'Payment Verified & Cleared',
      message: `Ref ${verifyingPayment.referenceNumber} for ₹${verifyingPayment.amount.toLocaleString(
        'en-IN'
      )} matched with bank statement.`,
    });
    setVerifyingPayment(null);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Payments & Ledger</h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          Verify inbound remittances, reconcile UTR bank references, and audit receipts.
        </p>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Payments Today</span>
            <div className="w-7 h-7 rounded-lg bg-[#516072]/15 text-[#516072] flex items-center justify-center">
              <CreditCard className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-2xl font-bold font-mono text-slate-900 mt-2 tabular-nums">₹4.82L</p>
          <span className="text-[10px] text-slate-400 mt-0.5 block">+18.4% vs yesterday</span>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-amber-200/80 shadow-xs bg-amber-50/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-amber-800 font-semibold">Pending Verification</span>
            <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-2xl font-bold font-mono text-amber-700 mt-2 tabular-nums">12</p>
          <span className="text-[10px] text-amber-700 mt-0.5 block">Awaiting bank UTR match</span>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-emerald-200/80 shadow-xs bg-emerald-50/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-emerald-800 font-semibold">Successful Remittances</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-2xl font-bold font-mono text-emerald-700 mt-2 tabular-nums">86</p>
          <span className="text-[10px] text-emerald-700 mt-0.5 block">Reconciled to CBS</span>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-rose-200/80 shadow-xs bg-rose-50/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-rose-800 font-semibold">Failed / Bounced</span>
            <div className="w-7 h-7 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center">
              <XCircle className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-2xl font-bold font-mono text-rose-700 mt-2 tabular-nums">4</p>
          <span className="text-[10px] text-rose-700 mt-0.5 block">Insufficient balance NACH</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Status segmented buttons */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold overflow-x-auto">
          {(['all', 'verified', 'pending', 'disputed', 'failed'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              className={`px-3 py-1.5 rounded-lg capitalize transition-all cursor-pointer whitespace-nowrap ${
                statusFilter === tab
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative min-w-[240px]">
          <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search reference, customer, loan..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#516072]"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 text-slate-500 uppercase tracking-wider text-[10px] font-semibold border-b border-slate-100">
              <tr>
                <th className="py-3.5 px-4">Customer</th>
                <th className="py-3.5 px-4">Loan ID</th>
                <th className="py-3.5 px-4">Amount</th>
                <th className="py-3.5 px-4">Payment Date</th>
                <th className="py-3.5 px-4">Method</th>
                <th className="py-3.5 px-4">Reference (UTR)</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filtered.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3.5 px-4">
                    <p className="font-bold text-slate-900">{item.customerName}</p>
                    <span className="text-[10px] text-slate-400 font-mono">{item.customerId}</span>
                  </td>

                  <td className="py-3.5 px-4 font-mono font-semibold text-slate-800">
                    {item.loanId}
                  </td>

                  <td className="py-3.5 px-4 font-mono font-bold text-slate-900 tabular-nums">
                    ₹{item.amount.toLocaleString('en-IN')}
                  </td>

                  <td className="py-3.5 px-4 font-mono text-[11px] text-slate-600">
                    {item.paymentDate}
                  </td>

                  <td className="py-3.5 px-4">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 text-slate-700">
                      {item.method}
                    </span>
                  </td>

                  <td className="py-3.5 px-4 font-mono text-[11px] text-slate-600">
                    {item.referenceNumber}
                  </td>

                  <td className="py-3.5 px-4">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        item.status === 'verified'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : item.status === 'pending'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : item.status === 'disputed'
                          ? 'bg-purple-50 text-purple-700 border-purple-200'
                          : 'bg-rose-50 text-rose-700 border-rose-200'
                      }`}
                    >
                      {item.status.toUpperCase()}
                    </span>
                  </td>

                  <td className="py-3.5 px-4 text-right">
                    {item.status === 'pending' ? (
                      <button
                        onClick={() => setVerifyingPayment(item)}
                        className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-[11px] cursor-pointer inline-flex items-center gap-1 shadow-2xs"
                      >
                        <Check className="w-3 h-3" />
                        <span>Verify UTR</span>
                      </button>
                    ) : (
                      <button
                        onClick={() =>
                          addToast({
                            type: 'info',
                            title: 'Receipt Details',
                            message: `Payment record ${item.referenceNumber} verified on core banking ledger.`,
                          })
                        }
                        className="px-2 py-1 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 font-medium text-[11px] cursor-pointer"
                      >
                        Receipt
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Verify Payment Modal */}
      <Modal
        isOpen={!!verifyingPayment}
        onClose={() => setVerifyingPayment(null)}
        title="Verify Inbound Payment"
        subtitle={`Reference: ${verifyingPayment?.referenceNumber}`}
      >
        <div className="space-y-4 text-xs">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Customer:</span>
              <span className="font-bold text-slate-900">{verifyingPayment?.customerName}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Loan ID:</span>
              <span className="font-mono font-semibold text-slate-800">{verifyingPayment?.loanId}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Amount:</span>
              <span className="font-mono font-bold text-slate-900 text-sm">
                ₹{verifyingPayment?.amount.toLocaleString('en-IN')}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">UTR / Gateway Ref:</span>
              <span className="font-mono text-slate-700">{verifyingPayment?.referenceNumber}</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-[11px]">
            ℹ️ System will query the payment gateway clearing log to verify ledger credit before updating loan balance.
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              onClick={() => setVerifyingPayment(null)}
              className="px-3.5 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold"
            >
              Cancel
            </button>
            <button
              onClick={handleVerifySubmit}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Confirm & Clear Payment</span>
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
