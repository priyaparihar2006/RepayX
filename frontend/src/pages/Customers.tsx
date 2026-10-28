import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, Eye, Search } from 'lucide-react';
import { useCustomers } from '../hooks/useCustomers';
import { RISK_CATEGORIES, type CustomerSortField, type RiskCategory, type SortOrder } from '../types/api';
import { RiskBadge } from '../components/common/RiskBadge';
import { EmptyState, ErrorState, LoadingState } from '../components/common/RequestState';
import { Disclaimer } from '../components/common/Disclaimer';
import { formatAmount, formatNumber, formatPercent, formatRatio, formatScore } from '../lib/format';

const PAGE_SIZE = 25;
const SORT_FIELDS: CustomerSortField[] = [
  'customer_id', 'risk_score', 'default_probability', 'late_payment_rate', 'total_unpaid_amount', 'payment_ratio',
];

const COLUMNS: { field: CustomerSortField; label: string; align?: 'right' }[] = [
  { field: 'customer_id', label: 'Customer ID' },
  { field: 'risk_score', label: 'Risk Score', align: 'right' },
  { field: 'default_probability', label: 'Est. Default Probability', align: 'right' },
  { field: 'late_payment_rate', label: 'Late Payment Rate', align: 'right' },
  { field: 'total_unpaid_amount', label: 'Total Unpaid', align: 'right' },
  { field: 'payment_ratio', label: 'Payment Ratio', align: 'right' },
];

function readParams(params: URLSearchParams) {
  const risk = params.get('risk');
  const sort = params.get('sort');
  const page = Number(params.get('page'));
  return {
    risk: RISK_CATEGORIES.includes(risk as RiskCategory) ? (risk as RiskCategory) : undefined,
    search: /^\d{1,10}$/.test(params.get('q') ?? '') ? params.get('q')! : undefined,
    sortBy: SORT_FIELDS.includes(sort as CustomerSortField) ? (sort as CustomerSortField) : 'risk_score',
    sortOrder: (params.get('order') === 'asc' ? 'asc' : 'desc') as SortOrder,
    page: Number.isInteger(page) && page > 0 ? page : 1,
  };
}

