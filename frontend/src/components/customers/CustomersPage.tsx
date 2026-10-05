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
} from 'lucide-react';
import { Customer, Loan } from '../../types';

interface CustomersPageProps {
  customers: Customer[];
  loans: Loan[];
  onSelectCustomer: (customerId: string) => void;
  onOpenConversation: (conversationId?: string) => void;
}

export const CustomersPage: React.FC<CustomersPageProps> = ({
  customers,
  loans,
  onSelectCustomer,
  onOpenConversation,
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [riskFilter, setRiskFilter] = useState<string>('all');
  const [managerFilter, setManagerFilter] = useState<string>('all');

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
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Customers</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Manage customer profiles and monitor their repayment activity.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-mono">
            Showing <strong>{filtered.length}</strong> of {customers.length} customers
          </span>
        </div>
      </div>

      {/* Top Filter Controls */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-3">
        {/* Search */}
        <div className="relative min-w-[240px] flex-1 max-w-md">
          <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search by customer name, ID, phone, loan..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
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

          {/* Manager Filter */}
          <select
            value={managerFilter}
            onChange={(e) => setManagerFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 font-medium cursor-pointer"
          >
            <option value="all">All Managers</option>
            <option value="Priya Parihar">Priya Parihar (You)</option>
          </select>
        </div>
      </div>

      {/* Customer Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 text-slate-500 uppercase tracking-wider text-[10px] font-semibold border-b border-slate-100">
              <tr>
                <th className="py-3.5 px-4">Customer</th>
                <th className="py-3.5 px-4">Loan ID</th>
                <th className="py-3.5 px-4">Loan Amount</th>
                <th className="py-3.5 px-4">Outstanding</th>
                <th className="py-3.5 px-4">Due Date</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Last Contact</th>
                <th className="py-3.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filtered.map((item) => (
                <tr
                  key={item.id}
                  onClick={() => onSelectCustomer(item.id)}
                  className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                >
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center font-bold text-xs text-slate-700 overflow-hidden shrink-0">
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
                        <p className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                          {item.name}
                        </p>
                        <p className="text-[10px] text-slate-400 font-mono">
                          {item.id} · {item.city}
                        </p>
                      </div>
                    </div>
                  </td>

                  <td className="py-3.5 px-4 font-mono font-semibold text-slate-800">
                    {item.loan ? item.loan.id : 'N/A'}
                  </td>

                  <td className="py-3.5 px-4 font-mono tabular-nums text-slate-700 font-medium">
                    {item.loan ? `₹${item.loan.principal.toLocaleString('en-IN')}` : '-'}
                  </td>

                  <td className="py-3.5 px-4 font-mono tabular-nums font-bold text-slate-900">
                    {item.loan ? `₹${item.loan.outstanding.toLocaleString('en-IN')}` : '-'}
                  </td>

                  <td className="py-3.5 px-4 font-mono text-[11px] text-slate-600">
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

                  <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px]">
                    {item.loan?.lastFollowupDate || '26 Sep 2026'}
                  </td>

                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectCustomer(item.id);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-700 transition-all font-semibold text-[11px] inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Eye className="w-3 h-3" />
                      <span>Details</span>
                    </button>
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
