// Types for the RepayX FastAPI backend. These mirror backend/models/schemas.py.
// Units: default_probability, late_payment_rate and underpaid_rate are percentages (0-100);
// risk_score is 0-100; payment_ratio is paid / due (1.0 = paid in full).
// Repayment fields are null for customers without installment history.

export type RiskCategory = 'Low Risk' | 'Medium Risk' | 'High Risk';
export const RISK_CATEGORIES: RiskCategory[] = ['Low Risk', 'Medium Risk', 'High Risk'];

export type ResourceState = 'available' | 'missing' | 'invalid';

export interface HealthResponse {
  success: true;
  status: 'ok' | 'degraded';
  version: string;
  model_version: string | null;
  resources: {
    customer_data: ResourceState;
    model: ResourceState;
    tfidf_vectorizer: ResourceState;
    tfidf_matrix: ResourceState;
  };
}

export interface CustomerSummary {
  customer_id: number;
  risk_score: number;
  default_probability: number;
  risk_category: RiskCategory;
  predicted_default: 0 | 1;
  late_payment_rate: number | null;
  total_unpaid_amount: number | null;
  payment_ratio: number | null;
}

export interface CustomerDetail extends CustomerSummary {
  annual_income: number | null;
  credit_amount: number | null;
  annuity_amount: number | null;
  income_type: string | null;
  education: string | null;
  family_status: string | null;
  occupation: string | null;
  has_installment_history: boolean;
  installment_count: number | null;
  late_payment_count: number | null;
  avg_days_late: number | null;
  max_days_late: number | null;
  underpaid_count: number | null;
  underpaid_rate: number | null;
  total_installment_amount: number | null;
  total_payment_amount: number | null;
}

export interface CustomerResponse {
  success: true;
  model_version: string | null;
  customer: CustomerDetail;
}

export type CustomerSortField =
  | 'customer_id'
  | 'risk_score'
  | 'default_probability'
  | 'late_payment_rate'
  | 'total_unpaid_amount'
  | 'payment_ratio';
export type SortOrder = 'asc' | 'desc';

export interface CustomerListParams {
  page?: number;
  page_size?: number;
  risk_category?: RiskCategory;
  search?: string;
  sort_by?: CustomerSortField;
  sort_order?: SortOrder;
}

export interface Pagination {
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
}

export interface CustomerListResponse {
  success: true;
  model_version: string | null;
  customers: CustomerSummary[];
  pagination: Pagination;
}

export interface RiskCategoryCount {
  risk_category: RiskCategory;
  customers: number;
  share: number;
}

export interface Segment {
  segment: string;
  customers: number;
  average_risk_score: number;
  high_risk_share: number;
  average_late_payment_rate: number | null;
}

export interface AnalyticsResponse {
  success: true;
  model_version: string | null;
  portfolio: {
    total_customers: number;
    risk_categories: RiskCategoryCount[];
    average_risk_score: number | null;
    median_risk_score: number | null;
    average_default_probability: number | null;
    predicted_defaults: number;
    predicted_default_share: number;
  };
  repayment: {
    customers_with_history: number;
    customers_without_history: number;
    average_late_payment_rate: number | null;
    customers_with_late_payments: number;
    customers_with_late_payments_share: number;
    customers_always_late: number;
    average_days_late: number | null;
    average_underpaid_rate: number | null;
    customers_with_unpaid_amounts: number;
    total_unpaid_amount: number;
    average_payment_ratio: number | null;
  };
  risk_score_histogram: { range: string; min: number; max: number; customers: number }[];
  late_payment_rate_buckets: { bucket: string; customers: number }[];
  segments: { income_type: Segment[]; education: Segment[]; occupation: Segment[] };
  model: {
    model_version: string;
    classification_threshold: number;
    risk_band_medium_from: number;
    risk_band_high_from: number;
    risk_band_note: string;
    evaluation: {
      roc_auc: number | null;
      accuracy: number | null;
      precision: number | null;
      recall: number | null;
      f1: number | null;
      holdout_customers: number | null;
      note: string;
    };
  } | null;
  disclaimer: string;
}

export type QueryType = 'customer_query' | 'aggregate_query' | 'retrieval_query' | 'general_retrieval';

export interface QueryCustomer extends CustomerSummary {
  installment_count: number | null;
  late_payment_count: number | null;
  avg_days_late: number | null;
  similarity?: number | null;
}

export interface QueryMetric {
  name: string;
  label: string;
  value: number | null;
  unit: string;
  population: number;
}

// Optional fields are omitted by the backend when not relevant to the query type.
export interface QueryResponse {
  success: true;
  query: string;
  query_type: QueryType;
  result: string;
  model_version: string | null;
  customer?: CustomerDetail;
  customers?: QueryCustomer[];
  metrics?: QueryMetric[];
  total_matches?: number;
  criteria?: string;
  not_found_ids?: number[];
}
