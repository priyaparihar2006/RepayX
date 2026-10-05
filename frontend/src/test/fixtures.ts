// Small API payloads in the backend's response shapes, used by the frontend tests.
import type {
  AnalyticsResponse,
  CustomerListResponse,
  CustomerResponse,
  CustomerSummary,
  QueryResponse,
} from '../types/api';

export const MODEL_VERSION = 'test-model-1';

export const summary = (id: number, score: number, overrides: Partial<CustomerSummary> = {}): CustomerSummary => ({
  customer_id: id,
  risk_score: score,
  default_probability: score,
  risk_category: score >= 60 ? 'High Risk' : score >= 30 ? 'Medium Risk' : 'Low Risk',
  predicted_default: score >= 65 ? 1 : 0,
  late_payment_rate: 10,
  total_unpaid_amount: 0,
  payment_ratio: 1,
  ...overrides,
});

export const customerList = (customers: CustomerSummary[], total = customers.length, page = 1, pageSize = 25): CustomerListResponse => ({
  success: true,
  model_version: MODEL_VERSION,
  customers,
  pagination: { page, page_size: pageSize, total, total_pages: Math.ceil(total / pageSize) },
});

export const customer385772: CustomerResponse = {
  success: true,
  model_version: MODEL_VERSION,
  customer: {
    ...summary(385772, 80.13, { late_payment_rate: 100, total_unpaid_amount: 0.22, payment_ratio: 1 }),
    annual_income: 135000,
    credit_amount: 668304,
    annuity_amount: 28444.5,
    income_type: 'Working',
    education: 'Lower secondary',
    family_status: 'Married',
    occupation: 'Laborers',
    has_installment_history: true,
    installment_count: 3,
    late_payment_count: 3,
    avg_days_late: 4.33,
    max_days_late: 6,
    underpaid_count: 1,
    underpaid_rate: 33.33,
    total_installment_amount: 14010.39,
    total_payment_amount: 14010.17,
  },
  insight: {
    summary:
      'Customer 385772 has a high estimated default risk (80.13%, at or above the 65% classification threshold) ' +
      'and a 100.00% late-payment rate across 3 recorded installments (portfolio average 8.52%).',
    indicators: [
      { key: 'predicted_default', severity: 'high', label: 'Predicted default', detail: 'Meets the classification threshold.' },
      { key: 'underpaid', severity: 'medium', label: 'Underpaid installments', detail: '1 underpaid, 0.22 unpaid in total.' },
    ],
  },
  benchmarks: {
    risk_score: 41.83, default_probability: 41.83, late_payment_rate: 8.52, avg_days_late: 1.33,
    underpaid_rate: 0.07, payment_ratio: 1.03, total_unpaid_amount: 202.37, installment_count: 40.1,
  },
  classification_threshold: 0.65,
};

export const customerWithoutHistory: CustomerResponse = {
  ...customer385772,
  customer: {
    ...customer385772.customer,
    customer_id: 456187,
    risk_score: 34.53,
    default_probability: 34.53,
    risk_category: 'Medium Risk',
    predicted_default: 0,
    has_installment_history: false,
    installment_count: null, late_payment_count: null, late_payment_rate: null, avg_days_late: null, max_days_late: null,
    underpaid_count: null, underpaid_rate: null, total_unpaid_amount: null, payment_ratio: null,
    total_installment_amount: null, total_payment_amount: null,
  },
  insight: {
    summary: 'Customer 456187 has a medium estimated default risk (34.53%, below the 65% classification threshold). No installment history is available, so repayment behaviour cannot be assessed.',
    indicators: [{ key: 'no_history', severity: 'info', label: 'No installment history', detail: 'Repayment behaviour cannot be assessed.' }],
  },
};

const segment = (name: string, customers: number, score: number, share: number, late: number) => ({
  segment: name, customers, average_risk_score: score, high_risk_share: share, average_late_payment_rate: late,
});

