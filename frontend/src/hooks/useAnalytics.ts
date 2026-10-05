import { api } from '../services/api';
import { useApiResource } from './useApiResource';

export function useAnalytics() {
  return useApiResource('analytics', (signal) => api.analytics(signal));
}

export function useHealth() {
  return useApiResource('health', (signal) => api.health(signal));
}
