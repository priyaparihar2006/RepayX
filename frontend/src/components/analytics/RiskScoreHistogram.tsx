import React from 'react';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { AnalyticsResponse, RiskCategory } from '../../types/api';
import { CHART, RISK_COLORS, riskCategoryForScore } from '../../lib/chartTheme';
import { formatNumber } from '../../lib/format';
import { ChartCard, DataTable } from './ChartCard';
import { TooltipBox } from './ChartTooltip';

type Bin = AnalyticsResponse['risk_score_histogram'][number] & { category: RiskCategory };

export const RiskScoreHistogram: React.FC<{
  bins: AnalyticsResponse['risk_score_histogram'];
  mediumFrom?: number;
  highFrom?: number;
}> = ({ bins, mediumFrom = 30, highFrom = 60 }) => {
  const total = bins.reduce((s, b) => s + b.customers, 0) || 1;
  const data: Bin[] = bins.map((b) => ({ ...b, category: riskCategoryForScore(b.min, mediumFrom, highFrom) }));
  return (
    <ChartCard
      title="Risk Score Overview"
      subtitle="Customers per 10-point risk score band, coloured by risk category"
      table={
        <DataTable
          headers={['Risk score', 'Risk category', 'Customers', 'Share']}
          rows={data.map((b) => [b.range, b.category, formatNumber(b.customers), `${((b.customers / total) * 100).toFixed(2)}%`])}
        />
      }
    >
      <div className="h-56" role="img" aria-label="Histogram of customer risk scores">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} stroke={CHART.grid} />
            <XAxis dataKey="range" tick={{ fontSize: 10, fill: CHART.tick }} tickLine={false} axisLine={{ stroke: CHART.axis }} interval={0} />
            <YAxis
              tick={{ fontSize: 10, fill: CHART.tick }}
              tickLine={false}
              axisLine={false}
              width={44}
              tickFormatter={(v: number) => formatNumber(v)}
              allowDecimals={false}
            />
            <Tooltip
              cursor={{ fill: CHART.track }}
              content={({ active, payload }) => {
                const bin = active ? (payload?.[0]?.payload as Bin | undefined) : undefined;
                return bin ? (
                  <TooltipBox
                    title={`Risk score ${bin.range}`}
                    rows={[{ label: bin.category, value: `${formatNumber(bin.customers)} customers`, color: RISK_COLORS[bin.category] }]}
                  />
                ) : null;
              }}
            />
            <Bar dataKey="customers" radius={[4, 4, 0, 0]} maxBarSize={24} isAnimationActive={false}>
              {data.map((b) => (
                <Cell key={b.range} fill={RISK_COLORS[b.category]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <ul className="mt-3 flex flex-wrap gap-4 text-[11px] text-slate-600" aria-label="Legend">
        {(Object.keys(RISK_COLORS) as RiskCategory[]).map((c) => (
          <li key={c} className="flex items-center gap-1.5">
            <span aria-hidden className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: RISK_COLORS[c] }} />
            {c}
          </li>
        ))}
      </ul>
    </ChartCard>
  );
};
