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
    <section className="bg-white rounded-[20px] border border-[#E7EBE3] shadow-fintech-card overflow-hidden">
      <header className="flex items-start justify-between gap-3 p-5 pb-3.5 border-b border-[#E7EBE3]/60">
        <div>
          <h2 className="text-sm font-bold text-[#171A17]">{title}</h2>
          <p className="text-xs text-[#777E77] mt-0.5">{subtitle}</p>
        </div>
        <Link to={`/customers?sort=${sortBy}&order=${sortOrder}`} className="text-xs font-semibold text-[#245C35] hover:text-[#1B4728] px-2.5 py-1 rounded-full bg-[#EDF5E5] hover:bg-[#D1E8BC] transition-colors shrink-0">
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
            <thead className="bg-[#F5F7F3] text-[#777E77] uppercase tracking-wider text-[10px] font-semibold border-b border-[#E7EBE3]">
              <tr>
                <th className="py-3 px-4 font-semibold">Customer ID</th>
                <th className="py-3 px-4 text-right font-semibold">Risk Score</th>
                <th className="py-3 px-4 text-right font-semibold">Est. Default Probability</th>
                <th className="py-3 px-4 font-semibold">Risk Category</th>
                <th className="py-3 px-4 text-right font-semibold">Late Payment Rate</th>
                <th className="py-3 px-4 text-right font-semibold">Unpaid Amount</th>
                <th className="py-3 px-4 text-right">
                  <span className="sr-only">Action</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E7EBE3] text-[#171A17]">
              {result.data.customers.map((c) => (
                <tr
                  key={c.customer_id}
                  tabIndex={0}
                  onClick={() => open(c.customer_id)}
                  onKeyDown={(e) => e.key === 'Enter' && open(c.customer_id)}
                  className="hover:bg-[#EDF5E5]/40 focus:bg-[#EDF5E5]/60 focus:outline-none cursor-pointer group transition-colors"
                >
                  <td className="py-3 px-4 font-mono font-bold text-[#171A17] group-hover:text-[#245C35]">{c.customer_id}</td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-[#171A17]">{formatScore(c.risk_score)}</td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums text-[#777E77]">{formatPercent(c.default_probability)}</td>
                  <td className="py-3 px-4">
                    <RiskBadge category={c.risk_category} />
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums text-[#777E77]">{formatPercent(c.late_payment_rate)}</td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums font-medium text-[#171A17]">{formatAmount(c.total_unpaid_amount)}</td>
                  <td className="py-3 px-4 text-right">
                    <span className="px-2.5 py-1 rounded-full bg-[#EDF5E5] group-hover:bg-[#245C35] group-hover:text-white text-[#245C35] font-semibold text-[11px] inline-flex items-center gap-1 transition-colors">
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
