import React from 'react';
import { ArrowUp, Loader2 } from 'lucide-react';

export const MAX_QUERY_LENGTH = 500;

/** Question box: Enter submits, Shift+Enter adds a line. Mirrors the backend's 1-500 character rule. */
export const QueryInput: React.FC<{
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  loading: boolean;
}> = ({ value, onChange, onSubmit, loading }) => {
  const tooLong = value.length > MAX_QUERY_LENGTH;
  const empty = value.trim().length === 0;
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!empty && !tooLong && !loading) onSubmit();
      }}
      className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-3 focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-400"
    >
      <label htmlFor="repayx-query" className="sr-only">Ask a question about the loan portfolio</label>
      <textarea
        id="repayx-query"
        rows={2}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (!empty && !tooLong && !loading) onSubmit();
          }
        }}
        placeholder="e.g. Which customers frequently pay late?"
        aria-invalid={tooLong}
        className="w-full resize-none bg-transparent px-2 py-1.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none"
      />
      <div className="flex items-center justify-between gap-3 px-2">
        <span className={`text-[11px] ${tooLong ? 'text-rose-600 font-semibold' : 'text-slate-400'}`}>
          {tooLong ? `Questions are limited to ${MAX_QUERY_LENGTH} characters.` : `${value.length}/${MAX_QUERY_LENGTH}`}
        </span>
        <button
          type="submit"
          disabled={empty || tooLong || loading}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowUp className="w-3.5 h-3.5" />}
          Ask RepayX
        </button>
      </div>
    </form>
  );
};
