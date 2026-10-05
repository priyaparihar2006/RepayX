import React from 'react';
import type { RiskCategory } from '../../types/api';

// Same hues as the risk chart colors (lib/chartTheme.ts); the text label carries the meaning.
const STYLES: Record<RiskCategory, string> = {
  'High Risk': 'bg-red-50 text-red-800 border-red-200',
  'Medium Risk': 'bg-amber-50 text-amber-800 border-amber-200',
  'Low Risk': 'bg-blue-50 text-blue-800 border-blue-200',
};

export const RiskBadge: React.FC<{ category: RiskCategory; className?: string }> = ({ category, className = '' }) => (
  <span
    className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border whitespace-nowrap ${STYLES[category]} ${className}`}
  >
    {category}
  </span>
);
