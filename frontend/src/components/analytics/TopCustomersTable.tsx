import React from 'react';
import { Link, useNavigate } from 'react-router';
import { ArrowRight, Eye, Users } from 'lucide-react';
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
    <section className="bg-white rounded-2xl border border-[#E5EBE7] shadow-fintech-card overflow-hidden">
      <header className="flex items-center justify-between gap-3 p-5 border-b border-[#E5EBE7]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#EAF5ED] text-[#198754] flex items-center justify-center">
            <Users className="w-4 h-4 text-[#198754]" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-[#202B25]">{title}</h2>
            <p className="text-xs text-[#77827B]">{subtitle}</p>
          </div>
        </div>
        <Link
          to={`/customers?sort=${sortBy}&order=${sortOrder}`}
          className="text-xs font-semibold text-[#198754] hover:text-[#157347] flex items-center gap-1 transition-colors shrink-0"
        >
          <span>View All</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </header>
      {result.status === 'error' && !result.data ? (
        <ErrorState error={result.error} onRetry={result.reload} />
      ) : !result.data ? (
        <LoadingState label="Loading customers…" />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F7FAF8] text-[#77827B] text-[11px] font-semibold border-b border-[#E5EBE7]">
              <tr>
                <th className="py-3 px-4 font-semibold">Customer ID</th>
                <th className="py-3 px-4 font-semibold text-right">Risk Score</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold text-right">Est. Default Probability</th>
                <th className="py-3 px-4 font-semibold text-right">Late Payment Rate</th>
                <th className="py-3 px-4 font-semibold text-right">Unpaid Amount</th>
                <th className="py-3 px-4 text-right font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5EBE7] text-[#202B25]">
              {result.data.customers.map((c) => (
                <tr
                  key={c.customer_id}
                  tabIndex={0}
                  onClick={() => open(c.customer_id)}
                  onKeyDown={(e) => e.key === 'Enter' && open(c.customer_id)}
                  className="hover:bg-[#F7FAF8] focus:bg-[#EAF5ED]/50 focus:outline-none cursor-pointer group transition-colors"
                >
                  <td className="py-3.5 px-4 font-mono font-bold text-[#202B25] group-hover:text-[#198754]">
                    {c.customer_id}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono tabular-nums font-semibold text-[#202B25]">
                    {formatScore(c.risk_score)}
                  </td>
                  <td className="py-3.5 px-4">
                    <RiskBadge category={c.risk_category} />
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono tabular-nums text-[#77827B]">
                    {formatPercent(c.default_probability)}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono tabular-nums text-[#77827B]">
                    {formatPercent(c.late_payment_rate)}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono tabular-nums font-medium text-[#202B25]">
                    {formatAmount(c.total_unpaid_amount)}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <span className="px-3 py-1 rounded-lg bg-[#EAF5ED] text-[#198754] group-hover:bg-[#198754] group-hover:text-white font-semibold text-[11px] inline-flex items-center gap-1 transition-all">
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
