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
        <h1 className="text-xl sm:text-2xl font-bold text-[#171A17] tracking-tight font-heading">
          Active Loan Portfolio
        </h1>
        <p className="text-xs sm:text-sm text-[#777E77] mt-0.5">
          Comprehensive ledger of loan accounts, interest terms, delinquency states, and follow-up schedules.
        </p>
      </div>

      <div className="bg-white rounded-[20px] p-4 border border-[#E7EBE3] shadow-fintech-card flex flex-wrap items-center justify-between gap-3">
        <div className="relative min-w-[240px] flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-2.5 text-[#777E77]" />
          <input
            type="text"
            placeholder="Search by loan ID, customer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#F5F7F3] border border-[#E7EBE3] rounded-full pl-10 pr-4 py-2 text-xs text-[#171A17] placeholder-[#777E77] focus:outline-none focus:ring-2 focus:ring-[#245C35]/20 focus:border-[#245C35] transition-all"
          />
        </div>

        <div className="flex items-center gap-2 text-xs">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-[#F5F7F3] border border-[#E7EBE3] rounded-full px-3.5 py-2 text-xs text-[#171A17] font-medium cursor-pointer focus:outline-none focus:border-[#245C35]"
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
            className="bg-[#F5F7F3] border border-[#E7EBE3] rounded-full px-3.5 py-2 text-xs text-[#171A17] font-medium cursor-pointer focus:outline-none focus:border-[#245C35]"
          >
            <option value="all">All Loan Types</option>
            <option value="Personal Loan">Personal Loan</option>
            <option value="Business Loan">Business Loan</option>
            <option value="Consumer Durable">Consumer Durable</option>
            <option value="Auto Loan">Auto Loan</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-[20px] border border-[#E7EBE3] shadow-fintech-card overflow-hidden transition-all duration-200">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F5F7F3] text-[#777E77] uppercase tracking-wider text-[10px] font-semibold border-b border-[#E7EBE3]">
              <tr>
                <th className="py-3.5 px-4 font-semibold">Loan ID</th>
                <th className="py-3.5 px-4 font-semibold">Borrower</th>
                <th className="py-3.5 px-4 font-semibold">Loan Type</th>
                <th className="py-3.5 px-4 font-semibold">Principal</th>
                <th className="py-3.5 px-4 font-semibold">EMI</th>
                <th className="py-3.5 px-4 font-semibold">Outstanding</th>
                <th className="py-3.5 px-4 font-semibold">Due Date</th>
                <th className="py-3.5 px-4 font-semibold">Status</th>
                <th className="py-3.5 px-4 font-semibold">Next Follow-up</th>
                <th className="py-3.5 px-4 text-right font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E7EBE3] text-[#171A17]">
              {filtered.map((loan) => (
                <tr key={loan.id} className="hover:bg-[#EDF5E5]/40 transition-colors">
                  <td className="py-3.5 px-4 font-mono font-bold text-[#171A17]">
                    {loan.id}
                  </td>

                  <td className="py-3.5 px-4">
                    <button
                      onClick={() => onSelectCustomer(loan.customerId)}
                      className="font-bold text-[#171A17] hover:text-[#245C35] transition-colors text-left cursor-pointer"
                    >
                      {loan.customerName}
                    </button>
                    <p className="text-[10px] text-[#777E77] font-mono">{loan.customerId}</p>
                  </td>

                  <td className="py-3.5 px-4">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-[#F5F7F3] text-[#777E77] border border-[#E7EBE3]">
                      {loan.loanType}
                    </span>
                  </td>

                  <td className="py-3.5 px-4 font-mono tabular-nums text-[#171A17]">
                    ₹{loan.principal.toLocaleString('en-IN')}
                  </td>

                  <td className="py-3.5 px-4 font-mono tabular-nums text-[#171A17]">
                    ₹{loan.emi.toLocaleString('en-IN')}
                  </td>

                  <td className="py-3.5 px-4 font-mono font-bold text-[#171A17] tabular-nums">
                    ₹{loan.outstanding.toLocaleString('en-IN')}
                  </td>

                  <td className="py-3.5 px-4 font-mono text-[11px] text-[#777E77]">
                    {loan.dueDate}
                    {loan.daysOverdue > 0 && (
                      <span className="block text-[10px] font-bold text-rose-600">
                        {loan.daysOverdue} days overdue
                      </span>
                    )}
                  </td>

                  <td className="py-3.5 px-4">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                        loan.status === 'overdue'
                          ? 'bg-[#FDF2F4] text-rose-700 border-rose-200'
                          : loan.status === 'promise_to_pay'
                          ? 'bg-[#FEF7EA] text-[#B45309] border-amber-200'
                          : loan.status === 'paid'
                          ? 'bg-[#EDF5E5] text-[#245C35] border-[#D1E8BC]'
                          : loan.status === 'disputed'
                          ? 'bg-purple-50 text-purple-700 border-purple-200'
                          : 'bg-[#F5F7F3] text-[#777E77] border-[#E7EBE3]'
                      }`}
                    >
                      {loan.status.replace('_', ' ').toUpperCase()}
                    </span>
                  </td>

                  <td className="py-3.5 px-4 font-mono text-[11px] text-[#777E77]">
                    {loan.nextFollowupDate}
                  </td>

                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => onOpenConversation(loan.id)}
                        className="px-3 py-1 rounded-full bg-[#245C35] hover:bg-[#1B4728] text-white transition-all font-semibold text-[11px] cursor-pointer inline-flex items-center gap-1 shadow-2xs"
                      >
                        <span>Message</span>
                      </button>
                      <button
                        onClick={() => onSelectCustomer(loan.customerId)}
                        className="px-3 py-1 rounded-full bg-[#EDF5E5] hover:bg-[#D1E8BC] text-[#245C35] transition-all font-semibold text-[11px] cursor-pointer inline-flex items-center gap-1"
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
