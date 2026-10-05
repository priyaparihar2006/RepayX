import React from 'react';
import { Info } from 'lucide-react';

/** Marks pages that still run on sample data and are not connected to the RepayX API. */
export const DemoDataNotice: React.FC = () => (
  <div className="max-w-7xl mx-auto mb-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs text-amber-800">
    <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
    <p>
      <span className="font-semibold">Demo workflow.</span> This page uses sample data and is not connected to the
      RepayX risk API. Names, loans, and conversations shown here are illustrative.
    </p>
  </div>
);
