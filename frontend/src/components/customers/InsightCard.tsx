import React from 'react';
import { AlertTriangle, CheckCircle2, Eye, Info, Sparkles } from 'lucide-react';
import type { InsightIndicator, InsightSeverity } from '../../types/api';

// Status meaning is always carried by an icon and a word, never by colour alone.
const SEVERITY: Record<InsightSeverity, { word: string; icon: React.ComponentType<{ className?: string }>; className: string }> = {
  high: { word: 'Concern', icon: AlertTriangle, className: 'text-rose-700 bg-[#FDF2F4] border-rose-200' },
  medium: { word: 'Watch', icon: Eye, className: 'text-[#B45309] bg-[#FEF7EA] border-amber-200' },
  low: { word: 'Positive', icon: CheckCircle2, className: 'text-[#245C35] bg-[#EDF5E5] border-[#D1E8BC]' },
  info: { word: 'Note', icon: Info, className: 'text-[#777E77] bg-[#F5F7F3] border-[#E7EBE3]' },
};

export const InsightCard: React.FC<{ summary: string; indicators: InsightIndicator[] }> = ({ summary, indicators }) => (
  <section className="bg-white rounded-[20px] border border-[#E7EBE3] shadow-fintech-card p-6 transition-all duration-200">
    <div className="flex items-center gap-3">
      <div className="w-9 h-9 rounded-full bg-[#EDF5E5] border border-[#D1E8BC] flex items-center justify-center text-[#245C35]">
        <Sparkles className="w-4 h-4 text-[#245C35]" />
      </div>
      <div>
        <h2 className="text-sm font-bold text-[#171A17]">AI Insight</h2>
        <p className="text-[11px] text-[#777E77]">Generated from this customer's data and the model estimate (rule-based summary)</p>
      </div>
    </div>
    <p className="mt-3.5 text-sm leading-relaxed text-[#171A17] bg-[#F5F7F3] p-3.5 rounded-2xl border border-[#E7EBE3]/70">{summary}</p>

    {indicators.length > 0 && (
      <>
        <h3 className="mt-5 text-[10px] font-semibold uppercase tracking-wider text-[#777E77]">Risk indicators</h3>
        <ul className="mt-2.5 grid grid-cols-1 md:grid-cols-2 gap-2.5">
          {indicators.map((i) => {
            const s = SEVERITY[i.severity];
            const Icon = s.icon;
            return (
              <li key={i.key} className="flex items-start gap-2.5 rounded-2xl border border-[#E7EBE3] bg-white p-3.5 shadow-2xs hover:border-[#D1E8BC] transition-colors">
                <span className={`shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-semibold ${s.className}`}>
                  <Icon className="w-3 h-3" />
                  {s.word}
                </span>
                <div>
                  <p className="text-xs font-semibold text-[#171A17]">{i.label}</p>
                  <p className="text-[11px] text-[#777E77] mt-0.5">{i.detail}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </>
    )}
  </section>
);
