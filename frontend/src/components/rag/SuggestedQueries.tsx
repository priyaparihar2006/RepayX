import React from 'react';
import { Lightbulb } from 'lucide-react';

export const SUGGESTED_QUERIES = [
  'How many high-risk customers are there?',
  'What is the average late payment rate?',
  'Show customers with unpaid amounts.',
  'What is the risk status of customer 385772?',
  'Which customers have high late-payment rates?',
  'What is the average risk score of pensioners?',
  'Top 5 high risk laborers who pay late',
  'married drivers with higher education',
];

export const SuggestedQueries: React.FC<{ onSelect: (query: string) => void; disabled?: boolean }> = ({ onSelect, disabled }) => (
  <div>
    <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-2">
      <Lightbulb className="w-3.5 h-3.5" /> Suggested questions
    </p>
    <div className="flex flex-wrap gap-2">
      {SUGGESTED_QUERIES.map((q) => (
        <button
          key={q}
          type="button"
          disabled={disabled}
          onClick={() => onSelect(q)}
          className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-700 hover:border-blue-300 hover:bg-blue-50/50 disabled:opacity-50 cursor-pointer text-left"
        >
          {q}
        </button>
      ))}
    </div>
  </div>
);
