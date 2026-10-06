import React from 'react';
import { Link, useNavigate } from 'react-router';
import { Calculator, Eye, FileSearch, ListFilter, UserSearch } from 'lucide-react';
import type { QueryCustomer, QueryMetric, QueryResponse as QueryResult, QueryType } from '../../types/api';
import { RiskBadge } from '../common/RiskBadge';
import { EmptyState } from '../common/RequestState';
import { formatAmount, formatNumber, formatPercent, formatRatio, formatScore } from '../../lib/format';

const QUERY_TYPES: Record<QueryType, { label: string; method: string; icon: React.ComponentType<{ className?: string }> }> = {
  unsupported_query: { label: 'Information unavailable', method: 'The requested information is not available in the scored portfolio', icon: FileSearch },
  customer_query: { label: 'Customer query', method: 'Direct lookup by customer ID', icon: UserSearch },
  aggregate_query: { label: 'Aggregate query', method: 'Calculated over the scored customer data', icon: Calculator },
  retrieval_query: { label: 'Structured retrieval', method: 'Filtered and sorted on repayment and risk fields', icon: ListFilter },
  general_retrieval: { label: 'General retrieval', method: 'TF-IDF text similarity over customer profiles', icon: FileSearch },
};

function formatMetric(m: QueryMetric): string {
  switch (m.unit) {
    case 'percent': return formatPercent(m.value);
    case 'amount': return formatAmount(m.value);
    case 'ratio': return formatRatio(m.value);
    case 'score': return formatScore(m.value);
    case 'days': return m.value === null ? '—' : `${formatNumber(m.value, 2)} days`;
    case 'count': return formatNumber(m.value, Number.isInteger(m.value) ? 0 : 2);
    default: return formatNumber(m.value, 2);
  }
}

export const QueryResponse: React.FC<{ result: QueryResult }> = ({ result }) => {
  const type = QUERY_TYPES[result.query_type];
  const Icon = type.icon;
  return (
    <section aria-live="polite" className="bg-white rounded-2xl border border-slate-200/80 shadow-xs">
      <div className="p-5 border-b border-slate-100 space-y-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Query</p>
          <p className="text-sm text-slate-900 mt-0.5">{result.query}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-purple-50 border border-purple-200 text-[11px] font-semibold text-purple-800">
            <Icon className="w-3.5 h-3.5" /> {type.label}
          </span>
          <span className="text-[11px] text-slate-500">{type.method}</span>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Answer</p>
          <p className="text-sm leading-relaxed text-slate-800 mt-0.5">{result.result}</p>
        </div>
      </div>

      <div className="p-5">
        {result.query_type === 'customer_query' && (result.customers ?? (result.customer ? [result.customer] : [])).length > 0 && (
          <CustomerCards customers={result.customers ?? [result.customer!]} />
        )}
        {result.metrics && result.metrics.length > 0 && <MetricGrid metrics={result.metrics} />}
        {result.customers && result.query_type !== 'customer_query' && (
          <CustomerTable
            customers={result.customers}
            total={result.total_matches ?? result.customers.length}
            criteria={result.criteria}
            showSimilarity={result.query_type === 'general_retrieval'}
          />
        )}
        {result.not_found_ids && result.not_found_ids.length > 0 && !result.customer && (
          <EmptyState title="No matching customer" message={`Customer ${result.not_found_ids.join(', ')} is not in the scored portfolio.`} />
        )}
      </div>
    </section>
  );
};

const MetricGrid: React.FC<{ metrics: QueryMetric[] }> = ({ metrics }) => (
  <dl className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
    {metrics.map((m) => (
      <div key={m.name} className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
        <dt className="text-xs text-slate-500">{m.label}</dt>
        <dd className="mt-1 text-xl font-semibold text-slate-900">{formatMetric(m)}</dd>
        <p className="mt-0.5 text-[11px] text-slate-400">Computed over {formatNumber(m.population)} customers</p>
      </div>
    ))}
  </dl>
);

type CardCustomer = Pick<QueryCustomer, 'customer_id' | 'risk_score' | 'default_probability' | 'risk_category' | 'predicted_default' | 'late_payment_rate' | 'total_unpaid_amount' | 'payment_ratio'>;

