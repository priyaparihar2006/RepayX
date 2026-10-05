import React from 'react';

export const RISK_DISCLAIMER =
  'RepayX provides model-based risk estimates for analytical and demonstration purposes. Risk scores are not ' +
  'guaranteed outcomes and should not be treated as a final lending decision.';

export const Disclaimer: React.FC<{ className?: string }> = ({ className = '' }) => (
  <p className={`text-[11px] leading-relaxed text-slate-400 ${className}`}>{RISK_DISCLAIMER}</p>
);
