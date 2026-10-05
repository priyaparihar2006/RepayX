import React from 'react';
import { formatAmount, formatNumber, formatPercent, formatScore } from '../lib/format';
import { AnalyticsPage } from './Dashboard';
import { MetricCard } from '../components/analytics/MetricCard';
import { LateRateChart } from '../components/analytics/LateRateChart';
import { SegmentTable } from '../components/analytics/SegmentTable';
import { TopCustomersTable } from '../components/analytics/TopCustomersTable';

export const RepaymentAnalyticsPage: React.FC = () => (
  <AnalyticsPage
    title="Repayment Analytics"
    description="Historical installment behaviour: lateness, underpayment, and unpaid amounts."
  >
    {(data) => {
      const r = data.repayment;
      return (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <MetricCard label="Average Late Payment Rate" value={formatPercent(r.average_late_payment_rate)}
              detail={`Average ${formatScore(r.average_days_late)} days late per installment`} />
            <MetricCard label="Customers with Late Payments" value={formatNumber(r.customers_with_late_payments)}
              detail={`${formatPercent(r.customers_with_late_payments_share)} of customers with history · ${formatNumber(r.customers_always_late)} always late`} />
            <MetricCard label="Total Unpaid Amount" value={formatAmount(r.total_unpaid_amount)}
              detail={`${formatNumber(r.customers_with_unpaid_amounts)} customers with a shortfall`} />
            <MetricCard label="Average Payment Ratio" value={formatScore(r.average_payment_ratio)}
              detail={`Average underpaid rate ${formatPercent(r.average_underpaid_rate)}`} />
          </div>
          <p className="text-[11px] text-slate-500 -mt-3">
            Averages cover the {formatNumber(r.customers_with_history)} customers with installment history;{' '}
            {formatNumber(r.customers_without_history)} customers without history are excluded rather than counted as on time.
          </p>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <LateRateChart buckets={data.late_payment_rate_buckets} />
            <SegmentTable title="Late Payment Rate by Income Type" segments={data.segments.income_type} measure="late" />
            <SegmentTable title="Late Payment Rate by Occupation" segments={data.segments.occupation} measure="late" />
          </div>

          {/* Stacked full-width: seven columns do not fit two-up without clipping. */}
          <div className="grid grid-cols-1 gap-6">
            <TopCustomersTable title="Highest Late Payment Rates" subtitle="Top 10 by late payment rate" sortBy="late_payment_rate" />
            <TopCustomersTable title="Largest Unpaid Amounts" subtitle="Top 10 by total unpaid amount" sortBy="total_unpaid_amount" />
          </div>
        </>
      );
    }}
  </AnalyticsPage>
);