const CustomerCards: React.FC<{ customers: CardCustomer[] }> = ({ customers }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
    {customers.map((c) => (
      <div key={c.customer_id} className="rounded-xl border border-slate-200 p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-slate-900">{c.customer_id}</span>
            <RiskBadge category={c.risk_category} />
          </div>
          <Link to={`/customers/${c.customer_id}`} className="text-xs font-semibold text-blue-600 hover:underline">Open profile</Link>
        </div>
        <dl className="mt-3 grid grid-cols-3 gap-2 text-xs">
          <Field label="Risk score" value={`${formatScore(c.risk_score)}/100`} />
          <Field label="Est. default prob." value={formatPercent(c.default_probability)} />
          <Field label="Predicted default" value={c.predicted_default ? 'Yes' : 'No'} />
          <Field label="Late payment rate" value={formatPercent(c.late_payment_rate)} />
          <Field label="Unpaid amount" value={formatAmount(c.total_unpaid_amount)} />
          <Field label="Payment ratio" value={formatRatio(c.payment_ratio)} />
        </dl>
      </div>
    ))}
  </div>
);

const Field: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div>
    <dt className="text-[10px] uppercase tracking-wider text-slate-400">{label}</dt>
    <dd className="mt-0.5 font-semibold text-slate-800">{value}</dd>
  </div>
);

const CustomerTable: React.FC<{ customers: QueryCustomer[]; total: number; criteria?: string; showSimilarity: boolean }> = ({
  customers, total, criteria, showSimilarity,
}) => {
  const navigate = useNavigate();
  if (customers.length === 0) return <EmptyState title="No customers matched" message={criteria} />;
  return (
    <div>
      <p className="text-[11px] text-slate-500 mb-2">
        Showing {formatNumber(customers.length)} of {formatNumber(total)} matching customers{criteria ? ` · ${criteria}` : ''}
      </p>
      <div className="overflow-x-auto rounded-xl border border-slate-100">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50/80 text-slate-500 uppercase tracking-wider text-[10px] font-semibold border-b border-slate-100">
            <tr>
              <th className="py-2.5 px-3">Customer ID</th>
              <th className="py-2.5 px-3">Risk Category</th>
              <th className="py-2.5 px-3 text-right">Risk Score</th>
              <th className="py-2.5 px-3 text-right">Late Payment Rate</th>
              <th className="py-2.5 px-3 text-right">Avg Days Late</th>
              <th className="py-2.5 px-3 text-right">Installments</th>
              <th className="py-2.5 px-3 text-right">Unpaid Amount</th>
              {showSimilarity && <th className="py-2.5 px-3 text-right">Similarity</th>}
              <th className="py-2.5 px-3"><span className="sr-only">Action</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {customers.map((c) => (
              <tr key={c.customer_id} tabIndex={0} onClick={() => navigate(`/customers/${c.customer_id}`)}
                onKeyDown={(e) => e.key === 'Enter' && navigate(`/customers/${c.customer_id}`)}
                className="hover:bg-slate-50/80 focus:bg-blue-50/50 focus:outline-none cursor-pointer group">
                <td className="py-2.5 px-3 font-mono font-bold text-slate-900 group-hover:text-blue-600">{c.customer_id}</td>
                <td className="py-2.5 px-3"><RiskBadge category={c.risk_category} /></td>
                <td className="py-2.5 px-3 text-right font-mono tabular-nums">{formatScore(c.risk_score)}</td>
                <td className="py-2.5 px-3 text-right font-mono tabular-nums">{formatPercent(c.late_payment_rate)}</td>
                <td className="py-2.5 px-3 text-right font-mono tabular-nums">{formatNumber(c.avg_days_late, 2)}</td>
                <td className="py-2.5 px-3 text-right font-mono tabular-nums">{formatNumber(c.installment_count)}</td>
                <td className="py-2.5 px-3 text-right font-mono tabular-nums">{formatAmount(c.total_unpaid_amount)}</td>
                {showSimilarity && <td className="py-2.5 px-3 text-right font-mono tabular-nums">{formatNumber(c.similarity, 3)}</td>}
                <td className="py-2.5 px-3 text-right">
                  <span className="px-2 py-1 rounded-lg bg-slate-100 group-hover:bg-blue-600 group-hover:text-white text-slate-700 font-semibold text-[11px] inline-flex items-center gap-1">
                    <Eye className="w-3 h-3" /> View
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
