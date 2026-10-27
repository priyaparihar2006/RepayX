import type { AnalyticsResponse } from '../types/api';

/**
 * Preloaded ground-truth portfolio analytics (61,503 scored customers).
 * Provides instantaneous dashboard rendering even when cloud containers (e.g. Render) are waking up.
 */
export const FALLBACK_ANALYTICS: AnalyticsResponse = {
  "success": true,
  "model_version": "repayx-logreg-20261005064635",
  "portfolio": {
    "total_customers": 61503,
    "risk_categories": [
      {
        "risk_category": "Low Risk",
        "customers": 20465,
        "share": 33.27
      },
      {
        "risk_category": "Medium Risk",
        "customers": 28392,
        "share": 46.16
      },
      {
        "risk_category": "High Risk",
        "customers": 12646,
        "share": 20.56
      }
    ],
    "average_risk_score": 41.83,
    "median_risk_score": 39.25,
    "average_default_probability": 41.83,
    "predicted_defaults": 9523,
    "predicted_default_share": 15.48
  },
  "repayment": {
    "customers_with_history": 58321,
    "customers_without_history": 3182,
    "average_late_payment_rate": 8.52,
    "customers_with_late_payments": 30946,
    "customers_with_late_payments_share": 53.06,
    "customers_always_late": 52,
    "average_days_late": 1.33,
    "average_underpaid_rate": 0.07,
    "customers_with_unpaid_amounts": 621,
    "total_unpaid_amount": 11802525.3,
    "average_payment_ratio": 1.03
  },
  "risk_score_histogram": [
    {
      "range": "0-10",
      "min": 0,
      "max": 10,
      "customers": 1240
    },
    {
      "range": "10-20",
      "min": 10,
      "max": 20,
      "customers": 7886
    },
    {
      "range": "20-30",
      "min": 20,
      "max": 30,
      "customers": 11339
    },
    {
      "range": "30-40",
      "min": 30,
      "max": 40,
      "customers": 11125
    },
    {
      "range": "40-50",
      "min": 40,
      "max": 50,
      "customers": 9541
    },
    {
      "range": "50-60",
      "min": 50,
      "max": 60,
      "customers": 7726
    },
    {
      "range": "60-70",
      "min": 60,
      "max": 70,
      "customers": 5762
    },
    {
      "range": "70-80",
      "min": 70,
      "max": 80,
      "customers": 4225
    },
    {
      "range": "80-90",
      "min": 80,
      "max": 90,
      "customers": 2232
    },
    {
      "range": "90-100",
      "min": 90,
      "max": 100,
      "customers": 427
    }
  ],
  "late_payment_rate_buckets": [
    {
      "bucket": "0% (always on time)",
      "customers": 27372
    },
    {
      "bucket": "0-10%",
      "customers": 15096
    },
    {
      "bucket": "10-25%",
      "customers": 9831
    },
    {
      "bucket": "25-50%",
      "customers": 4709
    },
    {
      "bucket": "50-<100%",
      "customers": 1258
    },
    {
      "bucket": "100% (always late)",
      "customers": 52
    },
    {
      "bucket": "Unknown",
      "customers": 3185
    }
  ],
  "segments": {
    "income_type": [
      {
        "segment": "Working",
        "customers": 31731,
        "average_risk_score": 46.17,
        "high_risk_share": 26.73,
        "average_late_payment_rate": 8.52
      },
      {
        "segment": "Commercial associate",
        "customers": 14344,
        "average_risk_score": 40.24,
        "high_risk_share": 18.59,
        "average_late_payment_rate": 8.76
      },
      {
        "segment": "Pensioner",
        "customers": 11228,
        "average_risk_score": 34.34,
        "high_risk_share": 8.77,
        "average_late_payment_rate": 8.18
      },
      {
        "segment": "State servant",
        "customers": 4185,
        "average_risk_score": 34.5,
        "high_risk_share": 12.14,
        "average_late_payment_rate": 8.49
      },
      {
        "segment": "Student",
        "customers": 7,
        "average_risk_score": 46.62,
        "high_risk_share": 28.57,
        "average_late_payment_rate": 7.5
      },
      {
        "segment": "Unemployed",
        "customers": 5,
        "average_risk_score": 68.96,
        "high_risk_share": 60.0,
        "average_late_payment_rate": 38.92
      },
      {
        "segment": "Maternity leave",
        "customers": 2,
        "average_risk_score": 63.87,
        "high_risk_share": 50.0,
        "average_late_payment_rate": 45.97
      },
      {
        "segment": "Businessman",
        "customers": 1,
        "average_risk_score": 29.75,
        "high_risk_share": 0.0,
        "average_late_payment_rate": null
      }
    ],
    "education": [
      {
        "segment": "Secondary / secondary special",
        "customers": 43623,
        "average_risk_score": 44.65,
        "high_risk_share": 23.86,
        "average_late_payment_rate": 8.49
      },
      {
        "segment": "Higher education",
        "customers": 15061,
        "average_risk_score": 32.93,
        "high_risk_share": 9.95,
        "average_late_payment_rate": 8.31
      },
      {
        "segment": "Incomplete higher",
        "customers": 1988,
        "average_risk_score": 44.22,
        "high_risk_share": 23.49,
        "average_late_payment_rate": 9.81
      },
      {
        "segment": "Lower secondary",
        "customers": 791,
        "average_risk_score": 50.75,
        "high_risk_share": 34.13,
        "average_late_payment_rate": 10.0
      },
      {
        "segment": "Academic degree",
        "customers": 40,
        "average_risk_score": 24.23,
        "high_risk_share": 5.0,
        "average_late_payment_rate": 10.3
      }
    ],
    "occupation": [
      {
        "segment": "Unknown",
        "customers": 19451,
        "average_risk_score": 37.43,
        "high_risk_share": 13.42,
        "average_late_payment_rate": 8.45
      },
      {
        "segment": "Laborers",
        "customers": 10927,
        "average_risk_score": 48.95,
        "high_risk_share": 30.97,
        "average_late_payment_rate": 8.47
      },
      {
        "segment": "Sales staff",
        "customers": 6496,
        "average_risk_score": 47.48,
        "high_risk_share": 27.37,
        "average_late_payment_rate": 8.82
      },
      {
        "segment": "Core staff",
        "customers": 5477,
        "average_risk_score": 36.06,
        "high_risk_share": 13.36,
        "average_late_payment_rate": 8.59
      },
      {
        "segment": "Managers",
        "customers": 4275,
        "average_risk_score": 35.87,
        "high_risk_share": 12.7,
        "average_late_payment_rate": 9.07
      },
      {
        "segment": "Drivers",
        "customers": 3659,
        "average_risk_score": 51.86,
        "high_risk_share": 35.88,
        "average_late_payment_rate": 8.76
      },
      {
        "segment": "High skill tech staff",
        "customers": 2287,
        "average_risk_score": 36.13,
        "high_risk_share": 13.42,
        "average_late_payment_rate": 7.75
      },
      {
        "segment": "Accountants",
        "customers": 1931,
        "average_risk_score": 30.77,
        "high_risk_share": 8.08,
        "average_late_payment_rate": 8.18
      },
      {
        "segment": "Medicine staff",
        "customers": 1666,
        "average_risk_score": 38.44,
        "high_risk_share": 14.53,
        "average_late_payment_rate": 8.09
      },
      {
        "segment": "Security staff",
        "customers": 1349,
        "average_risk_score": 50.99,
        "high_risk_share": 33.06,
        "average_late_payment_rate": 7.77
      },
      {
        "segment": "Cooking staff",
        "customers": 1179,
        "average_risk_score": 48.73,
        "high_risk_share": 30.2,
        "average_late_payment_rate": 8.49
      },
      {
        "segment": "Cleaning staff",
        "customers": 912,
        "average_risk_score": 45.05,
        "high_risk_share": 24.12,
        "average_late_payment_rate": 8.22
      },
      {
        "segment": "Private service staff",
        "customers": 558,
        "average_risk_score": 38.02,
        "high_risk_share": 16.13,
        "average_late_payment_rate": 8.84
      },
      {
        "segment": "Low-skill Laborers",
        "customers": 397,
        "average_risk_score": 65.9,
        "high_risk_share": 65.24,
        "average_late_payment_rate": 9.65
      },
      {
        "segment": "Waiters/barmen staff",
        "customers": 302,
        "average_risk_score": 51.13,
        "high_risk_share": 33.44,
        "average_late_payment_rate": 8.43
      },
      {
        "segment": "Secretaries",
        "customers": 258,
        "average_risk_score": 39.93,
        "high_risk_share": 18.22,
        "average_late_payment_rate": 8.92
      },
      {
        "segment": "Realty agents",
        "customers": 157,
        "average_risk_score": 41.0,
        "high_risk_share": 17.2,
        "average_late_payment_rate": 7.75
      },
      {
        "segment": "HR staff",
        "customers": 120,
        "average_risk_score": 34.86,
        "high_risk_share": 15.83,
        "average_late_payment_rate": 7.85
      },
      {
        "segment": "IT staff",
        "customers": 102,
        "average_risk_score": 36.62,
        "high_risk_share": 15.69,
        "average_late_payment_rate": 8.96
      }
    ]
  },
  "model": {
    "model_version": "repayx-logreg-20261005064635",
    "classification_threshold": 0.65,
    "risk_band_medium_from": 30.0,
    "risk_band_high_from": 60.0,
    "risk_band_note": "Prototype presentation bands on the 0-100 risk score; not validated lending thresholds.",
    "evaluation": {
      "roc_auc": 75.34,
      "accuracy": 83.45,
      "precision": 22.63,
      "recall": 43.4,
      "f1": 29.75,
      "holdout_customers": 61503,
      "note": "Prototype evaluation on a held-out split recorded at training time; not a production validation."
    }
  },
  "disclaimer": "RepayX provides model-based risk estimates for analytical and demonstration purposes. Risk scores are not guaranteed outcomes and should not be treated as a final lending decision."
};
