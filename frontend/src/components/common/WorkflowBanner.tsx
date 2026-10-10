import React, { useState } from 'react';
import {
  FileText,
  AlertCircle,
  Send,
  MessageSquare,
  Sparkles,
  BookOpen,
  CheckCheck,
  UserCheck,
  CalendarCheck,
  CreditCard,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

export const WorkflowBanner: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false);

  const steps = [
    { label: 'Customer Loan', icon: FileText, desc: 'Active loan ledger monitoring' },
    { label: 'Payment Due', icon: AlertCircle, desc: 'T-2 to DPD trigger' },
    { label: 'AI Follow-up', icon: Send, desc: 'Omnichannel message dispatched' },
    { label: 'Customer Response', icon: MessageSquare, desc: 'Inbound WhatsApp / SMS' },
    { label: 'AI Intent Detection', icon: Sparkles, desc: 'PTP, Delay, Dispute, Hardship', highlight: true },
    { label: 'RAG Policy Retrieval', icon: BookOpen, desc: 'Vector search in SOP & Guidelines', highlight: true },
    { label: 'AI Recommendation', icon: CheckCheck, desc: 'Grounded action plan' },
    { label: 'Manager Approval', icon: UserCheck, desc: 'Required for sensitive/disputes' },
    { label: 'Follow-up Scheduled', icon: CalendarCheck, desc: 'Smart automated queue' },
    { label: 'Payment Received', icon: CreditCard, desc: 'Reconciled via UTR/NACH' },
    { label: 'Case Closed', icon: ShieldCheck, desc: 'Recovery cycle resolved' },
  ];

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs mb-6 overflow-hidden">
      <div className="px-5 py-3.5 flex items-center justify-between bg-gradient-to-r from-[#242C36] via-[#354352] to-[#516072] text-white">
        <div className="flex items-center gap-2.5">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-300 font-heading">
            Intelligent Recovery Architecture
          </span>
          <span className="text-slate-400 text-xs hidden sm:inline">·</span>
          <span className="text-xs text-slate-200 hidden sm:inline">
            End-to-End Autonomous & Manager-in-the-Loop Recovery Pipeline
          </span>
        </div>

        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-1.5 text-xs text-slate-300 hover:text-white transition-colors cursor-pointer py-1 px-2.5 rounded-md hover:bg-white/10"
        >
          <span>{isExpanded ? 'Hide Pipeline Architecture' : 'View Pipeline Architecture'}</span>
          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Quick compact stepper */}
      <div className="p-4 overflow-x-auto">
        <div className="flex items-center min-w-[920px] justify-between gap-1 text-slate-700">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            return (
              <React.Fragment key={step.label}>
                <div className="flex flex-col items-center text-center group cursor-pointer">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                      step.highlight
                        ? 'bg-[#516072]/15 text-[#516072] ring-2 ring-[#516072]/40 shadow-xs'
                        : 'bg-slate-100 text-slate-600 group-hover:bg-slate-200'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-[11px] font-medium text-slate-700 mt-1.5 whitespace-nowrap">
                    {step.label}
                  </span>
                </div>
                {idx < steps.length - 1 && (
                  <div className="flex-1 h-0.5 bg-slate-200 mx-1 mb-4 shrink-0" />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="px-5 pb-5 pt-2 border-t border-slate-100 bg-slate-50/60">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3 text-xs">
            {steps.map((step, idx) => (
              <div
                key={step.label}
                className={`p-3 rounded-xl border bg-white ${
                  step.highlight ? 'border-purple-200 ring-1 ring-purple-100' : 'border-slate-200/80'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-4 h-4 rounded-full bg-slate-100 text-slate-600 text-[10px] font-semibold flex items-center justify-center">
                    {idx + 1}
                  </span>
                  <span className="font-semibold text-slate-900">{step.label}</span>
                </div>
                <p className="text-slate-500 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
