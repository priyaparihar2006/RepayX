import React from 'react';
import type { RiskCategory } from '../../types/api';

const STYLES: Record<RiskCategory, string> = {
  'High Risk': 'bg-[#FDF2F4] text-[#BE123C] border-[#FECDD3]',
  'Medium Risk': 'bg-[#FEF7EA] text-[#B45309] border-[#FDE68A]',
  'Low Risk': 'bg-[#EDF5E5] text-[#245C35] border-[#D1E8BC]',
};

export const RiskBadge: React.FC<{ category: RiskCategory; className?: string }> = ({ category, className = '' }) => (
  <span
    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border tracking-wide whitespace-nowrap shadow-2xs ${STYLES[category]} ${className}`}
  >
    {category}
  </span>
);
