import React from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { AnalyticsResponse } from '../../types/api';
import { CHART, SERIES_COLOR } from '../../lib/chartTheme';
import { formatNumber } from '../../lib/format';
import { ChartCard, DataTable } from './ChartCard';
import { TooltipBox } from './ChartTooltip';

type Bucket = AnalyticsResponse['late_payment_rate_buckets'][number];

/** Customers by share of installments paid late. Customers with an unknown rate are reported, not plotted. */
export const LateRateChart: React.FC<{ buckets: Bucket[] }> = ({ buckets }) => {
  const unknown = buckets.find((b) => b.bucket === 'Unknown')?.customers ?? 0;
  const data = buckets
    .filter((b) => b.bucket !== 'Unknown')
    .map((b) => ({ ...b, label: b.bucket.replace(/ \(.*\)/, '') }));
  return (
    <ChartCard
      title="Late Payment Rate Distribution"
      subtitle="Customers by the share of their installments paid after the due date"
      table={<DataTable headers={['Late payment rate', 'Customers']} rows={buckets.map((b) => [b.bucket, formatNumber(b.customers)])} />}
      footer={
        unknown > 0
          ? `${formatNumber(unknown)} customers without a known late payment rate (no installment history) are not shown.`
          : undefined
      }
    >
      <div className="h-56" role="img" aria-label="Customers by late payment rate bucket">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} stroke={CHART.grid} />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: CHART.tick }} tickLine={false} axisLine={{ stroke: CHART.axis }} interval={0} />
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
                const b = active ? (payload?.[0]?.payload as Bucket | undefined) : undefined;
                return b ? (
                  <TooltipBox title={`Late payment rate ${b.bucket}`} rows={[{ label: 'Customers', value: formatNumber(b.customers), color: SERIES_COLOR }]} />
                ) : null;
              }}
            />
            <Bar dataKey="customers" fill={SERIES_COLOR} radius={[4, 4, 0, 0]} maxBarSize={24} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
};
