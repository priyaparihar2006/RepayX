import { api } from '../services/api';
import { useApiResource } from './useApiResource';
import { FALLBACK_ANALYTICS } from '../data/fallbackAnalytics';

export function useAnalytics() {
  const resource = useApiResource('analytics', (signal) => api.analytics(signal));
  const data = resource.data ?? FALLBACK_ANALYTICS;
  const isFallback = !resource.data && resource.status !== 'success';
  return {
    ...resource,
    data,
    isFallback,
  };
}

export function useHealth() {
  return useApiResource('health', (signal) => api.health(signal));
}
