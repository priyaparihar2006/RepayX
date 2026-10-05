import React from 'react';
import { AlertTriangle, Inbox, Loader2, RefreshCw, ServerOff, SearchX } from 'lucide-react';
import type { ApiError } from '../../services/api';

export const LoadingState: React.FC<{ label?: string }> = ({ label = 'Loading…' }) => (
  <div role="status" aria-live="polite" className="flex items-center justify-center gap-2 py-16 text-xs text-slate-500">
    <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
    <span>{label}</span>
  </div>
);

const ERROR_TITLES: Record<ApiError['kind'], string> = {
  config: 'API not configured',
  network: 'Backend unavailable',
  timeout: 'Request timed out',
  not_found: 'Not found',
  validation: 'Invalid request',
  unavailable: 'Data unavailable',
  server: 'Something went wrong',
  invalid_response: 'Unexpected response',
};

export const ErrorState: React.FC<{ error: ApiError; onRetry?: () => void; title?: string }> = ({
  error,
  onRetry,
  title,
}) => {
  const Icon = error.kind === 'network' || error.kind === 'unavailable' ? ServerOff
    : error.kind === 'not_found' ? SearchX : AlertTriangle;
  const retryable = onRetry && !['not_found', 'validation', 'config'].includes(error.kind);
  return (
    <div role="alert" className="flex flex-col items-center justify-center text-center gap-3 py-14 px-6">
      <div className="w-10 h-10 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center">
        <Icon className="w-5 h-5 text-rose-600" />
      </div>
      <div>
        <p className="text-sm font-bold text-slate-900">{title ?? ERROR_TITLES[error.kind]}</p>
        <p className="text-xs text-slate-500 mt-1 max-w-md">{error.message}</p>
      </div>
      {retryable && (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Try again
        </button>
      )}
    </div>
  );
};

export const EmptyState: React.FC<{ title: string; message?: string }> = ({ title, message }) => (
  <div className="flex flex-col items-center justify-center text-center gap-2 py-14 px-6">
    <Inbox className="w-6 h-6 text-slate-300" />
    <p className="text-sm font-semibold text-slate-700">{title}</p>
    {message && <p className="text-xs text-slate-500 max-w-md">{message}</p>}
  </div>
);
