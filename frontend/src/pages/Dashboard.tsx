import React from 'react';
import { AlertTriangle, CircleDollarSign, Clock, Gauge, Users } from 'lucide-react';
import { useAnalytics } from '../hooks/useAnalytics';
import type { AnalyticsResponse } from '../types/api';
import { RISK_COLORS } from '../lib/chartTheme';
import { formatAmount, formatNumber, formatPercent, formatScore } from '../lib/format';
import { ErrorState, LoadingState } from '../components/common/RequestState';
import { Disclaimer } from '../components/common/Disclaimer';
import { MetricCard } from '../components/analytics/MetricCard';
import { RiskDistributionBar } from '../components/analytics/RiskDistributionBar';
import { RiskScoreHistogram } from '../components/analytics/RiskScoreHistogram';
import { LateRateChart } from '../components/analytics/LateRateChart';
import { TopCustomersTable } from '../components/analytics/TopCustomersTable';

/** Loads /api/analytics once and renders loading / error states around a page body. */
export const AnalyticsPage: React.FC<{
  title: string;
  description: string;
  children: (data: AnalyticsResponse) => React.ReactNode;
}> = ({ title, description, children }) => {
  const result = useAnalytics();
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-2">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#171A17] tracking-tight">{title}</h1>
          <p className="text-xs sm:text-sm text-[#777E77] mt-0.5">{description}</p>
        </div>
        {result.data?.model_version && (
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold ${
                result.isFallback
                  ? 'bg-[#FEF7EA] text-[#B45309] border border-[#FDE68A]'
                  : 'bg-[#EDF5E5] text-[#245C35] border border-[#D1E8BC]'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  result.isFallback ? 'bg-[#D97706] animate-pulse' : 'bg-[#245C35]'
                }`}
              />
              {result.isFallback ? '⚡ Warming Cloud API...' : 'Live Engine Connected'}
            </span>
            <p className="text-[11px] text-[#777E77]">
              Scored by <span className="font-mono text-[#171A17] font-medium">{result.data.model_version}</span>
            </p>
          </div>
        )}
      </div>
      {result.status === 'error' && !result.data ? (
        <div className="bg-white rounded-[20px] border border-[#E7EBE3] shadow-fintech-card p-6">
          <ErrorState error={result.error} onRetry={result.reload} />
        </div>
      ) : !result.data ? (
        <div className="bg-white rounded-[20px] border border-[#E7EBE3] shadow-fintech-card p-6">
          <LoadingState label="Loading portfolio analytics…" />
        </div>
      ) : (
        children(result.data)
      )}
      <Disclaimer />
    </div>
  );
};

export const DashboardPage: React.FC = () => (
  <AnalyticsPage title="Portfolio Risk Overview" description="Model-based default risk and repayment behaviour across the scored portfolio.">
    {(data) => {
      const { portfolio: p, repayment: r } = data;
      const byCategory = Object.fromEntries(p.risk_categories.map((c) => [c.risk_category, c]));
      return (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <MetricCard label="Total Customers" value={formatNumber(p.total_customers)} icon={Users}
              detail={`Average risk score ${formatScore(p.average_risk_score)}`} />
            {(['High Risk', 'Medium Risk', 'Low Risk'] as const).map((c) => (
              <MetricCard key={c} label={c} keyColor={RISK_COLORS[c]} value={formatNumber(byCategory[c]?.customers ?? 0)}
                detail={`${formatPercent(byCategory[c]?.share ?? 0)} of customers`} />
            ))}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2 flex flex-col">
              <RiskScoreHistogram
                className="h-full"
                bins={data.risk_score_histogram}
                mediumFrom={data.model?.risk_band_medium_from}
                highFrom={data.model?.risk_band_high_from}
              />
            </div>
            <div className="space-y-6 flex flex-col">
              <RiskDistributionBar categories={p.risk_categories} total={p.total_customers} />
              <section className="bg-white rounded-[20px] border border-[#E7EBE3] shadow-fintech-card p-5 transition-all duration-200 flex-1 flex flex-col justify-between">
                <div>
                  <h2 className="text-sm font-bold text-[#171A17]">Default Probability Overview</h2>
                  <dl className="mt-3.5 grid grid-cols-2 gap-4">
                    <div>
                      <dt className="text-xs text-[#777E77]">Avg est. default probability</dt>
                      <dd className="mt-1 text-xl font-semibold text-[#171A17]">{formatPercent(p.average_default_probability)}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-[#777E77]">Median risk score</dt>
                      <dd className="mt-1 text-xl font-semibold text-[#171A17]">{formatScore(p.median_risk_score)}</dd>
                    </div>
                    <div className="col-span-2 pt-2 border-t border-[#E7EBE3]/70">
                      <dt className="text-xs text-[#777E77]">Predicted defaults</dt>
                      <dd className="mt-1 text-xl font-semibold text-[#171A17]">
                        {formatNumber(p.predicted_defaults)}{' '}
                        <span className="text-xs font-normal text-[#777E77]">({formatPercent(p.predicted_default_share)} of customers)</span>
                      </dd>
                    </div>
                  </dl>
                </div>
                {data.model && (
                  <p className="mt-2 text-[11px] text-[#777E77] bg-[#F5F7F3] p-2.5 rounded-xl border border-[#E7EBE3] leading-relaxed">
                    Estimated probability at or above the {formatPercent(data.model.classification_threshold * 100, 0)} classification
                    threshold. This threshold is separate from the risk categories.
                  </p>
                )}
              </section>
            </div>
          </div>

          <div>
            <h2 className="text-sm font-bold text-[#171A17] mb-3">Repayment Analytics</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              <MetricCard label="Average Late Payment Rate" icon={Clock} value={formatPercent(r.average_late_payment_rate)}
                detail={`Across ${formatNumber(r.customers_with_history)} customers with installment history`} />
              <MetricCard label="Customers with Late Payments" icon={AlertTriangle} value={formatNumber(r.customers_with_late_payments)}
                detail={`${formatPercent(r.customers_with_late_payments_share)} of customers with history · ${formatNumber(r.customers_always_late)} always late`} />
              <MetricCard label="Unpaid Amount" icon={CircleDollarSign} value={formatAmount(r.total_unpaid_amount)}
                detail={`Across ${formatNumber(r.customers_with_unpaid_amounts)} customers with a shortfall`} />
              <MetricCard label="Average Underpaid Rate" icon={Gauge} value={formatPercent(r.average_underpaid_rate)}
                detail={`Average payment ratio ${formatScore(r.average_payment_ratio)} (1.00 = paid in full)`} />
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-1 flex flex-col">
              <LateRateChart className="h-full" buckets={data.late_payment_rate_buckets} />
            </div>
            <div className="xl:col-span-2">
              <TopCustomersTable title="Highest-Risk Customers" subtitle="Top 10 by risk score" sortBy="risk_score" />
            </div>
          </div>
        </>
      );
    }}
  </AnalyticsPage>
);
