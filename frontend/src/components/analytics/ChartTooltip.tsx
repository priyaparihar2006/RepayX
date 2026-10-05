import React from 'react';

/** Tooltip body shared by Recharts charts; text uses ink colors, the swatch carries identity. */
export const TooltipBox: React.FC<{ title: string; rows: { label: string; value: string; color?: string }[] }> = ({
  title,
  rows,
}) => (
  <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-lg text-xs">
    <p className="font-semibold text-slate-900 mb-1">{title}</p>
    {rows.map((r) => (
      <p key={r.label} className="flex items-center gap-1.5 text-slate-600">
        {r.color && <span aria-hidden className="w-2 h-2 rounded-sm" style={{ backgroundColor: r.color }} />}
        <span>{r.label}:</span>
        <span className="font-semibold text-slate-900 tabular-nums">{r.value}</span>
      </p>
    ))}
  </div>
);
