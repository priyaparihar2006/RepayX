import React from 'react';
import { Link, useParams } from 'react-router';
import { ArrowLeft } from 'lucide-react';
import { useCustomer } from '../hooks/useCustomers';
import { ApiError } from '../services/api';
import type { CustomerDetail } from '../types/api';
import { RiskBadge } from '../components/common/RiskBadge';
import { ErrorState, LoadingState } from '../components/common/RequestState';
import { Disclaimer } from '../components/common/Disclaimer';
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
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Customers
      </Link>

      {customerId === null ? (
        <Card>
          <ErrorState
            error={new ApiError('validation', `"${raw ?? ''}" is not a valid customer ID. Customer IDs are positive numbers.`)}
            title="Invalid customer ID"
          />
        </Card>
      ) : result.status === 'error' ? (
        <Card>
          <ErrorState
            error={result.error}
            onRetry={result.reload}
            title={result.error.kind === 'not_found' ? `Customer ${customerId} not found` : undefined}
          />
        </Card>
      ) : result.status === 'loading' || !result.data ? (
        <Card><LoadingState label={`Loading customer ${customerId}…`} /></Card>
      ) : (
        <CustomerProfile customer={result.data.customer} />
      )}

      <Disclaimer />
    </div>
  );
};

const CustomerProfile: React.FC<{ customer: CustomerDetail }> = ({ customer: c }) => (
  <>
    <Card className="p-5 sm:p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">Customer ID</p>
          <div className="flex items-center gap-2 mt-1">
            <h1 className="text-2xl font-bold text-slate-900 font-mono tracking-tight">{c.customer_id}</h1>
            <RiskBadge category={c.risk_category} />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-6 text-right">
          <Stat label="Risk Score" value={`${formatScore(c.risk_score)}/100`} strong />
          <Stat label="Est. Default Probability" value={formatPercent(c.default_probability)} />
          <Stat label="Predicted Default" value={c.predicted_default ? 'Yes' : 'No'} tone={c.predicted_default ? 'bad' : 'good'} />
        </div>
      </div>
    </Card>

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
          <p className="text-xs text-slate-500 pb-2">No installment history is available for this customer.</p>
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

const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`bg-white rounded-2xl border border-slate-200/80 shadow-xs ${className}`}>{children}</div>
);

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <Card className="p-5">
    <h2 className="text-sm font-bold text-slate-900 mb-3">{title}</h2>
    <dl className="divide-y divide-slate-100">{children}</dl>
  </Card>
);

const Row: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex items-center justify-between gap-4 py-2 text-xs">
    <dt className="text-slate-500">{label}</dt>
    <dd className="font-mono tabular-nums font-semibold text-slate-800 text-right">{value}</dd>
  </div>
);

const Stat: React.FC<{ label: string; value: string; strong?: boolean; tone?: 'good' | 'bad' }> = ({
  label, value, strong, tone,
}) => (
  <div>
    <p className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">{label}</p>
    <p
      className={`mt-1 font-mono tabular-nums ${strong ? 'text-xl font-bold text-slate-900' : 'text-base font-semibold'} ${
        tone === 'bad' ? 'text-rose-600' : tone === 'good' ? 'text-emerald-600' : 'text-slate-800'
      }`}
    >
      {value}
    </p>
  </div>
);