export const analytics: AnalyticsResponse = {
  success: true,
  model_version: MODEL_VERSION,
  portfolio: {
    total_customers: 61503,
    risk_categories: [
      { risk_category: 'Low Risk', customers: 20465, share: 33.27 },
      { risk_category: 'Medium Risk', customers: 28392, share: 46.16 },
      { risk_category: 'High Risk', customers: 12646, share: 20.56 },
    ],
    average_risk_score: 41.83,
    median_risk_score: 39.25,
    average_default_probability: 41.83,
    predicted_defaults: 9523,
    predicted_default_share: 15.48,
  },
  repayment: {
    customers_with_history: 58321,
    customers_without_history: 3182,
    average_late_payment_rate: 8.52,
    customers_with_late_payments: 30946,
    customers_with_late_payments_share: 53.06,
    customers_always_late: 52,
    average_days_late: 1.33,
    average_underpaid_rate: 0.07,
    customers_with_unpaid_amounts: 621,
    total_unpaid_amount: 11802525.3,
    average_payment_ratio: 1.03,
  },
  risk_score_histogram: [1240, 7886, 11339, 11125, 9541, 7726, 5762, 4225, 2232, 427].map((n, i) => ({
    range: `${i * 10}-${i * 10 + 10}`, min: i * 10, max: i * 10 + 10, customers: n,
  })),
  late_payment_rate_buckets: [
    { bucket: '0% (always on time)', customers: 27372 }, { bucket: '0-10%', customers: 15096 },
    { bucket: '10-25%', customers: 9831 }, { bucket: '25-50%', customers: 4709 },
    { bucket: '50-<100%', customers: 1258 }, { bucket: '100% (always late)', customers: 52 },
    { bucket: 'Unknown', customers: 3185 },
  ],
  segments: {
    income_type: [segment('Working', 31731, 46.17, 26.73, 8.52), segment('Pensioner', 11228, 34.34, 8.77, 8.18)],
    education: [segment('Higher education', 15061, 32.93, 9.95, 8.0)],
    occupation: [segment('Laborers', 10927, 48.95, 30.97, 8.47)],
  },
  model: {
    model_version: MODEL_VERSION,
    classification_threshold: 0.65,
    risk_band_medium_from: 30,
    risk_band_high_from: 60,
    risk_band_note: 'Prototype presentation bands.',
    evaluation: { roc_auc: 75.34, accuracy: 83.45, precision: 22.63, recall: 43.4, f1: 29.75, holdout_customers: 61503, note: 'Prototype evaluation.' },
  },
  disclaimer: 'RepayX provides model-based risk estimates for analytical and demonstration purposes.',
};

export const queryAnswers: Record<string, QueryResponse> = {
  'How many high-risk customers are there?': {
    success: true, query: 'How many high-risk customers are there?', query_type: 'aggregate_query', model_version: MODEL_VERSION,
    result: 'There are 12,646 High Risk customers, 20.56% of the 61,503 scored customers.',
    metrics: [
      { name: 'customer_count', label: 'Number of High Risk customers', value: 12646, unit: 'count', population: 61503 },
      { name: 'share_of_portfolio', label: 'Share of portfolio', value: 20.56, unit: 'percent', population: 61503 },
    ],
  },
  'Which customers frequently pay late?': {
    success: true, query: 'Which customers frequently pay late?', query_type: 'retrieval_query', model_version: MODEL_VERSION,
    result: 'Found 30,946 customers with at least one late payment. Showing the top 2, sorted by late payment rate, then average days late.',
    customers: [
      { ...summary(110232, 66.78, { late_payment_rate: 100 }), installment_count: 1, late_payment_count: 1, avg_days_late: 12 },
      { ...summary(385772, 80.13, { late_payment_rate: 100 }), installment_count: 3, late_payment_count: 3, avg_days_late: 4.33 },
    ],
    total_matches: 30946,
    criteria: 'customers with at least one late payment, sorted by late payment rate, then average days late',
  },
  'What is the risk status of customer 385772?': {
    success: true, query: 'What is the risk status of customer 385772?', query_type: 'customer_query', model_version: MODEL_VERSION,
    result: 'Customer 385772 is High Risk with a risk score of 80.13/100 (estimated default probability 80.13%).',
    customer: customer385772.customer,
  },
};
