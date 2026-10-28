import React from 'react';
import { Info } from 'lucide-react';

/** Marks pages that still run on sample data and are not connected to the RepayX API. */
export const DemoDataNotice: React.FC = () => (
  <div className="max-w-7xl mx-auto mb-4 flex items-start gap-2.5 rounded-full border border-[#FDE68A] bg-[#FEF7EA] px-4 py-2 text-xs text-[#B45309]">
    <Info className="w-3.5 h-3.5 mt-0.5 shrink-0 text-[#D97706]" />
    <p>
      <span className="font-bold">Demo workflow:</span> This page uses sample data and is not connected to the
      RepayX risk API. Names, loans, and conversations shown here are illustrative.
    </p>
  </div>
);
