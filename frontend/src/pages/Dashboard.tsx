import React from 'react';
import { useAnalytics } from '../hooks/useAnalytics';
import type { AnalyticsResponse } from '../types/api';
import { ErrorState, LoadingState } from '../components/common/RequestState';
import { Disclaimer } from '../components/common/Disclaimer';
import { NeoFintechDashboard } from '../components/dashboard/NeoFintechDashboard';

/** Loads /api/analytics once and renders loading / error states around a page body. */
export const AnalyticsPage: React.FC<{
  title: string;
  description: string;
  children: (data: AnalyticsResponse) => React.ReactNode;
}> = ({ title, description, children }) => {
  const result = useAnalytics();
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-2">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">{title}</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">{description}</p>
        </div>
        {result.data?.model_version && (
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                result.isFallback
                  ? 'bg-amber-50 text-amber-800 border border-amber-200'
                  : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  result.isFallback ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'
                }`}
              />
              {result.isFallback ? '⚡ Warming Cloud API...' : 'Live Engine Connected'}
            </span>
            <p className="text-[11px] text-slate-400">
              Scored by <span className="font-mono">{result.data.model_version}</span>
            </p>
          </div>
        )}
      </div>
      {result.status === 'error' && !result.data ? (
        <div className="bg-white rounded-2xl border border-slate-200/80">
          <ErrorState error={result.error} onRetry={result.reload} />
        </div>
      ) : !result.data ? (
        <div className="bg-white rounded-2xl border border-slate-200/80">
          <LoadingState label="Loading portfolio analytics…" />
        </div>
      ) : (
        children(result.data)
      )}
      <Disclaimer />
    </div>
  );
};

/** Primary executive view: Neo-Fintech Dashboard with real-time portfolio integration */
export const DashboardPage: React.FC = () => {
  const result = useAnalytics();

  return (
    <div className="-m-3.5 sm:-m-6 lg:-m-8">
      {result.status === 'error' && !result.data ? (
        <div className="p-6 max-w-7xl mx-auto">
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6">
            <ErrorState error={result.error} onRetry={result.reload} />
          </div>
        </div>
      ) : !result.data ? (
        <div className="p-6 max-w-7xl mx-auto">
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6">
            <LoadingState label="Loading portfolio command center…" />
          </div>
        </div>
      ) : (
        <NeoFintechDashboard analyticsData={result.data} />
      )}

      <div className="max-w-7xl mx-auto px-4 py-6">
        <Disclaimer />
      </div>
    </div>
  );
};

export default DashboardPage;
