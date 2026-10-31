import React from 'react';
import { motion } from 'motion/react';
import type { RiskCategoryCount } from '../../types/api';
import { RISK_COLORS } from '../../lib/chartTheme';
import { formatNumber, formatPercent } from '../../lib/format';
import { ChartCard, DataTable } from './ChartCard';
import { AnimatedCounter } from '../common/AnimatedCounter';

/** Part-to-whole of the three risk tiers as one 100% bar (2px surface gaps between segments) with animated reveals and a legend. */
export const RiskDistributionBar: React.FC<{ categories: RiskCategoryCount[]; total: number; className?: string }> = ({
  categories,
  total,
  className = '',
}) => (
  <ChartCard
    className={className}
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
      className="flex h-6 w-full gap-[2px] rounded-lg overflow-hidden bg-[#F5F7F3] p-0.5 border border-[#E7EBE3]/50"
      role="img"
      aria-label={categories.map((c) => `${c.risk_category} ${formatPercent(c.share)}`).join(', ')}
    >
      {categories
        .filter((c) => c.customers > 0)
        .map((c, i, arr) => (
          <motion.div
            key={c.risk_category}
            title={`${c.risk_category}: ${formatNumber(c.customers)} (${formatPercent(c.share)})`}
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: `${c.share}%`, opacity: 1 }}
            transition={{ duration: 1.1, delay: i * 0.15, ease: [0.16, 1, 0.3, 1] }}
            className={`h-full ${i === 0 ? 'rounded-l-md' : ''} ${i === arr.length - 1 ? 'rounded-r-md' : ''} transition-all duration-200 hover:brightness-110 hover:opacity-90 cursor-pointer`}
            style={{ backgroundColor: RISK_COLORS[c.risk_category] }}
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
          <p className="mt-1 text-lg font-semibold text-slate-900">
            <AnimatedCounter value={formatNumber(c.customers)} />
          </p>
          <p className="text-[11px] text-slate-500">
            <AnimatedCounter value={formatPercent(c.share)} /> of customers
          </p>
        </li>
      ))}
    </ul>
  </ChartCard>
);
