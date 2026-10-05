import React from 'react';

/** Stat tile: label, headline value, optional context line, and an optional colored key mark. */
export const MetricCard: React.FC<{
  label: string;
  value: string;
  detail?: React.ReactNode;
  keyColor?: string;
  icon?: React.ComponentType<{ className?: string }>;
}> = ({ label, value, detail, keyColor, icon: Icon }) => (
  <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5">
    <div className="flex items-center justify-between gap-2">
      <p className="text-xs font-medium text-slate-500 flex items-center gap-2">
        {keyColor && <span aria-hidden className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: keyColor }} />}
        {label}
      </p>
      {Icon && <Icon className="w-4 h-4 text-slate-400" />}
    </div>
    <p className="mt-2 text-2xl font-semibold text-slate-900 tracking-tight">{value}</p>
    {detail && <p className="mt-1 text-[11px] text-slate-500">{detail}</p>}
  </div>
);
