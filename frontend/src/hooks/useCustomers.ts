import { api } from '../services/api';
import type { CustomerListParams } from '../types/api';
import { useApiResource } from './useApiResource';

export function useCustomers(params: CustomerListParams) {
  const key = JSON.stringify(params);
  return useApiResource(key, (signal) => api.customers(params, signal));
}

/** Loads one customer. Pass null for an invalid ID to skip the request. */
export function useCustomer(customerId: number | null) {
  return useApiResource(customerId === null ? null : String(customerId), (signal) => api.customer(customerId!, signal));
}
