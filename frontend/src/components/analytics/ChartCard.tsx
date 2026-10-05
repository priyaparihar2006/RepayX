import React, { useState } from 'react';
import { BarChart3, Table2 } from 'lucide-react';

/** Card for a chart with a built-in table view, so values never depend on hover or color alone. */
export const ChartCard: React.FC<{
  title: string;
  subtitle?: string;
  table: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}> = ({ title, subtitle, table, children, footer, className = '' }) => {
  const [showTable, setShowTable] = useState(false);
  return (
    <section className={`bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 flex flex-col ${className}`}>
      <header className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h2 className="text-sm font-bold text-slate-900">{title}</h2>
          {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
        <button
          type="button"
          onClick={() => setShowTable((v) => !v)}
          aria-pressed={showTable}
          className="shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-slate-200 text-[11px] font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
        >
          {showTable ? <BarChart3 className="w-3.5 h-3.5" /> : <Table2 className="w-3.5 h-3.5" />}
          {showTable ? 'Chart' : 'Table'}
        </button>
      </header>
      <div className="flex-1">{showTable ? table : children}</div>
      {footer && <div className="mt-3 text-[11px] text-slate-500">{footer}</div>}
    </section>
  );
};

export const DataTable: React.FC<{ headers: string[]; rows: (string | number)[][] }> = ({ headers, rows }) => (
  <div className="overflow-x-auto">
    <table className="w-full text-xs">
      <thead className="text-[10px] uppercase tracking-wider text-slate-500 border-b border-slate-100">
        <tr>
          {headers.map((h, i) => (
            <th key={h} className={`py-2 px-2 font-semibold ${i === 0 ? 'text-left' : 'text-right'}`}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {rows.map((row, r) => (
          <tr key={r}>
            {row.map((cell, i) => (
              <td key={i} className={`py-2 px-2 ${i === 0 ? 'text-slate-700' : 'text-right font-mono tabular-nums text-slate-800'}`}>{cell}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);
