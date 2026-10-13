import React, { useState } from 'react';
import {
  Search,
  Filter,
  Users,
  ChevronRight,
  Eye,
  Phone,
  Calendar,
  AlertTriangle,
  ArrowUpDown,
  Building,
  MessageSquare,
  Plus,
} from 'lucide-react';
import { Customer, Loan } from '../../types';
import { SendMessageModal } from '../common/SendMessageModal';

interface CustomersPageProps {
  customers: Customer[];
  loans: Loan[];
  onSelectCustomer: (customerId: string) => void;
  onOpenConversation: (conversationId?: string) => void;
  onDirectSendMessage?: (data: any) => void;
}

export const CustomersPage: React.FC<CustomersPageProps> = ({
  customers,
  loans,
  onSelectCustomer,
  onOpenConversation,
  onDirectSendMessage,
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [riskFilter, setRiskFilter] = useState<string>('all');
  const [managerFilter, setManagerFilter] = useState<string>('all');

  // Send message modal
  const [isSendMessageOpen, setIsSendMessageOpen] = useState(false);
  const [selectedCustomerIdForMsg, setSelectedCustomerIdForMsg] = useState<string | null>(null);

  // Map loans to customer
  const enrichedCustomers = customers.map((c) => {
    const loan = loans.find((l) => l.customerId === c.id);
    return {
      ...c,
      loan,
    };
  });

  const filtered = enrichedCustomers.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.id.toLowerCase().includes(search.toLowerCase()) ||
      item.phone.includes(search) ||
      (item.loan && item.loan.id.toLowerCase().includes(search.toLowerCase()));

    const matchesStatus =
      statusFilter === 'all' || (item.loan && item.loan.status === statusFilter);

    const matchesRisk = riskFilter === 'all' || item.riskCategory === riskFilter;

    const matchesManager =
      managerFilter === 'all' || (item.loan && item.loan.assignedManager === managerFilter);

    return matchesSearch && matchesStatus && matchesRisk && matchesManager;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight font-heading">
            Borrowers Directory & Ledger
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Monitor repayment activity, outstanding balances, and send instant WhatsApp/SMS follow-ups.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setSelectedCustomerIdForMsg(null);
              setIsSendMessageOpen(true);
            }}
            className="px-4 py-2 bg-[#516072] hover:bg-[#43505F] text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Send New Message</span>
          </button>
        </div>
      </div>

      {/* Top Filter Controls */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-3">
        {/* Search */}
        <div className="relative min-w-[240px] flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search borrower by name, ID, phone, loan..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#516072]"
          />
        </div>

        {/* Filter Dropdowns */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 font-medium cursor-pointer"
          >
            <option value="all">All Loan Statuses</option>
            <option value="overdue">Overdue</option>
            <option value="due">Due Today</option>
            <option value="promise_to_pay">Promise to Pay</option>
            <option value="disputed">Disputed</option>
            <option value="paid">Paid</option>
          </select>

          {/* Risk Filter */}
          <select
            value={riskFilter}
            onChange={(e) => setRiskFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 font-medium cursor-pointer"
          >
            <option value="all">All Risk Tiers</option>
            <option value="High">High Risk</option>
            <option value="Medium">Medium Risk</option>
            <option value="Low">Low Risk</option>
          </select>
        </div>
      </div>

      {/* Customer Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 text-slate-500 uppercase tracking-wider text-[10px] font-semibold border-b border-slate-100">
              <tr>
                <th className="py-3.5 px-4">Borrower</th>
                <th className="py-3.5 px-4">Loan ID</th>
                <th className="py-3.5 px-4">Loan Amount</th>
                <th className="py-3.5 px-4">Outstanding</th>
                <th className="py-3.5 px-4">Due Date</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Last Contact</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filtered.map((item) => (
                <tr
                  key={item.id}
                  className="hover:bg-slate-50/80 transition-colors group"
                >
                  <td
                    className="py-3.5 px-4 cursor-pointer"
                    onClick={() => onSelectCustomer(item.id)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#516072]/15 flex items-center justify-center font-bold text-xs text-[#516072] overflow-hidden shrink-0">
                        {item.avatar ? (
                          <img
                            src={item.avatar}
                            alt={item.name}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          item.name.charAt(0)
                        )}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 group-hover:text-[#516072] transition-colors">
                          {item.name}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {item.id} · {item.phone}
                        </p>
                      </div>
                    </div>
                  </td>

                  <td className="py-3.5 px-4 font-semibold text-slate-800">
                    {item.loan ? item.loan.id : 'N/A'}
                  </td>

                  <td className="py-3.5 px-4 tabular-nums text-slate-700 font-medium">
                    {item.loan ? `₹${item.loan.principal.toLocaleString('en-IN')}` : '-'}
                  </td>

                  <td className="py-3.5 px-4 tabular-nums font-bold text-slate-900">
                    {item.loan ? `₹${item.loan.outstanding.toLocaleString('en-IN')}` : '-'}
                  </td>

                  <td className="py-3.5 px-4 text-[11px] text-slate-600">
                    {item.loan ? item.loan.dueDate : '-'}
                    {item.loan && item.loan.daysOverdue > 0 && (
                      <span className="block text-[10px] font-bold text-rose-600">
                        +{item.loan.daysOverdue} DPD
                      </span>
                    )}
                  </td>

                  <td className="py-3.5 px-4">
                    {item.loan ? (
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border ${
                          item.loan.status === 'overdue'
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : item.loan.status === 'promise_to_pay'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : item.loan.status === 'paid'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : item.loan.status === 'disputed'
                            ? 'bg-purple-50 text-purple-700 border-purple-200'
                            : 'bg-blue-50 text-blue-700 border-blue-200'
                        }`}
                      >
                        {item.loan.status.replace('_', ' ').toUpperCase()}
                      </span>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>

                  <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                    {item.loan?.lastFollowupDate || '26 Sep 2026'}
                  </td>

                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => {
                          setSelectedCustomerIdForMsg(item.id);
                          setIsSendMessageOpen(true);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-[#516072] hover:bg-[#43505F] text-white font-semibold text-[11px] inline-flex items-center gap-1 cursor-pointer shadow-xs transition-colors"
                        title="Send message to this customer"
                      >
                        <MessageSquare className="w-3 h-3" />
                        <span>Message</span>
                      </button>

                      <button
                        onClick={() => onSelectCustomer(item.id)}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px] inline-flex items-center gap-1 cursor-pointer transition-colors"
                        title="View profile and ledger"
                      >
                        <Eye className="w-3 h-3" />
                        <span>Profile</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Outbound Send Message Modal */}
      <SendMessageModal
        isOpen={isSendMessageOpen}
        onClose={() => {
          setIsSendMessageOpen(false);
          setSelectedCustomerIdForMsg(null);
        }}
        customers={customers}
        loans={loans}
        preselectedCustomerId={selectedCustomerIdForMsg}
        onSendMessageSuccess={(data) => {
          if (onDirectSendMessage) {
            onDirectSendMessage(data);
          } else {
            onOpenConversation();
          }
        }}
      />
    </div>
  );
};
