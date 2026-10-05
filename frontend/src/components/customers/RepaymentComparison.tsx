import React from 'react';
import type { Benchmarks, CustomerDetail } from '../../types/api';
import { CHART, SERIES_COLOR } from '../../lib/chartTheme';
import { formatAmount, formatNumber, formatPercent, formatRatio } from '../../lib/format';
import { ChartCard, DataTable } from '../analytics/ChartCard';

interface Row {
  label: string;
  value: number | null;
  average: number | null;
  format: (v: number | null) => string;
  max: number;
  note?: string;
}

/**
 * One comparison bar per metric (each with its own scale, since the units differ):
 * the customer's value as a bar, the portfolio average as a marker.
 */
export const RepaymentComparison: React.FC<{ customer: CustomerDetail; benchmarks: Benchmarks }> = ({ customer: c, benchmarks: b }) => {
  const span = (...values: (number | null)[]) => Math.max(1, ...values.map((v) => v ?? 0)) * 1.25;
  const rows: Row[] = [
    { label: 'Late Payment Rate', value: c.late_payment_rate, average: b.late_payment_rate, format: (v) => formatPercent(v), max: 100 },
    {
      label: 'Payment Ratio', value: c.payment_ratio, average: b.payment_ratio, format: formatRatio,
      max: Math.max(1.2, (c.payment_ratio ?? 0) * 1.1, (b.payment_ratio ?? 0) * 1.1), note: '1.00 = paid in full',
    },
    { label: 'Unpaid Amount', value: c.total_unpaid_amount, average: b.total_unpaid_amount, format: formatAmount, max: span(c.total_unpaid_amount, b.total_unpaid_amount) },
    { label: 'Average Days Late', value: c.avg_days_late, average: b.avg_days_late, format: (v) => formatNumber(v, 2), max: span(c.avg_days_late, b.avg_days_late) },
  ];
  const pct = (v: number, max: number) => `${Math.min(100, (v / max) * 100)}%`;

  return (
    <ChartCard
      title="Repayment vs Portfolio"
      subtitle="This customer compared with the portfolio average (customers with installment history)"
      table={<DataTable headers={['Metric', 'Customer', 'Portfolio average']} rows={rows.map((r) => [r.label, r.format(r.value), r.format(r.average)])} />}
      footer={!c.has_installment_history ? 'No installment history: repayment values are unavailable for this customer.' : undefined}
    >
      <ul className="space-y-4">
        {rows.map((r) => (
          <li key={r.label}>
            <div className="flex items-baseline justify-between gap-3 text-xs">
              <span className="text-slate-600">
                {r.label}
                {r.note && <span className="text-slate-400"> · {r.note}</span>}
              </span>
              <span>
                <span className="font-semibold text-slate-900">{r.format(r.value)}</span>
                <span className="text-slate-500"> vs avg {r.format(r.average)}</span>
              </span>
            </div>
            <div className="relative mt-1.5 h-3 rounded" style={{ backgroundColor: CHART.track }}>
              {r.value !== null && (
                <div className="absolute inset-y-0 left-0 rounded" style={{ width: pct(r.value, r.max), backgroundColor: SERIES_COLOR }} />
              )}
              {r.average !== null && (
                <div
                  className="absolute -top-1 -bottom-1 w-[3px] -translate-x-1/2 rounded bg-slate-900 ring-2 ring-white"
                  style={{ left: pct(r.average, r.max) }}
                  title={`Portfolio average ${r.format(r.average)}`}
                />
              )}
            </div>
          </li>
        ))}
      </ul>
      <ul className="mt-4 flex flex-wrap gap-4 text-[11px] text-slate-600" aria-label="Legend">
        <li className="flex items-center gap-1.5">
          <span aria-hidden className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: SERIES_COLOR }} /> This customer
        </li>
        <li className="flex items-center gap-1.5">
          <span aria-hidden className="w-[3px] h-3 rounded bg-slate-900" /> Portfolio average
        </li>
      </ul>
    </ChartCard>
  );
};
