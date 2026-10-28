import React from 'react';
import { AlertTriangle, Inbox, Loader2, RefreshCw, ServerOff, SearchX } from 'lucide-react';
import type { ApiError } from '../../services/api';

export const LoadingState: React.FC<{ label?: string }> = ({ label = 'Loading…' }) => (
  <div role="status" aria-live="polite" className="flex items-center justify-center gap-2.5 py-16 text-xs text-[#777E77]">
    <Loader2 className="w-5 h-5 animate-spin text-[#245C35]" />
    <span className="font-medium">{label}</span>
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
      <div className="w-11 h-11 rounded-full bg-[#FDF2F4] border border-rose-200 flex items-center justify-center">
        <Icon className="w-5 h-5 text-rose-600" />
      </div>
      <div>
        <p className="text-sm font-bold text-[#171A17]">{title ?? ERROR_TITLES[error.kind]}</p>
        <p className="text-xs text-[#777E77] mt-1 max-w-md">{error.message}</p>
      </div>
      {retryable && (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#EDF5E5] hover:bg-[#D1E8BC] text-[#245C35] text-xs font-semibold cursor-pointer transition-colors shadow-2xs"
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
    <Inbox className="w-7 h-7 text-[#777E77]/50" />
    <p className="text-sm font-bold text-[#171A17]">{title}</p>
    {message && <p className="text-xs text-[#777E77] max-w-md">{message}</p>}
  </div>
);