export const CustomersPage: React.FC = () => {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { risk, search, sortBy, sortOrder, page } = readParams(params);
  const [searchInput, setSearchInput] = useState(search ?? '');
  const searchInvalid = searchInput !== '' && !/^\d{1,10}$/.test(searchInput);

  const result = useCustomers({
    page, page_size: PAGE_SIZE, risk_category: risk, search, sort_by: sortBy, sort_order: sortOrder,
  });

  const update = (changes: Record<string, string | undefined>, resetPage = true) => {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(changes)) {
      if (value === undefined || value === '') next.delete(key);
      else next.set(key, value);
    }
    if (resetPage) next.delete('page');
    setParams(next, { replace: true });
  };

  // Debounce typing into the URL (and therefore the API request).
  useEffect(() => {
    if (searchInvalid || searchInput === (search ?? '')) return;
    const timer = setTimeout(() => update({ q: searchInput || undefined }), 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput, searchInvalid]);

  const toggleSort = (field: CustomerSortField) => {
    const order = sortBy === field && sortOrder === 'desc' ? 'asc' : 'desc';
    update({ sort: field, order });
  };

  const data = result.data;
  const pagination = data?.pagination;
  const customers = data?.customers ?? [];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#171A17] tracking-tight">Customers</h1>
          <p className="text-xs sm:text-sm text-[#777E77] mt-0.5">
            Model-based risk estimates and repayment history for every scored customer.
          </p>
        </div>
        {pagination && (
          <span className="text-xs px-3 py-1 rounded-full bg-[#EDF5E5] text-[#245C35] font-semibold border border-[#D1E8BC]">
            <strong>{formatNumber(pagination.total)}</strong> customers
            {risk || search ? ' match' : ''}
          </span>
        )}
      </div>

      <div className="bg-white rounded-[20px] p-4 border border-[#E7EBE3] shadow-fintech-card flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-[240px] flex-1 max-w-md">
          <label className="relative block">
            <span className="sr-only">Search by customer ID</span>
            <Search className="w-4 h-4 absolute left-3.5 top-2.5 text-[#777E77]" />
            <input
              type="text"
              inputMode="numeric"
              placeholder="Search by customer ID (e.g. 385772)"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value.trim())}
              aria-invalid={searchInvalid}
              className={`w-full bg-[#F5F7F3] border rounded-full pl-10 pr-4 py-2 text-xs text-[#171A17] placeholder-[#777E77] focus:outline-none focus:ring-2 focus:ring-[#245C35]/20 transition-all ${
                searchInvalid ? 'border-rose-300 focus:ring-rose-500' : 'border-[#E7EBE3] focus:border-[#245C35]'
              }`}
            />
          </label>
          {searchInvalid && <p className="text-[11px] text-rose-600 mt-1 pl-3">Customer IDs contain digits only.</p>}
        </div>

        <div role="group" aria-label="Filter by risk category" className="flex items-center gap-1 bg-[#F5F7F3] p-1 rounded-full border border-[#E7EBE3] text-xs">
          {[undefined, ...RISK_CATEGORIES].map((category) => (
            <button
              key={category ?? 'all'}
              type="button"
              aria-pressed={risk === category}
              onClick={() => update({ risk: category })}
              className={`px-3.5 py-1.5 rounded-full font-semibold transition-all cursor-pointer ${
                risk === category ? 'bg-[#245C35] text-white shadow-2xs' : 'text-[#777E77] hover:text-[#171A17]'
              }`}
            >
              {category ?? 'All'}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-[20px] border border-[#E7EBE3] shadow-fintech-card overflow-hidden transition-all duration-200">
        {result.status === 'error' && !data ? (
          <ErrorState error={result.error} onRetry={result.reload} />
        ) : !data ? (
          <LoadingState label="Loading customers…" />
        ) : (
          <>
            {result.status === 'error' && (
              <div role="alert" className="px-4 py-2 text-xs bg-[#FDF2F4] text-rose-700 border-b border-rose-100">
                {result.error.message}{' '}
                <button type="button" onClick={result.reload} className="underline font-semibold cursor-pointer">Retry</button>
              </div>
            )}
            <div className={`overflow-x-auto transition-opacity ${result.status === 'loading' ? 'opacity-60' : ''}`}>
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F5F7F3] text-[#777E77] uppercase tracking-wider text-[10px] font-semibold border-b border-[#E7EBE3]">
                  <tr>
                    {COLUMNS.slice(0, 1).map((col) => <SortHeader key={col.field} {...col} sortBy={sortBy} sortOrder={sortOrder} onSort={toggleSort} />)}
                    <th className="py-3.5 px-4 font-semibold">Risk Category</th>
                    {COLUMNS.slice(1).map((col) => <SortHeader key={col.field} {...col} sortBy={sortBy} sortOrder={sortOrder} onSort={toggleSort} />)}
                    <th className="py-3.5 px-4 text-right font-semibold"><span className="sr-only">Action</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E7EBE3] text-[#171A17]">
                  {customers.map((c) => (
                    <tr
                      key={c.customer_id}
                      tabIndex={0}
                      onClick={() => navigate(`/customers/${c.customer_id}`)}
                      onKeyDown={(e) => e.key === 'Enter' && navigate(`/customers/${c.customer_id}`)}
                      className="hover:bg-[#EDF5E5]/40 focus:bg-[#EDF5E5]/60 focus:outline-none transition-colors cursor-pointer group"
                    >
                      <td className="py-3 px-4 font-mono font-bold text-[#171A17] group-hover:text-[#245C35]">{c.customer_id}</td>
                      <td className="py-3 px-4"><RiskBadge category={c.risk_category} /></td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-[#171A17]">{formatScore(c.risk_score)}</td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-[#777E77]">{formatPercent(c.default_probability)}</td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-[#777E77]">{formatPercent(c.late_payment_rate)}</td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums font-medium text-[#171A17]">{formatAmount(c.total_unpaid_amount)}</td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-[#777E77]">{formatRatio(c.payment_ratio)}</td>
                      <td className="py-3 px-4 text-right">
                        <span className="px-3 py-1 rounded-full bg-[#EDF5E5] group-hover:bg-[#245C35] group-hover:text-white text-[#245C35] transition-all font-semibold text-[11px] inline-flex items-center gap-1 shadow-2xs">
                          <Eye className="w-3 h-3" /> Details
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {customers.length === 0 && (
              <EmptyState
                title="No customers found"
                message={search ? `No customer ID starts with ${search}${risk ? ` in ${risk}` : ''}.` : 'Try a different filter.'}
              />
            )}
            {pagination && pagination.total_pages > 1 && (
              <nav aria-label="Pagination" className="flex items-center justify-between gap-3 px-5 py-3.5 border-t border-[#E7EBE3] text-xs">
                <span className="text-[#777E77] font-mono">
                  Page {formatNumber(pagination.page)} of {formatNumber(pagination.total_pages)}
                </span>
                <div className="flex items-center gap-2">
                  <PageButton disabled={page <= 1} onClick={() => update({ page: String(page - 1) }, false)} label="Previous page">
                    <ChevronLeft className="w-3.5 h-3.5" /> Prev
                  </PageButton>
                  <PageButton disabled={page >= pagination.total_pages} onClick={() => update({ page: String(page + 1) }, false)} label="Next page">
                    Next <ChevronRight className="w-3.5 h-3.5" />
                  </PageButton>
                </div>
              </nav>
            )}
          </>
        )}
      </div>

      <Disclaimer />
    </div>
  );
};

const SortHeader: React.FC<{
  field: CustomerSortField;
  label: string;
  align?: 'right';
  sortBy: CustomerSortField;
  sortOrder: SortOrder;
  onSort: (field: CustomerSortField) => void;
}> = ({ field, label, align, sortBy, sortOrder, onSort }) => {
  const active = sortBy === field;
  const Icon = !active ? ArrowUpDown : sortOrder === 'asc' ? ArrowUp : ArrowDown;
  return (
    <th
      className={`py-3.5 px-4 ${align === 'right' ? 'text-right' : ''}`}
      aria-sort={active ? (sortOrder === 'asc' ? 'ascending' : 'descending') : 'none'}
    >
      <button
        type="button"
        onClick={() => onSort(field)}
        className={`inline-flex items-center gap-1 uppercase tracking-wider cursor-pointer hover:text-[#171A17] font-semibold ${active ? 'text-[#245C35]' : 'text-[#777E77]'}`}
      >
        {label}
        <Icon className={`w-3 h-3 ${active ? 'text-[#245C35]' : 'text-[#777E77]/50'}`} />
      </button>
    </th>
  );
};

const PageButton: React.FC<{ disabled: boolean; onClick: () => void; label: string; children: React.ReactNode }> = ({
  disabled, onClick, label, children,
}) => (
  <button
    type="button"
    aria-label={label}
    disabled={disabled}
    onClick={onClick}
    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full border border-[#E7EBE3] font-semibold text-[#171A17] bg-white hover:bg-[#F5F7F3] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors shadow-2xs"
  >
    {children}
  </button>
);
