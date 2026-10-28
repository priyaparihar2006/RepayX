import React from 'react';
import { ShieldCheck } from 'lucide-react';

export const RISK_DISCLAIMER =
  'RepayX provides model-based risk estimates for analytical and demonstration purposes. Risk scores are not ' +
  'guaranteed outcomes and should not be treated as a final lending decision.';

export const Disclaimer: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div
    className={`flex items-start gap-2.5 p-3.5 rounded-2xl bg-[#EDF5E5]/60 border border-[#D1E8BC] text-[#245C35] text-[11px] leading-relaxed shadow-2xs ${className}`}
  >
    <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-[#245C35]" />
    <p>{RISK_DISCLAIMER}</p>
  </div>
);
