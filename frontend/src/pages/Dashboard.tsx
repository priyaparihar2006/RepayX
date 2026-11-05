import React from 'react';
import { AlertTriangle, ArrowRight, Bot, CheckCircle2, CircleDollarSign, Clock, Gauge, Mail, MessageSquare, Sparkles, Users, Zap } from 'lucide-react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router';
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
import { DefaultProbabilityGauge } from '../components/analytics/DefaultProbabilityGauge';
import { AnimatedCounter } from '../components/common/AnimatedCounter';

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
              className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-bold ${
                result.isFallback
                  ? 'bg-[#FEF7EA] text-[#B45309] border border-[#FDE68A]'
                  : 'bg-[#EDF5E5] text-[#245C35] border border-[#D1E8BC]'
              }`}
            >
              <span className="relative flex h-2 w-2">
                <span
                  className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                    result.isFallback ? 'bg-[#F59E0B]' : 'bg-[#10B981]'
                  }`}
                />
                <span
                  className={`relative inline-flex rounded-full h-2 w-2 ${
                    result.isFallback ? 'bg-[#D97706]' : 'bg-[#245C35]'
                  }`}
                />
              </span>
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

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  return (
    <AnalyticsPage title="Portfolio Risk Overview" description="Model-based default risk and repayment behaviour across the scored portfolio.">
      {(data) => {
        const { portfolio: p, repayment: r } = data;
        const byCategory = Object.fromEntries(p.risk_categories.map((c) => [c.risk_category, c]));
        return (
          <div className="space-y-6">
            {/* Core Autonomous Recovery & Outreach - Main Project Features */}
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="p-1 rounded-lg bg-[#EDF5E5] text-[#245C35]">
                    <Sparkles className="w-4 h-4 text-[#245C35]" />
                  </span>
                  <div>
                    <h2 className="text-sm font-bold text-[#171A17] font-heading flex items-center gap-2">
                      Core Autonomous Recovery & Outreach
                      <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-[#EDF5E5] text-[#245C35] border border-[#D1E8BC]">
                        Main Features
                      </span>
                    </h2>
                    <p className="text-xs text-[#777E77]">
                      Multi-channel automated recovery engine and conversational AI borrower engagement
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Feature 1: Email Reminder Automation */}
                <div
                  onClick={() => navigate('/automation')}
                  className="group relative bg-white hover:bg-[#FBFDF9] rounded-[20px] border border-[#E7EBE3] hover:border-[#245C35]/50 shadow-fintech-card hover:shadow-fintech-hover transition-all duration-200 p-5 cursor-pointer flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-[#EDF5E5] text-[#245C35] flex items-center justify-center font-bold shadow-2xs group-hover:scale-105 transition-transform">
                          <Mail className="w-5 h-5 text-[#245C35]" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-bold text-[#171A17] font-heading group-hover:text-[#245C35] transition-colors">
                              Email Reminder Automation
                            </h3>
                          </div>
                          <p className="text-[11px] text-[#777E77]">
                            Instant live mail dispatcher & 3-stage scheduled recovery
                          </p>
                        </div>
                      </div>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#EDF5E5] text-[#245C35] border border-[#D1E8BC]">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
                        Live Engine
                      </span>
                    </div>

                    <p className="text-xs text-[#525752] leading-relaxed mb-4">
                      Send instant live payment reminder emails to borrowers, configure 24/7 background worker schedules, and import customer batches via CSV.
                    </p>

                    <div className="flex flex-wrap gap-1.5 mb-4">
                      <span className="px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-[#F5F7F3] text-[#171A17] border border-[#E7EBE3]">
                        ⚡ Instant Email Dispatcher
                      </span>
                      <span className="px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-[#F5F7F3] text-[#171A17] border border-[#E7EBE3]">
                        📅 24/7 Cloud Background Worker
                      </span>
                      <span className="px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-[#F5F7F3] text-[#171A17] border border-[#E7EBE3]">
                        📁 CSV Upload & Delivery Tracking
                      </span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-[#E7EBE3] flex items-center justify-between gap-2">
                    <span className="text-[11px] text-[#777E77] font-medium flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#10B981]" />
                      SMTP Ready
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate('/automation');
                      }}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#245C35] hover:bg-[#1B4728] text-white text-xs font-bold transition-all shadow-xs cursor-pointer group-hover:bg-[#1B4728]"
                    >
                      <span>Open Email Automation</span>
                      <ArrowRight className="w-3.5 h-3.5 text-[#B5F078] group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  </div>
                </div>

                {/* Feature 2: WhatsApp Outreach & Conversational AI */}
                <div
                  onClick={() => navigate('/whatsapp')}
                  className="group relative bg-white hover:bg-[#FBFDF9] rounded-[20px] border border-[#E7EBE3] hover:border-[#245C35]/50 shadow-fintech-card hover:shadow-fintech-hover transition-all duration-200 p-5 cursor-pointer flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-[#EDF5E5] text-[#245C35] flex items-center justify-center font-bold shadow-2xs group-hover:scale-105 transition-transform">
                          <MessageSquare className="w-5 h-5 text-[#245C35]" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-bold text-[#171A17] font-heading group-hover:text-[#245C35] transition-colors">
                              WhatsApp Outreach
                            </h3>
                          </div>
                          <p className="text-[11px] text-[#777E77]">
                            Conversational AI recovery, NLP extraction & Meta Cloud API
                          </p>
                        </div>
                      </div>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#EDF5E5] text-[#245C35] border border-[#D1E8BC]">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
                        Two-Way AI Active
                      </span>
                    </div>

                    <p className="text-xs text-[#525752] leading-relaxed mb-4">
                      Two-way conversational AI assistant in Hindi, Hinglish & English, automated PDF/document defaulter extraction, and scheduled WhatsApp messaging.
                    </p>

                    <div className="flex flex-wrap gap-1.5 mb-4">
                      <span className="px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-[#F5F7F3] text-[#171A17] border border-[#E7EBE3]">
                        🤖 Two-Way Multilingual Assistant
                      </span>
                      <span className="px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-[#F5F7F3] text-[#171A17] border border-[#E7EBE3]">
                        📄 NLP Document / PDF Extraction
                      </span>
                      <span className="px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-[#F5F7F3] text-[#171A17] border border-[#E7EBE3]">
                        📲 Meta Cloud & Baileys Dispatch
                      </span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-[#E7EBE3] flex items-center justify-between gap-2">
                    <span className="text-[11px] text-[#777E77] font-medium flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#10B981]" />
                      AI Assistant Ready
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate('/whatsapp');
                      }}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#245C35] hover:bg-[#1B4728] text-white text-xs font-bold transition-all shadow-xs cursor-pointer group-hover:bg-[#1B4728]"
                    >
                      <span>Open WhatsApp Outreach</span>
                      <ArrowRight className="w-3.5 h-3.5 text-[#B5F078] group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Top Metric Cards with Staggered Entrance */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4"
          >
            <MetricCard label="Total Customers" value={formatNumber(p.total_customers)} icon={Users}
              detail={`Average risk score ${formatScore(p.average_risk_score)}`} />
            {(['High Risk', 'Medium Risk', 'Low Risk'] as const).map((c) => (
              <MetricCard key={c} label={c} keyColor={RISK_COLORS[c]} value={formatNumber(byCategory[c]?.customers ?? 0)}
                detail={`${formatPercent(byCategory[c]?.share ?? 0)} of customers`} />
            ))}
          </motion.div>

          {/* Core Analytics Row */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1, ease: 'easeOut' }}
            className="grid grid-cols-1 xl:grid-cols-3 gap-6"
          >
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

              {/* Enhanced Default Probability Overview with Radial Gauge */}
              <section className="bg-white rounded-[20px] border border-[#E7EBE3] shadow-fintech-card p-5 transition-all duration-200 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-sm font-bold text-[#171A17]">Default Probability Overview</h2>
                      <p className="text-[11px] text-[#777E77] mt-0.5">Model portfolio assessment</p>
                    </div>
                    <DefaultProbabilityGauge probability={p.average_default_probability ?? 0} size={92} />
                  </div>

                  <dl className="mt-3 grid grid-cols-2 gap-4">
                    <div>
                      <dt className="text-xs text-[#777E77]">Avg est. default probability</dt>
                      <dd className="mt-1 text-xl font-semibold text-[#171A17]">
                        <AnimatedCounter value={formatPercent(p.average_default_probability)} />
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-[#777E77]">Median risk score</dt>
                      <dd className="mt-1 text-xl font-semibold text-[#171A17]">
                        <AnimatedCounter value={formatScore(p.median_risk_score)} />
                      </dd>
                    </div>
                    <div className="col-span-2 pt-2 border-t border-[#E7EBE3]/70">
                      <dt className="text-xs text-[#777E77]">Predicted defaults</dt>
                      <dd className="mt-1 text-xl font-semibold text-[#171A17]">
                        <AnimatedCounter value={formatNumber(p.predicted_defaults)} />{' '}
                        <span className="text-xs font-normal text-[#777E77]">
                          (<AnimatedCounter value={formatPercent(p.predicted_default_share)} /> of customers)
                        </span>
                      </dd>
                    </div>
                  </dl>
                </div>
                {data.model && (
                  <p className="mt-3 text-[11px] text-[#777E77] bg-[#F5F7F3] p-2.5 rounded-xl border border-[#E7EBE3] leading-relaxed">
                    Estimated probability at or above the {formatPercent(data.model.classification_threshold * 100, 0)} classification
                    threshold. This threshold is separate from the risk categories.
                  </p>
                )}
              </section>
            </div>
          </motion.div>

          {/* Repayment Analytics Row */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2, ease: 'easeOut' }}
          >
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
          </motion.div>

          {/* Bottom Table and Late Rate Distribution */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3, ease: 'easeOut' }}
            className="grid grid-cols-1 xl:grid-cols-3 gap-6"
          >
            <div className="xl:col-span-1 flex flex-col">
              <LateRateChart className="h-full" buckets={data.late_payment_rate_buckets} />
            </div>
            <div className="xl:col-span-2">
              <TopCustomersTable title="Highest-Risk Customers" subtitle="Top 10 by risk score" sortBy="risk_score" />
            </div>
          </motion.div>
        </div>
      );
    }}
  </AnalyticsPage>
  );
};
