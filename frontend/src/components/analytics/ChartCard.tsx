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
    <section className={`bg-white rounded-[20px] border border-[#E7EBE3] shadow-fintech p-5 sm:p-6 flex flex-col ${className}`}>
      <header className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h2 className="text-sm sm:text-base font-bold text-[#171A17] font-heading">{title}</h2>
          {subtitle && <p className="text-xs text-[#777E77] mt-0.5">{subtitle}</p>}
        </div>
        <button
          type="button"
          onClick={() => setShowTable((v) => !v)}
          aria-pressed={showTable}
          className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#E7EBE3] bg-[#F5F7F3] hover:bg-[#EDF5E5] hover:text-[#245C35] hover:border-[#D5DCD0] text-[11px] font-semibold text-[#171A17] transition-all cursor-pointer shadow-2xs"
        >
          {showTable ? <BarChart3 className="w-3.5 h-3.5 text-[#245C35]" /> : <Table2 className="w-3.5 h-3.5 text-[#245C35]" />}
          {showTable ? 'Chart' : 'Table'}
        </button>
      </header>
      <div className="flex-1">{showTable ? table : children}</div>
      {footer && <div className="mt-3.5 pt-2.5 border-t border-[#F5F7F3] text-[11px] text-[#777E77]">{footer}</div>}
    </section>
  );
};

export const DataTable: React.FC<{ headers: string[]; rows: (string | number)[][] }> = ({ headers, rows }) => (
  <div className="overflow-x-auto rounded-xl border border-[#E7EBE3]">
    <table className="w-full text-xs">
      <thead className="text-[10px] uppercase tracking-wider text-[#777E77] bg-[#F5F7F3] border-b border-[#E7EBE3]">
        <tr>
          {headers.map((h, i) => (
            <th key={h} className={`py-2.5 px-3 font-semibold ${i === 0 ? 'text-left' : 'text-right'}`}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-[#E7EBE3] bg-white">
        {rows.map((row, r) => (
          <tr key={r} className="hover:bg-[#F5F7F3]/70 transition-colors">
            {row.map((cell, i) => (
              <td key={i} className={`py-2 px-3 ${i === 0 ? 'text-[#171A17] font-medium' : 'text-right font-mono tabular-nums text-[#171A17]'}`}>{cell}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);
