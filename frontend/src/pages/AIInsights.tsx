import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';
import { History, Sparkles } from 'lucide-react';
import { useRepayxQuery } from '../hooks/useQuery';
import { QueryInput } from '../components/rag/QueryInput';
import { SuggestedQueries } from '../components/rag/SuggestedQueries';
import { QueryResponse } from '../components/rag/QueryResponse';
import { ErrorState, LoadingState } from '../components/common/RequestState';
import { Disclaimer } from '../components/common/Disclaimer';

const MAX_HISTORY = 8;

/**
 * Natural-language questions answered by POST /api/query. The question lives in the URL (?q=)
 * so answers can be shared and the back button steps through previous questions.
 */
export const AIInsightsPage: React.FC = () => {
  const [params, setParams] = useSearchParams();
  const urlQuery = params.get('q') ?? '';
  const [draft, setDraft] = useState(urlQuery);
  const [history, setHistory] = useState<string[]>([]);
  const query = useRepayxQuery();
  const { ask, reset } = query;

  // Run whenever the question in the URL changes (submit, suggestion, history, back/forward).
  useEffect(() => {
    setDraft(urlQuery);
    if (!urlQuery.trim()) {
      reset();
      return;
    }
    void ask(urlQuery);
    setHistory((prev) => [urlQuery, ...prev.filter((q) => q !== urlQuery)].slice(0, MAX_HISTORY));
  }, [urlQuery, ask, reset]);

  const submit = (text: string) => {
    const q = text.trim();
    if (!q) return;
    if (q === urlQuery) void ask(q); // same question again: re-run
    else setParams({ q });
  };

  const loading = query.status === 'loading';

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center shrink-0">
          <Sparkles className="w-5 h-5 text-purple-600" />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">RepayX AI Intelligence</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Ask anything about your loan portfolio. Numbers are calculated from the scored customer data; descriptive
            questions use TF-IDF text retrieval. No language model generates the answers.
          </p>
        </div>
      </div>

      <QueryInput value={draft} onChange={setDraft} onSubmit={() => submit(draft)} loading={loading} />
      <SuggestedQueries onSelect={submit} disabled={loading} />

      {query.status === 'loading' && !query.data && (
        <div className="bg-white rounded-2xl border border-slate-200/80"><LoadingState label="Working out the answer…" /></div>
      )}
      {query.status === 'error' && (
        <div className="bg-white rounded-2xl border border-slate-200/80">
          <ErrorState error={query.error} onRetry={() => submit(urlQuery || draft)} />
        </div>
      )}
      {query.data && (
        <div className={loading ? 'opacity-60 transition-opacity' : ''}>
          <QueryResponse result={query.data} />
        </div>
      )}

      {history.length > 1 && (
        <section>
          <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-2">
            <History className="w-3.5 h-3.5" /> Recent questions
          </p>
          <ul className="flex flex-wrap gap-2">
            {history.slice(1).map((q) => (
              <li key={q}>
                <button
                  type="button"
                  onClick={() => submit(q)}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs text-slate-700 cursor-pointer text-left"
                >
                  {q}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <Disclaimer />
    </div>
  );
};
