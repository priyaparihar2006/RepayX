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
        <h1 className="text-xl sm:text-2xl font-bold text-[#171A17] tracking-tight font-heading">Payments & Ledger</h1>
        <p className="text-xs sm:text-sm text-[#777E77] mt-0.5">
          Verify inbound remittances, reconcile UTR bank references, and audit receipts.
        </p>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-[20px] p-5 border border-[#E7EBE3] shadow-fintech-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#777E77]">Payments Today</span>
            <div className="w-8 h-8 rounded-full bg-[#EDF5E5] text-[#245C35] flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold font-heading text-[#171A17] mt-2 tabular-nums">₹4.82L</p>
          <span className="text-[11px] text-[#245C35] font-semibold mt-1 block">+18.4% vs yesterday</span>
        </div>

        <div className="bg-white rounded-[20px] p-5 border border-[#E7EBE3] shadow-fintech-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#B45309]">Pending Verification</span>
            <div className="w-8 h-8 rounded-full bg-[#FEF7EA] text-[#D97706] flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold font-heading text-[#D97706] mt-2 tabular-nums">12</p>
          <span className="text-[11px] text-[#B45309] font-medium mt-1 block">Awaiting bank UTR match</span>
        </div>

        <div className="bg-white rounded-[20px] p-5 border border-[#E7EBE3] shadow-fintech-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#245C35]">Successful Remittances</span>
            <div className="w-8 h-8 rounded-full bg-[#EDF5E5] text-[#16A34A] flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold font-heading text-[#16A34A] mt-2 tabular-nums">86</p>
          <span className="text-[11px] text-[#16A34A] font-medium mt-1 block">Reconciled to CBS</span>
        </div>

        <div className="bg-white rounded-[20px] p-5 border border-[#E7EBE3] shadow-fintech-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-rose-700">Failed / Bounced</span>
            <div className="w-8 h-8 rounded-full bg-[#FDF2F4] text-rose-600 flex items-center justify-center">
              <XCircle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold font-heading text-rose-600 mt-2 tabular-nums">4</p>
          <span className="text-[11px] text-rose-600 font-medium mt-1 block">Insufficient balance NACH</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-[20px] p-4 border border-[#E7EBE3] shadow-fintech-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Status segmented buttons */}
        <div className="flex items-center gap-1 bg-[#F5F7F3] p-1 rounded-full border border-[#E7EBE3] text-xs font-semibold overflow-x-auto">
          {(['all', 'verified', 'pending', 'disputed', 'failed'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              className={`px-3.5 py-1.5 rounded-full capitalize transition-all cursor-pointer whitespace-nowrap ${
                statusFilter === tab
                  ? 'bg-[#245C35] text-white shadow-2xs font-bold'
                  : 'text-[#777E77] hover:text-[#171A17]'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative min-w-[240px]">
          <Search className="w-4 h-4 absolute left-3.5 top-2.5 text-[#777E77]" />
          <input
            type="text"
            placeholder="Search reference, customer, loan..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#F5F7F3] border border-[#E7EBE3] rounded-full pl-10 pr-4 py-2 text-xs text-[#171A17] placeholder-[#777E77] focus:outline-none focus:ring-2 focus:ring-[#245C35]/20 focus:border-[#245C35] transition-all"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-[20px] border border-[#E7EBE3] shadow-fintech-card overflow-hidden transition-all duration-200">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F5F7F3] text-[#777E77] uppercase tracking-wider text-[10px] font-semibold border-b border-[#E7EBE3]">
              <tr>
                <th className="py-3.5 px-4 font-semibold">Customer</th>
                <th className="py-3.5 px-4 font-semibold">Loan ID</th>
                <th className="py-3.5 px-4 font-semibold">Amount</th>
                <th className="py-3.5 px-4 font-semibold">Payment Date</th>
                <th className="py-3.5 px-4 font-semibold">Method</th>
                <th className="py-3.5 px-4 font-semibold">Reference (UTR)</th>
                <th className="py-3.5 px-4 font-semibold">Status</th>
                <th className="py-3.5 px-4 text-right font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E7EBE3] text-[#171A17]">
              {filtered.map((item) => (
                <tr key={item.id} className="hover:bg-[#EDF5E5]/40 transition-colors">
                  <td className="py-3.5 px-4">
                    <p className="font-bold text-[#171A17]">{item.customerName}</p>
                    <span className="text-[10px] text-[#777E77] font-mono">{item.customerId}</span>
                  </td>

                  <td className="py-3.5 px-4 font-mono font-semibold text-[#171A17]">
                    {item.loanId}
                  </td>

                  <td className="py-3.5 px-4 font-mono font-bold text-[#171A17] tabular-nums">
                    ₹{item.amount.toLocaleString('en-IN')}
                  </td>

                  <td className="py-3.5 px-4 font-mono text-[11px] text-[#777E77]">
                    {item.paymentDate}
                  </td>

                  <td className="py-3.5 px-4">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-[#F5F7F3] text-[#777E77] border border-[#E7EBE3]">
                      {item.method}
                    </span>
                  </td>

                  <td className="py-3.5 px-4 font-mono text-[11px] text-[#777E77]">
                    {item.referenceNumber}
                  </td>

                  <td className="py-3.5 px-4">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                        item.status === 'verified'
                          ? 'bg-[#EDF5E5] text-[#245C35] border-[#D1E8BC]'
                          : item.status === 'pending'
                          ? 'bg-[#FEF7EA] text-[#B45309] border-amber-200'
                          : item.status === 'disputed'
                          ? 'bg-purple-50 text-purple-700 border-purple-200'
                          : 'bg-[#FDF2F4] text-rose-700 border-rose-200'
                      }`}
                    >
                      {item.status.toUpperCase()}
                    </span>
                  </td>

                  <td className="py-3.5 px-4 text-right">
                    {item.status === 'pending' ? (
                      <button
                        onClick={() => setVerifyingPayment(item)}
                        className="px-3 py-1 rounded-full bg-[#245C35] hover:bg-[#1B4728] text-white font-semibold text-[11px] cursor-pointer inline-flex items-center gap-1 shadow-2xs"
                      >
                        <Check className="w-3 h-3 text-[#B5F078]" />
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
                        className="px-2.5 py-1 rounded-full text-[#777E77] hover:text-[#171A17] hover:bg-[#F5F7F3] font-medium text-[11px] cursor-pointer"
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
          <div className="p-4 rounded-2xl bg-[#F5F7F3] border border-[#E7EBE3] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[#777E77]">Customer:</span>
              <span className="font-bold text-[#171A17]">{verifyingPayment?.customerName}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#777E77]">Loan ID:</span>
              <span className="font-mono font-semibold text-[#171A17]">{verifyingPayment?.loanId}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#777E77]">Amount:</span>
              <span className="font-mono font-bold text-[#171A17] text-sm">
                ₹{verifyingPayment?.amount.toLocaleString('en-IN')}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#777E77]">UTR / Gateway Ref:</span>
              <span className="font-mono text-[#777E77]">{verifyingPayment?.referenceNumber}</span>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#EDF5E5] border border-[#D1E8BC] text-[#245C35] text-[11px]">
            ℹ️ System will query the payment gateway clearing log to verify ledger credit before updating loan balance.
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              onClick={() => setVerifyingPayment(null)}
              className="px-4 py-2 rounded-full text-[#777E77] hover:bg-[#F5F7F3] font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleVerifySubmit}
              className="px-4 py-2 rounded-full bg-[#245C35] hover:bg-[#1B4728] text-white font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-[#B5F078]" />
              <span>Confirm & Clear Payment</span>
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
