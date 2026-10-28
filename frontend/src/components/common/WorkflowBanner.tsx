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
    <div className="bg-white rounded-[20px] border border-[#E7EBE3] shadow-fintech-card mb-6 overflow-hidden transition-all duration-200">
      <div className="px-5 py-3.5 flex items-center justify-between bg-[#245C35] text-white">
        <div className="flex items-center gap-2.5">
          <div className="w-2 h-2 rounded-full bg-[#B5F078] animate-pulse" />
          <span className="text-xs font-bold uppercase tracking-wider text-[#B5F078] font-heading">
            Intelligent Recovery Architecture
          </span>
          <span className="text-white/40 text-xs hidden sm:inline">·</span>
          <span className="text-xs text-white/90 hidden sm:inline">
            End-to-End Autonomous & Manager-in-the-Loop Recovery Pipeline
          </span>
        </div>

        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-1.5 text-xs text-white/90 hover:text-white transition-colors cursor-pointer py-1 px-3 rounded-full hover:bg-white/10"
        >
          <span>{isExpanded ? 'Hide Pipeline Architecture' : 'View Pipeline Architecture'}</span>
          {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-[#B5F078]" /> : <ChevronDown className="w-3.5 h-3.5 text-[#B5F078]" />}
        </button>
      </div>

      {/* Quick compact stepper */}
      <div className="p-4 overflow-x-auto">
        <div className="flex items-center min-w-[920px] justify-between gap-1 text-[#171A17]">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            return (
              <React.Fragment key={step.label}>
                <div className="flex flex-col items-center text-center group cursor-pointer">
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                      step.highlight
                        ? 'bg-[#EDF5E5] text-[#245C35] ring-2 ring-[#B5F078] shadow-xs'
                        : 'bg-[#F5F7F3] text-[#777E77] group-hover:bg-[#EDF5E5] group-hover:text-[#245C35]'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-[11px] font-medium text-[#171A17] mt-1.5 whitespace-nowrap">
                    {step.label}
                  </span>
                </div>
                {idx < steps.length - 1 && (
                  <div className="flex-1 h-0.5 bg-[#E7EBE3] mx-1 mb-4 shrink-0" />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="px-5 pb-5 pt-3 border-t border-[#E7EBE3] bg-[#F5F7F3]/60">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3 text-xs">
            {steps.map((step, idx) => (
              <div
                key={step.label}
                className={`p-3.5 rounded-2xl border bg-white shadow-2xs ${
                  step.highlight ? 'border-[#D1E8BC] ring-1 ring-[#B5F078]' : 'border-[#E7EBE3]'
                }`}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="w-5 h-5 rounded-full bg-[#EDF5E5] text-[#245C35] text-[10px] font-bold flex items-center justify-center">
                    {idx + 1}
                  </span>
                  <span className="font-bold text-[#171A17]">{step.label}</span>
                </div>
                <p className="text-[#777E77] leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
