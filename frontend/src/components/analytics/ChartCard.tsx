import React, { useState, useRef, useCallback } from 'react';
import { BarChart3, Table2 } from 'lucide-react';

/** Card for a chart with a built-in table view, subtle interactive 3D depth, and full accessible fallback. */
export const ChartCard: React.FC<{
  title: string;
  subtitle?: string;
  table: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  enable3DTilt?: boolean;
}> = ({ title, subtitle, table, children, footer, className = '', enable3DTilt = true }) => {
  const [showTable, setShowTable] = useState(false);
  const cardRef = useRef<HTMLElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLElement>) => {
    if (!enable3DTilt || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    // Micro 3D tilt: max 2.5 degrees for subtle, non-distracting depth
    const rotateY = ((x - centerX) / centerX) * 2.5;
    const rotateX = -((y - centerY) / centerY) * 2.5;
    setTilt({ x: rotateX, y: rotateY });
  }, [enable3DTilt]);

  const handleMouseEnter = useCallback(() => {
    if (enable3DTilt) setIsHovered(true);
  }, [enable3DTilt]);

  const handleMouseLeave = useCallback(() => {
    if (enable3DTilt) {
      setIsHovered(false);
      setTilt({ x: 0, y: 0 });
    }
  }, [enable3DTilt]);

  return (
    <section
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        transform: isHovered
          ? `perspective(1000px) rotateX(${tilt.x.toFixed(2)}deg) rotateY(${tilt.y.toFixed(2)}deg) translateZ(3px)`
          : 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateZ(0px)',
        transition: isHovered ? 'transform 0.08s ease-out' : 'transform 0.4s ease-out, box-shadow 0.3s ease',
      }}
      className={`bg-white rounded-[20px] border border-[#E7EBE3] shadow-fintech p-5 sm:p-6 flex flex-col hover:shadow-fintech-card transition-shadow ${className}`}
    >
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
      <div className="flex-1 flex flex-col min-h-0">{showTable ? table : children}</div>
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
