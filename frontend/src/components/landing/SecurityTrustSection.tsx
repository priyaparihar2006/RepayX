import React from 'react';
import {
  ShieldCheck,
  Lock,
  UserCheck,
  FileText,
  Clock,
  Eye,
  CheckCircle2,
  AlertCircle,
  Database,
  Fingerprint,
} from 'lucide-react';

export const SecurityTrustSection: React.FC = () => {
  const securityFeatures = [
    {
      icon: UserCheck,
      title: 'Role-Based Access Control (RBAC)',
      description:
        'Granular permissions separating front-line collection agents, risk analysts, and collection managers with segregated access to borrower portfolios and approval authority.',
      tag: 'Access Governance',
    },
    {
      icon: ShieldCheck,
      title: 'Manager Authorization Guardrails',
      description:
        'Sensitive actions—including penal interest waivers, One-Time Settlement (OTS) schemes, and legal notice dispatches—require explicit manager review and approval.',
      tag: 'Two-Tier Verification',
    },
    {
      icon: Clock,
      title: 'Regulatory Contact Window Enforcement',
      description:
        'Hardcoded operating bounds (08:00 to 19:00 IST) restrict automated WhatsApp, SMS, and AI Voice calls, ensuring strict compliance with regulatory guidelines and fair collection practices.',
      tag: 'TRAI & Regulatory Bounds',
    },
    {
      icon: FileText,
      title: 'Tamper-Evident Audit Trails',
      description:
        'Every message dispatched, borrower response received, manager waiver granted, and payment status update is timestamped and recorded in permanent immutable event ledgers.',
      tag: 'Audit Logs',
    },
    {
      icon: Lock,
      title: 'Encrypted Token & API Protection',
      description:
        'Automation endpoints and outbound channel webhooks are gated behind cryptographically strong API keys, keeping institutional credentials isolated per session.',
      tag: 'API Security',
    },
    {
      icon: Eye,
      title: 'Transparent Payment Reconciliation',
      description:
        'Real-time verification against bank UTR references ensures payments and settlements are validated before customer delinquency records are updated.',
      tag: 'Reconciliation',
    },
  ];

  return (
    <section id="security" className="py-20 lg:py-28 bg-[#F5F8F6] text-[#202B25] relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#168653]/10 border border-[#168653]/20 text-[#168653] text-xs font-bold mb-3">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Bank-Grade Governance</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold font-heading text-[#101D25] tracking-tight leading-tight">
            Security, Compliance &{' '}
            <span className="text-[#168653]">Institutional Trust</span>
          </h2>
          <p className="mt-4 text-sm sm:text-base text-[#718078] leading-relaxed">
            RepayX is engineered with defense-in-depth security, strict regulatory compliance windows, and auditable authorization controls designed for leading financial institutions.
          </p>
        </div>

        {/* 6 Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {securityFeatures.map((feat, idx) => {
            const Icon = feat.icon;
            return (
              <div
                key={idx}
                className="bg-white rounded-2xl p-6 border border-[#E5EBE7] shadow-sm hover:shadow-md hover:border-[#168653]/30 transition-all duration-300"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-xl bg-[#EAF6EF] text-[#168653] flex items-center justify-center font-bold">
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                    {feat.tag}
                  </span>
                </div>

                <h3 className="text-base font-bold font-heading text-[#101D25] mb-2">
                  {feat.title}
                </h3>

                <p className="text-xs text-[#718078] leading-relaxed">
                  {feat.description}
                </p>
              </div>
            );
          })}
        </div>

        {/* Institutional Disclosure Box */}
        <div className="mt-12 p-5 rounded-xl bg-white border border-[#E5EBE7] flex items-center gap-4 text-xs text-[#718078]">
          <AlertCircle className="w-5 h-5 text-[#168653] shrink-0" />
          <div>
            <span className="font-bold text-[#101D25]">Institutional Compliance Notice:</span> RepayX complies strictly with Indian Telecommunications regulatory mandates (TRAI DLT registrations) and Fair Recovery Practices. Automated calls or notifications outside approved business windows are strictly blocked by system logic.
          </div>
        </div>
      </div>
    </section>
  );
};
