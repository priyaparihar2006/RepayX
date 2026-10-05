import React from 'react';
import { AlertTriangle, CheckCircle2, Eye, Info, Sparkles } from 'lucide-react';
import type { InsightIndicator, InsightSeverity } from '../../types/api';

// Status meaning is always carried by an icon and a word, never by colour alone.
const SEVERITY: Record<InsightSeverity, { word: string; icon: React.ComponentType<{ className?: string }>; className: string }> = {
  high: { word: 'Concern', icon: AlertTriangle, className: 'text-red-700 bg-red-50 border-red-200' },
  medium: { word: 'Watch', icon: Eye, className: 'text-amber-800 bg-amber-50 border-amber-200' },
  low: { word: 'Positive', icon: CheckCircle2, className: 'text-green-800 bg-green-50 border-green-200' },
  info: { word: 'Note', icon: Info, className: 'text-slate-700 bg-slate-50 border-slate-200' },
};

export const InsightCard: React.FC<{ summary: string; indicators: InsightIndicator[] }> = ({ summary, indicators }) => (
  <section className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5">
    <div className="flex items-center gap-2">
      <div className="w-7 h-7 rounded-lg bg-purple-50 border border-purple-100 flex items-center justify-center">
        <Sparkles className="w-4 h-4 text-purple-600" />
      </div>
      <div>
        <h2 className="text-sm font-bold text-slate-900">AI Insight</h2>
        <p className="text-[11px] text-slate-500">Generated from this customer's data and the model estimate (rule-based summary)</p>
      </div>
    </div>
    <p className="mt-3 text-sm leading-relaxed text-slate-800">{summary}</p>

    {indicators.length > 0 && (
      <>
        <h3 className="mt-4 text-[10px] font-semibold uppercase tracking-wider text-slate-500">Risk indicators</h3>
        <ul className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
          {indicators.map((i) => {
            const s = SEVERITY[i.severity];
            const Icon = s.icon;
            return (
              <li key={i.key} className="flex items-start gap-2.5 rounded-xl border border-slate-100 bg-slate-50/50 p-3">
                <span className={`shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-semibold ${s.className}`}>
                  <Icon className="w-3 h-3" />
                  {s.word}
                </span>
                <div>
                  <p className="text-xs font-semibold text-slate-900">{i.label}</p>
                  <p className="text-[11px] text-slate-600 mt-0.5">{i.detail}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </>
    )}
  </section>
);
