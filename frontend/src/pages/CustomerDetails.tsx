import React from 'react';
import { Link, useParams } from 'react-router';
import { ArrowLeft } from 'lucide-react';
import { useCustomer } from '../hooks/useCustomers';
import { ApiError } from '../services/api';
import type { CustomerResponse } from '../types/api';
import { RiskBadge } from '../components/common/RiskBadge';
import { ErrorState, LoadingState } from '../components/common/RequestState';
import { Disclaimer } from '../components/common/Disclaimer';
import { RiskPositionMeter } from '../components/customers/RiskPositionMeter';
import { InsightCard } from '../components/customers/InsightCard';
import { RepaymentComparison } from '../components/customers/RepaymentComparison';
import { formatAmount, formatNumber, formatPercent, formatRatio, formatScore } from '../lib/format';

export function parseCustomerId(raw: string | undefined): number | null {
  if (!raw || !/^\d{1,10}$/.test(raw)) return null;
  const id = Number(raw);
  return id > 0 && id <= 2_147_483_647 ? id : null;
}

export const CustomerDetailsPage: React.FC = () => {
  const { customerId: raw } = useParams();
  const customerId = parseCustomerId(raw);
  const result = useCustomer(customerId);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <Link
        to="/customers"
        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-[#E7EBE3] bg-white text-xs font-semibold text-[#171A17] hover:bg-[#F5F7F3] transition-colors shadow-2xs"
      >
        <ArrowLeft className="w-3.5 h-3.5 text-[#245C35]" /> Back to Customers
      </Link>

      {customerId === null ? (
        <Card className="p-6">
          <ErrorState
            error={new ApiError('validation', `"${raw ?? ''}" is not a valid customer ID. Customer IDs are positive numbers.`)}
            title="Invalid customer ID"
          />
        </Card>
      ) : result.status === 'error' ? (
        <Card className="p-6">
          <ErrorState
            error={result.error}
            onRetry={result.reload}
            title={result.error.kind === 'not_found' ? `Customer ${customerId} not found` : undefined}
          />
        </Card>
      ) : result.status === 'loading' || !result.data ? (
        <Card className="p-6"><LoadingState label={`Loading customer ${customerId}…`} /></Card>
      ) : (
        <CustomerProfile data={result.data} />
      )}

      <Disclaimer />
    </div>
  );
};

const CustomerProfile: React.FC<{ data: CustomerResponse }> = ({ data }) => {
  const c = data.customer;
  return (
  <>
    <Card className="p-6 sm:p-7">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-wider font-semibold text-[#777E77]">Customer ID</p>
          <div className="flex items-center gap-2.5 mt-1">
            <h1 className="text-2xl font-bold text-[#171A17] font-mono tracking-tight">{c.customer_id}</h1>
            <RiskBadge category={c.risk_category} />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-6 text-right">
          <Stat label="Risk Score" value={`${formatScore(c.risk_score)}/100`} strong />
          <Stat label="Est. Default Probability" value={formatPercent(c.default_probability)} />
          <Stat label="Predicted Default" value={c.predicted_default ? 'Yes' : 'No'} tone={c.predicted_default ? 'bad' : 'good'} />
        </div>
      </div>
      <div className="mt-6 pt-5 border-t border-[#E7EBE3]">
        <p className="text-[10px] uppercase tracking-wider font-semibold text-[#777E77] mb-2">Risk position</p>
        <RiskPositionMeter score={c.risk_score} category={c.risk_category} threshold={data.classification_threshold} />
      </div>
    </Card>

    <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
      <div className="xl:col-span-3">
        <InsightCard summary={data.insight.summary} indicators={data.insight.indicators} />
      </div>
      <div className="xl:col-span-2">
        <RepaymentComparison customer={c} benchmarks={data.benchmarks} />
      </div>
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Section title="Financial Information">
        <Row label="Annual Income" value={formatAmount(c.annual_income)} />
        <Row label="Credit Amount" value={formatAmount(c.credit_amount)} />
        <Row label="Annuity Amount" value={formatAmount(c.annuity_amount)} />
      </Section>

      <Section title="Customer Profile">
        <Row label="Income Type" value={c.income_type ?? '—'} />
        <Row label="Education" value={c.education ?? '—'} />
        <Row label="Family Status" value={c.family_status ?? '—'} />
        <Row label="Occupation" value={c.occupation ?? '—'} />
      </Section>

      <Section title="Repayment History">
        {!c.has_installment_history && (
          <p className="text-xs text-[#777E77] pb-2">No installment history is available for this customer.</p>
        )}
        <Row label="Installments" value={formatNumber(c.installment_count)} />
        <Row label="Late Payments" value={formatNumber(c.late_payment_count)} />
        <Row label="Late Payment Rate" value={formatPercent(c.late_payment_rate)} />
        <Row label="Average Days Late" value={formatNumber(c.avg_days_late, 2)} />
        <Row label="Maximum Days Late" value={formatNumber(c.max_days_late)} />
        <Row label="Underpaid Installments" value={formatNumber(c.underpaid_count)} />
        <Row label="Underpaid Rate" value={formatPercent(c.underpaid_rate)} />
        <Row label="Total Unpaid Amount" value={formatAmount(c.total_unpaid_amount)} />
        <Row label="Payment Ratio" value={formatRatio(c.payment_ratio)} />
      </Section>
    </div>
  </>
  );
};

const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`bg-white rounded-[20px] border border-[#E7EBE3] shadow-fintech-card transition-all duration-200 ${className}`}>{children}</div>
);

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <Card className="p-6">
    <h2 className="text-sm font-bold text-[#171A17] mb-3">{title}</h2>
    <dl className="divide-y divide-[#E7EBE3]">{children}</dl>
  </Card>
);

const Row: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex items-center justify-between gap-4 py-2.5 text-xs">
    <dt className="text-[#777E77]">{label}</dt>
    <dd className="font-mono tabular-nums font-semibold text-[#171A17] text-right">{value}</dd>
  </div>
);

const Stat: React.FC<{ label: string; value: string; strong?: boolean; tone?: 'good' | 'bad' }> = ({
  label, value, strong, tone,
}) => (
  <div>
    <p className="text-[10px] uppercase tracking-wider font-semibold text-[#777E77]">{label}</p>
    <p
      className={`mt-1 font-mono tabular-nums ${strong ? 'text-xl font-bold text-[#171A17]' : 'text-base font-semibold'} ${
        tone === 'bad' ? 'text-rose-600' : tone === 'good' ? 'text-[#245C35]' : 'text-[#171A17]'
      }`}
    >
      {value}
    </p>
  </div>
);
