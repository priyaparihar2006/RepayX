import React from 'react';
import { formatNumber, formatPercent, formatScore } from '../lib/format';
import { AnalyticsPage } from './Dashboard';
import { MetricCard } from '../components/analytics/MetricCard';
import { RiskDistributionBar } from '../components/analytics/RiskDistributionBar';
import { RiskScoreHistogram } from '../components/analytics/RiskScoreHistogram';
import { SegmentTable } from '../components/analytics/SegmentTable';
import { ModelCard } from '../components/analytics/ModelCard';
import { TopCustomersTable } from '../components/analytics/TopCustomersTable';

export const RiskAnalyticsPage: React.FC = () => (
  <AnalyticsPage title="Risk Analytics" description="How estimated default risk is distributed across the portfolio and its segments.">
    {(data) => {
      const p = data.portfolio;
      return (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <MetricCard label="Average Risk Score" value={formatScore(p.average_risk_score)} detail="On a 0–100 scale" />
            <MetricCard label="Median Risk Score" value={formatScore(p.median_risk_score)} detail="Half of customers score below this" />
            <MetricCard label="Avg Est. Default Probability" value={formatPercent(p.average_default_probability)} detail="Model estimate, not an observed rate" />
            <MetricCard label="Predicted Defaults" value={formatNumber(p.predicted_defaults)}
              detail={`${formatPercent(p.predicted_default_share)} of customers at the ${formatPercent((data.model?.classification_threshold ?? 0) * 100, 0)} threshold`} />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2">
              <RiskScoreHistogram bins={data.risk_score_histogram}
                mediumFrom={data.model?.risk_band_medium_from} highFrom={data.model?.risk_band_high_from} />
            </div>
            <RiskDistributionBar categories={p.risk_categories} total={p.total_customers} />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <SegmentTable title="Risk by Income Type" segments={data.segments.income_type} measure="risk" />
            <SegmentTable title="Risk by Education" segments={data.segments.education} measure="risk" />
            <SegmentTable title="Risk by Occupation" segments={data.segments.occupation} measure="risk" />
          </div>
          <p className="text-[11px] text-slate-500 -mt-3">
            Segment figures describe the model's estimates for each group; they are not causal explanations. Gender and
            marital status are not model inputs.
          </p>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2">
              <TopCustomersTable title="Highest Estimated Default Probability" subtitle="Top 10 customers" sortBy="default_probability" />
            </div>
            {data.model && <ModelCard model={data.model} />}
          </div>
        </>
      );
    }}
  </AnalyticsPage>
);
