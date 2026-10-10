import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError, api } from '../services/api';
import type { QueryResponse } from '../types/api';

type QueryState =
  | { status: 'idle'; data: undefined; error: undefined }
  | { status: 'loading'; data: undefined; error: undefined }
  | { status: 'success'; data: QueryResponse; error: undefined; completedAt: number }
  | { status: 'error'; data: undefined; error: ApiError };

/** Submits natural-language questions to POST /api/query. A new question cancels the previous one. */
export function useRepayxQuery() {
  const [state, setState] = useState<QueryState>({ status: 'idle', data: undefined, error: undefined });
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => () => controllerRef.current?.abort(), []);

  const ask = useCallback(async (query: string) => {
    const text = query.trim();
    if (!text) {
      setState({ status: 'error', data: undefined, error: new ApiError('validation', 'Please enter a question.') });
      return;
    }
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setState({ status: 'loading', data: undefined, error: undefined });
    try {
      const data = await api.query(text, controller.signal);
      if (!controller.signal.aborted) setState({ status: 'success', data, error: undefined, completedAt: Date.now() });
    } catch (err) {
      if (controller.signal.aborted) return;
      const error = err instanceof ApiError ? err : new ApiError('invalid_response', 'Something went wrong.');
      setState({ status: 'error', data: undefined, error });
    }
  }, []);

  const reset = useCallback(() => {
    controllerRef.current?.abort();
    setState({ status: 'idle', data: undefined, error: undefined });
  }, []);

  return { ...state, ask, reset };
}
