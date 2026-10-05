import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError } from '../services/api';

export type ResourceState<T> =
  | { status: 'loading'; data: T | undefined; error: undefined }
  | { status: 'success'; data: T; error: undefined }
  | { status: 'error'; data: T | undefined; error: ApiError };

/**
 * Runs `fetcher` whenever `key` changes, cancelling the previous request.
 * While reloading, the previous data stays available so tables don't flash empty.
 */
export function useApiResource<T>(
  key: string | null,
  fetcher: (signal: AbortSignal) => Promise<T>,
): ResourceState<T> & { reload: () => void } {
  const [state, setState] = useState<ResourceState<T>>({ status: 'loading', data: undefined, error: undefined });
  const [attempt, setAttempt] = useState(0);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  useEffect(() => {
    if (key === null) return;
    const controller = new AbortController();
    setState((prev) => ({ status: 'loading', data: prev.data, error: undefined }));
    fetcherRef
      .current(controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setState({ status: 'success', data, error: undefined });
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        const error = err instanceof ApiError
          ? err
          : new ApiError('invalid_response', 'Something went wrong while loading data.');
        setState((prev) => ({ status: 'error', data: prev.data, error }));
      });
    return () => controller.abort();
  }, [key, attempt]);

  const reload = useCallback(() => setAttempt((n) => n + 1), []);
  return { ...state, reload };
}
