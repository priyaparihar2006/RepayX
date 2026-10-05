import React from 'react';
import {
  LineChart,
  Sparkles,
  TrendingUp,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldCheck,
  Bot,
  Zap,
  BarChart3,
  Percent,
} from 'lucide-react';

export const AiInsightsPage: React.FC = () => {
  const funnelSteps = [
    { label: 'Follow-ups Sent', count: 1248, percent: '100%', color: 'bg-blue-600', width: 'w-full' },
    { label: 'Customer Responded', count: 892, percent: '71.5%', color: 'bg-purple-600', width: 'w-[71.5%]' },
    { label: 'Payment Promise (PTP)', count: 540, percent: '43.3%', color: 'bg-indigo-600', width: 'w-[43.3%]' },
    { label: 'Payment Received & Cleared', count: 468, percent: '37.5%', color: 'bg-emerald-600', width: 'w-[37.5%]' },
  ];

  const intentTrends = [
    { label: 'Payment Promises', count: 540, percent: 43, color: 'bg-emerald-500', text: 'text-emerald-700' },
    { label: 'Payment Delays (Salary etc)', count: 320, percent: 26, color: 'bg-amber-500', text: 'text-amber-700' },
    { label: 'Financial Difficulty', count: 180, percent: 14, color: 'bg-rose-500', text: 'text-rose-700' },
    { label: 'Payment Claims (UPI ref)', count: 120, percent: 10, color: 'bg-blue-500', text: 'text-blue-700' },
    { label: 'Disputes & Wrong Number', count: 88, percent: 7, color: 'bg-purple-500', text: 'text-purple-700' },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">AI Insights & Analytics</h1>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800">
              Demo Metrics
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Model telemetry, conversion funnel performance, and borrower response sentiment breakdown.
          </p>
        </div>
      </div>

      {/* AI Performance Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-purple-200/80 shadow-xs bg-gradient-to-b from-purple-50/30 to-white">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Intent Detection Accuracy</span>
            <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono text-purple-700 tabular-nums">94%</span>
            <span className="text-xs font-semibold text-emerald-600">+1.2% this week</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Ground truth verified on 2,400+ turns</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Response Approval Rate</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono text-slate-900 tabular-nums">87%</span>
            <span className="text-xs font-semibold text-slate-500">Zero edit accepted</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Manager-in-the-loop validation</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Escalation Rate</span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono text-slate-900 tabular-nums">12%</span>
            <span className="text-xs font-semibold text-slate-500">Routed to managers</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Hardship & billing disputes</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Avg Response Time</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono text-slate-900 tabular-nums">1.8s</span>
            <span className="text-xs font-semibold text-emerald-600">Sub-second RAG</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">End-to-end vector generation</p>
        </div>
      </div>

      {/* Grid: Conversion Funnel & Intent Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Follow-up Conversion Funnel */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900 tracking-tight">Recovery Conversion Funnel</h2>
              <p className="text-xs text-slate-500">From automated message dispatch to cleared bank settlement</p>
            </div>
            <span className="text-xs font-mono font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg">
              37.5% Net Recovery
            </span>
          </div>

          <div className="space-y-4 my-6">
            {funnelSteps.map((step, idx) => (
              <div key={step.label} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <span className="font-semibold text-slate-800">{step.label}</span>
                  </div>
                  <div className="flex items-center gap-2 font-mono">
                    <span className="text-slate-500">{step.count.toLocaleString()}</span>
                    <span className="font-bold text-slate-900 w-12 text-right">{step.percent}</span>
                  </div>
                </div>

                <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className={`h-full ${step.color} ${step.width} rounded-full transition-all duration-500`} />
                </div>
              </div>
            ))}
          </div>

          <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-600 border border-slate-200/60 leading-relaxed">
            💡 <strong>Recovery Insight:</strong> Borrowers who replied within 2 hours of WhatsApp delivery had an <strong>82% higher</strong> likelihood of keeping their Payment Promise compared to those followed up on Day 3.
          </div>
        </div>

        {/* Customer Response Intent Breakdown */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900 tracking-tight">Customer Response Trends</h2>
              <p className="text-xs text-slate-500">Distribution of inbound sentiment parsed by NLP</p>
            </div>
            <span className="text-xs font-mono text-slate-500">1,248 Classified</span>
          </div>

          <div className="space-y-3.5 my-6">
            {intentTrends.map((trend) => (
              <div key={trend.label} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-800">{trend.label}</span>
                  <div className="flex items-center gap-2 font-mono">
                    <span className="text-slate-500">{trend.count}</span>
                    <span className="font-bold text-slate-900 w-10 text-right">{trend.percent}%</span>
                  </div>
                </div>

                <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${trend.color} rounded-full transition-all duration-500`}
                    style={{ width: `${trend.percent}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="p-3 bg-purple-50/60 rounded-xl text-xs text-purple-900 border border-purple-100 leading-relaxed">
            ✨ <strong>AI Recommendation:</strong> 43% of borrowers commit to a specific date. Automating smart calendar reminders T-2 hours before commitment time boosts PTP fulfillment by 19.4%.
          </div>
        </div>
      </div>
    </div>
  );
};
