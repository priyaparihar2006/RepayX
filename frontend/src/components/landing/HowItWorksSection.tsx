import React, { useState } from 'react';
import {
  FileSpreadsheet,
  BrainCircuit,
  Send,
  CheckCheck,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  ChevronRight,
} from 'lucide-react';

export const HowItWorksSection: React.FC = () => {
  const [activeStep, setActiveStep] = useState(0);

  const steps = [
    {
      number: 'STEP 01',
      title: 'Upload Customer Data',
      subtitle: 'Seamless CSV Ingestion',
      description:
        'Import customer records with loan account numbers, overdue EMI values, due dates, and contact channels. Built-in instant CSV validation checks ensure phone and email accuracy before outreach.',
      icon: FileSpreadsheet,
      badge: 'Zero Schema Drift',
      details: [
        'Instant CSV column auto-mapping',
        'Duplicate & invalid mobile sanitization',
        'Direct connection to existing LMS databases',
      ],
      previewSnippet: {
        tag: 'CSV Ingestion Engine',
        content: '61,503 records imported · 100% columns verified',
      },
    },
    {
      number: 'STEP 02',
      title: 'AI-Powered Analysis',
      subtitle: 'Delinquency & Behavioral Scoring',
      description:
        'Machine learning models assess borrower default probability, past repayment patterns, and Days Past Due (DPD) to segment accounts into personalized outreach cadences.',
      icon: BrainCircuit,
      badge: 'Automated Prioritization',
      details: [
        'Risk-tiered recovery prioritization',
        'Optimal contact-hour prediction',
        'Dynamic penal interest waiver calculations',
      ],
      previewSnippet: {
        tag: 'Delinquency Model v2.4',
        content: 'Categorized: 62% Low · 26% Moderate · 12% Critical',
      },
    },
    {
      number: 'STEP 03',
      title: 'Automated Communication',
      subtitle: 'Omnichannel Smart Cadence',
      description:
        'Dispatches contextual reminders across WhatsApp, AI Voice calls, SMS, and Email. Messages feature borrower-specific dynamic UPI QR payment links and vernacular messaging.',
      icon: Send,
      badge: 'TRAI & DLT Compliant',
      details: [
        'WhatsApp Business Cloud templates',
        'Interactive AI conversational voice assistant',
        'One-click Dynamic UPI intent integration',
      ],
      previewSnippet: {
        tag: 'Omnichannel Dispatch',
        content: 'WhatsApp, AI Voice & SMS delivered concurrently',
      },
    },
    {
      number: 'STEP 04',
      title: 'Intelligent Recovery',
      subtitle: 'Automated Reconciliation & Escalation',
      description:
        'Inbound borrower replies are classified by natural language processing (salary delays, dispute claims, payment promises). Unresolved cases automatically progress to manager review.',
      icon: CheckCheck,
      badge: 'Settlement Reconciliation',
      details: [
        'Real-time PTP (Promise to Pay) calendar tracking',
        'Manager sign-off for One-Time Settlement (OTS)',
        'Automatic instant receipt and ledger update',
      ],
      previewSnippet: {
        tag: 'Instant Reconciliation',
        content: '₹12.5L+ recovered with zero executive intervention',
      },
    },
  ];

  return (
    <section id="how-it-works" className="py-20 lg:py-28 bg-[#101D25] text-white relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-1/3 -right-40 w-96 h-96 bg-[#168653]/15 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-10 -left-40 w-96 h-96 bg-[#5DE5A1]/10 rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#142630] border border-[#5DE5A1]/30 text-[#5DE5A1] text-xs font-bold mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Autonomous Recovery Engine</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold font-heading tracking-tight leading-tight">
            How RepayX Transforms{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#5DE5A1] to-emerald-400">
              Loan Recovery
            </span>
          </h2>
          <p className="mt-4 text-sm sm:text-base text-slate-300">
            A battle-tested four-stage automation workflow that recovers loans with institutional compliance, empathy, and speed.
          </p>
        </div>

        {/* 4 Connected Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            const isSelected = activeStep === idx;

            return (
              <div
                key={step.number}
                onClick={() => setActiveStep(idx)}
                className={`group relative rounded-2xl p-6 transition-all duration-300 cursor-pointer border ${
                  isSelected
                    ? 'bg-[#142630] border-[#5DE5A1] shadow-2xl shadow-[#168653]/25 -translate-y-1'
                    : 'bg-[#142630]/60 border-white/10 hover:border-white/30 hover:bg-[#142630]'
                }`}
              >
                {/* Step Pill & Badge */}
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-mono font-bold tracking-wider text-[#5DE5A1] bg-[#168653]/30 px-2.5 py-0.5 rounded-md border border-[#5DE5A1]/20">
                    {step.number}
                  </span>
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 ${
                      isSelected
                        ? 'bg-[#5DE5A1] text-[#101D25]'
                        : 'bg-white/5 text-[#5DE5A1] border border-white/10'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                </div>

                <h3 className="text-lg font-bold font-heading text-white group-hover:text-[#5DE5A1] transition-colors">
                  {step.title}
                </h3>
                <h4 className="text-xs font-semibold text-slate-400 mb-3">
                  {step.subtitle}
                </h4>

                <p className="text-xs text-slate-300 leading-relaxed mb-4">
                  {step.description}
                </p>

                {/* Micro bullets */}
                <ul className="space-y-1.5 pt-3 border-t border-white/10 text-[11px] text-slate-400">
                  {step.details.map((detail, dIdx) => (
                    <li key={dIdx} className="flex items-start gap-1.5">
                      <ChevronRight className="w-3.5 h-3.5 text-[#5DE5A1] shrink-0 mt-0.5" />
                      <span>{detail}</span>
                    </li>
                  ))}
                </ul>

                {/* Interactive Status Indicator */}
                <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-[10px]">
                  <span className="text-slate-400">{step.badge}</span>
                  <span className="text-[#5DE5A1] font-semibold flex items-center gap-1">
                    <span>Inspect</span>
                    <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Selected Step Deep Dive Spotlight Card */}
        <div className="mt-10 p-6 sm:p-8 rounded-2xl bg-[#142630]/90 border border-[#5DE5A1]/30 backdrop-blur-xl shadow-2xl">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-[#5DE5A1] uppercase tracking-wider mb-1">
                <span>Active Stage Focus:</span>
                <span className="font-mono">{steps[activeStep].number}</span>
              </div>
              <h4 className="text-2xl font-bold font-heading text-white">
                {steps[activeStep].title} — {steps[activeStep].subtitle}
              </h4>
              <p className="mt-2 text-sm text-slate-300 max-w-2xl">
                {steps[activeStep].description}
              </p>
            </div>

            <div className="bg-[#101D25] border border-white/10 rounded-xl p-4 sm:p-5 min-w-[280px]">
              <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block mb-1">
                {steps[activeStep].previewSnippet.tag}
              </span>
              <div className="text-xs sm:text-sm font-mono text-[#5DE5A1] font-medium">
                {steps[activeStep].previewSnippet.content}
              </div>
              <div className="mt-3 flex items-center gap-2 text-[11px] text-slate-400">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Enterprise Protocol Verified</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
