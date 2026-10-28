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
    { label: 'Follow-ups Sent', count: 1248, percent: '100%', color: 'bg-[#245C35]', width: 'w-full' },
    { label: 'Customer Responded', count: 892, percent: '71.5%', color: 'bg-[#16A34A]', width: 'w-[71.5%]' },
    { label: 'Payment Promise (PTP)', count: 540, percent: '43.3%', color: 'bg-[#D97706]', width: 'w-[43.3%]' },
    { label: 'Payment Received & Cleared', count: 468, percent: '37.5%', color: 'bg-[#15803D]', width: 'w-[37.5%]' },
  ];

  const intentTrends = [
    { label: 'Payment Promises', count: 540, percent: 43, color: 'bg-[#245C35]', text: 'text-[#245C35]' },
    { label: 'Payment Delays (Salary etc)', count: 320, percent: 26, color: 'bg-[#D97706]', text: 'text-[#B45309]' },
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
            <h1 className="text-xl sm:text-2xl font-bold text-[#171A17] tracking-tight font-heading">
              AI Insights & Analytics
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#EDF5E5] text-[#245C35] border border-[#D1E8BC]">
              Telemetry
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[#777E77] mt-0.5">
            Model telemetry, conversion funnel performance, and borrower response sentiment breakdown.
          </p>
        </div>
      </div>

      {/* AI Performance Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-[20px] p-5 border border-[#E7EBE3] shadow-fintech-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#777E77]">Intent Detection Accuracy</span>
            <div className="w-8 h-8 rounded-full bg-[#EDF5E5] text-[#245C35] flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono text-[#245C35] tabular-nums">94%</span>
            <span className="text-xs font-semibold text-[#16A34A]">+1.2% this week</span>
          </div>
          <p className="text-[11px] text-[#777E77] mt-1">Ground truth verified on 2,400+ turns</p>
        </div>

        <div className="bg-white rounded-[20px] p-5 border border-[#E7EBE3] shadow-fintech-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#777E77]">Response Approval Rate</span>
            <div className="w-8 h-8 rounded-full bg-[#EDF5E5] text-[#245C35] flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono text-[#171A17] tabular-nums">87%</span>
            <span className="text-xs font-semibold text-[#777E77]">Zero edit accepted</span>
          </div>
          <p className="text-[11px] text-[#777E77] mt-1">Manager-in-the-loop validation</p>
        </div>

        <div className="bg-white rounded-[20px] p-5 border border-[#E7EBE3] shadow-fintech-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#777E77]">Escalation Rate</span>
            <div className="w-8 h-8 rounded-full bg-[#FDF2F4] text-rose-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono text-[#171A17] tabular-nums">12%</span>
            <span className="text-xs font-semibold text-[#777E77]">Routed to managers</span>
          </div>
          <p className="text-[11px] text-[#777E77] mt-1">Hardship & billing disputes</p>
        </div>

        <div className="bg-white rounded-[20px] p-5 border border-[#E7EBE3] shadow-fintech-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#777E77]">Avg Response Time</span>
            <div className="w-8 h-8 rounded-full bg-[#EDF5E5] text-[#245C35] flex items-center justify-center">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono text-[#171A17] tabular-nums">1.8s</span>
            <span className="text-xs font-semibold text-[#16A34A]">Sub-second RAG</span>
          </div>
          <p className="text-[11px] text-[#777E77] mt-1">End-to-end vector generation</p>
        </div>
      </div>

      {/* Grid: Conversion Funnel & Intent Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Follow-up Conversion Funnel */}
        <div className="bg-white rounded-[20px] p-6 border border-[#E7EBE3] shadow-fintech-card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-[#171A17] tracking-tight font-heading">Recovery Conversion Funnel</h2>
              <p className="text-xs text-[#777E77]">From automated message dispatch to cleared bank settlement</p>
            </div>
            <span className="text-xs font-mono font-bold text-[#245C35] bg-[#EDF5E5] px-3 py-1 rounded-full border border-[#D1E8BC]">
              37.5% Net Recovery
            </span>
          </div>

          <div className="space-y-4 my-6">
            {funnelSteps.map((step, idx) => (
              <div key={step.label} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#F5F7F3] text-[#777E77] text-[10px] font-bold flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <span className="font-semibold text-[#171A17]">{step.label}</span>
                  </div>
                  <div className="flex items-center gap-2 font-mono">
                    <span className="text-[#777E77]">{step.count.toLocaleString()}</span>
                    <span className="font-bold text-[#171A17] w-12 text-right">{step.percent}</span>
                  </div>
                </div>

                <div className="h-3 w-full bg-[#F5F7F3] rounded-full overflow-hidden">
                  <div className={`h-full ${step.color} ${step.width} rounded-full transition-all duration-500`} />
                </div>
              </div>
            ))}
          </div>

          <div className="p-3.5 bg-[#EDF5E5] rounded-2xl text-xs text-[#245C35] border border-[#D1E8BC] leading-relaxed">
            💡 <strong>Recovery Insight:</strong> Borrowers who replied within 2 hours of WhatsApp delivery had an <strong>82% higher</strong> likelihood of keeping their Payment Promise compared to those followed up on Day 3.
          </div>
        </div>

        {/* Customer Response Intent Breakdown */}
        <div className="bg-white rounded-[20px] p-6 border border-[#E7EBE3] shadow-fintech-card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-[#171A17] tracking-tight font-heading">Customer Response Trends</h2>
              <p className="text-xs text-[#777E77]">Distribution of inbound sentiment parsed by NLP</p>
            </div>
            <span className="text-xs font-mono text-[#777E77]">1,248 Classified</span>
          </div>

          <div className="space-y-3.5 my-6">
            {intentTrends.map((trend) => (
              <div key={trend.label} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-[#171A17]">{trend.label}</span>
                  <div className="flex items-center gap-2 font-mono">
                    <span className="text-[#777E77]">{trend.count}</span>
                    <span className="font-bold text-[#171A17] w-10 text-right">{trend.percent}%</span>
                  </div>
                </div>

                <div className="h-2.5 w-full bg-[#F5F7F3] rounded-full overflow-hidden">
                  <div
                    className={`h-full ${trend.color} rounded-full transition-all duration-500`}
                    style={{ width: `${trend.percent}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="p-3.5 bg-[#EDF5E5]/70 rounded-2xl text-xs text-[#245C35] border border-[#D1E8BC] leading-relaxed">
            ✨ <strong>AI Recommendation:</strong> 43% of borrowers commit to a specific date. Automating smart calendar reminders T-2 hours before commitment time boosts PTP fulfillment by 19.4%.
          </div>
        </div>
      </div>
    </div>
  );
};
