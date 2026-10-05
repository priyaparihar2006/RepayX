import React from 'react';
import type { Segment } from '../../types/api';
import { CHART, RISK_COLORS, SERIES_COLOR } from '../../lib/chartTheme';
import { formatNumber, formatPercent, formatScore } from '../../lib/format';

/** Segment comparison as a table with inline meters (one hue per measure on a light track). */
export const SegmentTable: React.FC<{
  title: string;
  segments: Segment[];
  measure: 'risk' | 'late';
  limit?: number;
  minCustomers?: number;
}> = ({ title, segments, measure, limit = 8, minCustomers = 30 }) => {
  const shown = segments.filter((s) => s.customers >= minCustomers).slice(0, limit);
  const hidden = segments.length - shown.length;
  const color = measure === 'risk' ? RISK_COLORS['High Risk'] : SERIES_COLOR;
  return (
    <section className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5">
      <h2 className="text-sm font-bold text-slate-900">{title}</h2>
      <p className="text-xs text-slate-500 mt-0.5">
        {measure === 'risk'
          ? 'Average risk score and share of customers in High Risk'
          : 'Average late payment rate (customers with installment history)'}
      </p>
      <table className="w-full text-xs mt-3">
        <thead className="text-[10px] uppercase tracking-wider text-slate-500 border-b border-slate-100">
          <tr>
            <th className="py-2 text-left font-semibold">Segment</th>
            <th className="py-2 text-right font-semibold">Customers</th>
            {measure === 'risk' && <th className="py-2 text-right font-semibold">Avg score</th>}
            <th className="py-2 pl-4 text-left font-semibold w-2/5">{measure === 'risk' ? 'High Risk share' : 'Avg late rate'}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {shown.map((s) => {
            const value = measure === 'risk' ? s.high_risk_share : s.average_late_payment_rate;
            return (
              <tr key={s.segment}>
                <td className="py-2 text-slate-700 pr-2">{s.segment}</td>
                <td className="py-2 text-right font-mono tabular-nums text-slate-600">{formatNumber(s.customers)}</td>
                {measure === 'risk' && (
                  <td className="py-2 text-right font-mono tabular-nums text-slate-800">{formatScore(s.average_risk_score)}</td>
                )}
                <td className="py-2 pl-4">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 rounded" style={{ backgroundColor: CHART.track }}>
                      <div className="h-2 rounded" style={{ width: `${Math.min(value ?? 0, 100)}%`, backgroundColor: color }} />
                    </div>
                    <span className="w-14 text-right font-mono tabular-nums text-slate-800">{formatPercent(value)}</span>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {hidden > 0 && (
        <p className="mt-2 text-[11px] text-slate-400">
          {hidden} smaller segment{hidden === 1 ? '' : 's'} not shown (fewer than {minCustomers} customers or beyond the top {limit}).
        </p>
      )}
    </section>
  );
};
