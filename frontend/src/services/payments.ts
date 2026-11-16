// Payment API client for Razorpay Integration in RepayX

export interface PaymentSummary {
  total_collected: number;
  successful_payments: number;
  partial_payments: number;
  pending_payments: number;
  failed_payments: number;
  total_links_created: number;
  outstanding_balance: number;
  gateway_mode: 'test' | 'live';
  key_id_preview: string;
}

export interface RazorpayPaymentItem {
  id: string;
  payment_link_id: string;
  short_url: string;
  customer_id: string;
  customer_name: string;
  phone?: string;
  email?: string;
  loan_id: string;
  amount: number;
  amount_paid: number;
  currency: string;
  status: 'created' | 'pending' | 'paid' | 'partially_paid' | 'failed' | 'expired' | 'cancelled';
  description?: string;
  created_at: string;
  updated_at: string;
  gateway_payment_id?: string;
  payment_method?: string;
}

export interface CreatePaymentLinkPayload {
  customer_id: string;
  customer_name: string;
  loan_id: string;
  amount: number;
  phone?: string;
  email?: string;
  description?: string;
  force_new?: boolean;
}

function getBaseUrl(): string {
  const value = import.meta.env.VITE_API_BASE_URL;
  if (!value) {
    if (typeof window !== 'undefined' && window.location) {
      return '';
    }
    return 'https://repayx-backend.onrender.com';
  }
  return value.replace(/\/+$/, '');
}

export const paymentsApi = {
  async getSummary(): Promise<PaymentSummary> {
    const base = getBaseUrl();
    const res = await fetch(`${base}/api/payments/summary`);
    if (!res.ok) {
      throw new Error(`Failed to fetch payment summary: HTTP ${res.status}`);
    }
    const json = await res.json();
    return json.data;
  },

  async getTransactions(status?: string, search?: string): Promise<RazorpayPaymentItem[]> {
    const base = getBaseUrl();
    const params = new URLSearchParams();
    if (status && status !== 'all') params.append('status', status);
    if (search) params.append('search', search);

    const qs = params.toString() ? `?${params.toString()}` : '';
    const res = await fetch(`${base}/api/payments/transactions${qs}`);
    if (!res.ok) {
      throw new Error(`Failed to fetch transactions: HTTP ${res.status}`);
    }
    const json = await res.json();
    return json.data || [];
  },

  async createPaymentLink(payload: CreatePaymentLinkPayload): Promise<RazorpayPaymentItem> {
    const base = getBaseUrl();
    const res = await fetch(`${base}/api/payments/create-link`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Failed to create Razorpay link: ${err}`);
    }
    const json = await res.json();
    return json.data;
  },

  async simulateWebhook(loan_id: string, amount: number, customer_id?: string, is_partial = false) {
    const base = getBaseUrl();
    const res = await fetch(`${base}/api/payments/simulate-webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        loan_id,
        amount,
        customer_id,
        is_partial,
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Failed to simulate webhook: ${err}`);
    }
    return await res.json();
  },
};
