import React from 'react';
import { Link, useNavigate } from 'react-router';
import { Eye } from 'lucide-react';
import { useCustomers } from '../../hooks/useCustomers';
import type { CustomerSortField, SortOrder } from '../../types/api';
import { RiskBadge } from '../common/RiskBadge';
import { ErrorState, LoadingState } from '../common/RequestState';
import { formatAmount, formatPercent, formatScore } from '../../lib/format';

/** Compact customer table with the spec's columns for one sort order, linking to the full table and profiles. */
export const TopCustomersTable: React.FC<{
  title: string;
  subtitle: string;
  sortBy: CustomerSortField;
  sortOrder?: SortOrder;
  limit?: number;
}> = ({ title, subtitle, sortBy, sortOrder = 'desc', limit = 10 }) => {
  const navigate = useNavigate();
  const result = useCustomers({ page: 1, page_size: limit, sort_by: sortBy, sort_order: sortOrder });
  const open = (id: number) => navigate(`/customers/${id}`);
  return (
    <section className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
      <header className="flex items-start justify-between gap-3 p-5 pb-3">
        <div>
          <h2 className="text-sm font-bold text-slate-900">{title}</h2>
          <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
        </div>
        <Link to={`/customers?sort=${sortBy}&order=${sortOrder}`} className="text-xs font-semibold text-blue-600 hover:underline shrink-0">
          View all
        </Link>
      </header>
      {result.status === 'error' && !result.data ? (
        <ErrorState error={result.error} onRetry={result.reload} />
      ) : !result.data ? (
        <LoadingState label="Loading customers…" />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 text-slate-500 uppercase tracking-wider text-[10px] font-semibold border-y border-slate-100">
              <tr>
                <th className="py-2.5 px-4">Customer ID</th>
                <th className="py-2.5 px-4 text-right">Risk Score</th>
                <th className="py-2.5 px-4 text-right">Est. Default Probability</th>
                <th className="py-2.5 px-4">Risk Category</th>
                <th className="py-2.5 px-4 text-right">Late Payment Rate</th>
                <th className="py-2.5 px-4 text-right">Unpaid Amount</th>
                <th className="py-2.5 px-4 text-right">
                  <span className="sr-only">Action</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {result.data.customers.map((c) => (
                <tr
                  key={c.customer_id}
                  tabIndex={0}
                  onClick={() => open(c.customer_id)}
                  onKeyDown={(e) => e.key === 'Enter' && open(c.customer_id)}
                  className="hover:bg-slate-50/80 focus:bg-blue-50/50 focus:outline-none cursor-pointer group"
                >
                  <td className="py-2.5 px-4 font-mono font-bold text-slate-900 group-hover:text-blue-600">{c.customer_id}</td>
                  <td className="py-2.5 px-4 text-right font-mono tabular-nums font-semibold text-slate-900">{formatScore(c.risk_score)}</td>
                  <td className="py-2.5 px-4 text-right font-mono tabular-nums">{formatPercent(c.default_probability)}</td>
                  <td className="py-2.5 px-4">
                    <RiskBadge category={c.risk_category} />
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono tabular-nums">{formatPercent(c.late_payment_rate)}</td>
                  <td className="py-2.5 px-4 text-right font-mono tabular-nums">{formatAmount(c.total_unpaid_amount)}</td>
                  <td className="py-2.5 px-4 text-right">
                    <span className="px-2 py-1 rounded-lg bg-slate-100 group-hover:bg-blue-600 group-hover:text-white text-slate-700 font-semibold text-[11px] inline-flex items-center gap-1">
                      <Eye className="w-3 h-3" /> View
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};
