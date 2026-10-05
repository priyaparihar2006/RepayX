import React from 'react';
import type { RiskCategoryCount } from '../../types/api';
import { RISK_COLORS } from '../../lib/chartTheme';
import { formatNumber, formatPercent } from '../../lib/format';
import { ChartCard, DataTable } from './ChartCard';

/** Part-to-whole of the three risk tiers as one 100% bar (2px surface gaps between segments) with a legend. */
export const RiskDistributionBar: React.FC<{ categories: RiskCategoryCount[]; total: number }> = ({ categories, total }) => (
  <ChartCard
    title="Risk Distribution"
    subtitle={`${formatNumber(total)} scored customers by risk category`}
    table={
      <DataTable
        headers={['Risk category', 'Customers', 'Share']}
        rows={categories.map((c) => [c.risk_category, formatNumber(c.customers), formatPercent(c.share)])}
      />
    }
    footer="Prototype presentation bands on the 0–100 risk score: Low < 30, Medium 30–60, High ≥ 60."
  >
    <div
      className="flex h-6 w-full gap-[2px]"
      role="img"
      aria-label={categories.map((c) => `${c.risk_category} ${formatPercent(c.share)}`).join(', ')}
    >
      {categories
        .filter((c) => c.customers > 0)
        .map((c, i, arr) => (
          <div
            key={c.risk_category}
            title={`${c.risk_category}: ${formatNumber(c.customers)} (${formatPercent(c.share)})`}
            className={`h-full ${i === 0 ? 'rounded-l' : ''} ${i === arr.length - 1 ? 'rounded-r' : ''}`}
            style={{ width: `${c.share}%`, backgroundColor: RISK_COLORS[c.risk_category] }}
          />
        ))}
    </div>
    <ul className="mt-5 grid grid-cols-3 gap-4">
      {categories.map((c) => (
        <li key={c.risk_category}>
          <p className="flex items-center gap-1.5 text-xs text-slate-500">
            <span aria-hidden className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: RISK_COLORS[c.risk_category] }} />
            {c.risk_category}
          </p>
          <p className="mt-1 text-lg font-semibold text-slate-900">{formatNumber(c.customers)}</p>
          <p className="text-[11px] text-slate-500">{formatPercent(c.share)} of customers</p>
        </li>
      ))}
    </ul>
  </ChartCard>
);
