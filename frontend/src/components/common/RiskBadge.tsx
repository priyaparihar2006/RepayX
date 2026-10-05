import React from 'react';
import type { RiskCategory } from '../../types/api';

const STYLES: Record<RiskCategory, string> = {
  'High Risk': 'bg-rose-50 text-rose-700 border-rose-200',
  'Medium Risk': 'bg-amber-50 text-amber-700 border-amber-200',
  'Low Risk': 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

export const RiskBadge: React.FC<{ category: RiskCategory; className?: string }> = ({ category, className = '' }) => (
  <span
    className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border whitespace-nowrap ${STYLES[category]} ${className}`}
  >
    {category}
  </span>
);
