import React, { useState } from 'react';
import { CreditCard, Search, Filter, Eye, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Loan, Customer } from '../../types';

interface LoansPageProps {
  loans: Loan[];
  customers: Customer[];
  onSelectCustomer: (customerId: string) => void;
  onOpenConversation: (loanId: string) => void;
}

export const LoansPage: React.FC<LoansPageProps> = ({
  loans,
  customers,
  onSelectCustomer,
  onOpenConversation,
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  const filtered = loans.filter((loan) => {
    const matchesSearch =
      loan.id.toLowerCase().includes(search.toLowerCase()) ||
      loan.customerName.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || loan.status === statusFilter;
    const matchesType = typeFilter === 'all' || loan.loanType === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight font-heading">
          Active Loan Portfolio
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          Comprehensive ledger of loan accounts, interest terms, delinquency states, and follow-up schedules.
        </p>
      </div>

      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="relative min-w-[240px] flex-1 max-w-md">
          <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search by loan ID, customer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#516072]"
          />
        </div>

        <div className="flex items-center gap-2 text-xs">
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

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 font-medium cursor-pointer"
          >
            <option value="all">All Loan Types</option>
            <option value="Personal Loan">Personal Loan</option>
            <option value="Business Loan">Business Loan</option>
            <option value="Consumer Durable">Consumer Durable</option>
            <option value="Auto Loan">Auto Loan</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 text-slate-500 uppercase tracking-wider text-[10px] font-semibold border-b border-slate-100">
              <tr>
                <th className="py-3.5 px-4">Loan ID</th>
                <th className="py-3.5 px-4">Borrower</th>
                <th className="py-3.5 px-4">Loan Type</th>
                <th className="py-3.5 px-4">Principal</th>
                <th className="py-3.5 px-4">EMI</th>
                <th className="py-3.5 px-4">Outstanding</th>
                <th className="py-3.5 px-4">Due Date</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Next Follow-up</th>
                <th className="py-3.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filtered.map((loan) => (
                <tr key={loan.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                    {loan.id}
                  </td>

                  <td className="py-3.5 px-4">
                    <button
                      onClick={() => onSelectCustomer(loan.customerId)}
                      className="font-bold text-slate-900 hover:text-[#516072] transition-colors text-left cursor-pointer"
                    >
                      {loan.customerName}
                    </button>
                    <p className="text-[10px] text-slate-400 font-mono">{loan.customerId}</p>
                  </td>

                  <td className="py-3.5 px-4">
                    <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700">
                      {loan.loanType}
                    </span>
                  </td>

                  <td className="py-3.5 px-4 font-mono tabular-nums text-slate-800">
                    ₹{loan.principal.toLocaleString('en-IN')}
                  </td>

                  <td className="py-3.5 px-4 font-mono tabular-nums text-slate-800">
                    ₹{loan.emi.toLocaleString('en-IN')}
                  </td>

                  <td className="py-3.5 px-4 font-mono font-bold text-slate-900 tabular-nums">
                    ₹{loan.outstanding.toLocaleString('en-IN')}
                  </td>

                  <td className="py-3.5 px-4 font-mono text-[11px] text-slate-600">
                    {loan.dueDate}
                    {loan.daysOverdue > 0 && (
                      <span className="block text-[10px] font-bold text-rose-600">
                        {loan.daysOverdue} days overdue
                      </span>
                    )}
                  </td>

                  <td className="py-3.5 px-4">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border ${
                        loan.status === 'overdue'
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : loan.status === 'promise_to_pay'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : loan.status === 'paid'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : loan.status === 'disputed'
                          ? 'bg-purple-50 text-purple-700 border-purple-200'
                          : 'bg-slate-50 text-slate-700 border-slate-200'
                      }`}
                    >
                      {loan.status.replace('_', ' ').toUpperCase()}
                    </span>
                  </td>

                  <td className="py-3.5 px-4 font-mono text-[11px] text-slate-600">
                    {loan.nextFollowupDate}
                  </td>

                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => onOpenConversation(loan.id)}
                        className="px-2.5 py-1 rounded-lg bg-[#516072] hover:bg-[#43505F] text-white transition-all font-semibold text-[11px] cursor-pointer inline-flex items-center gap-1 shadow-xs"
                      >
                        <span>Message</span>
                      </button>
                      <button
                        onClick={() => onSelectCustomer(loan.customerId)}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all font-semibold text-[11px] cursor-pointer inline-flex items-center gap-1"
                      >
                        <Eye className="w-3 h-3" />
                        <span>Review</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
