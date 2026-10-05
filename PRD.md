# RepayX: Product Requirements Document

| | |
|---|---|
| Product | RepayX, an AI-powered loan risk and recovery intelligence platform |
| Status | Prototype: all requirements below marked *Done* are implemented and tested |
| Owner | Priya Parihar |
| Related | [README.md](README.md) (architecture, setup, evaluation) |

---

## 1. Executive summary

RepayX gives credit-risk and collections teams one place to see which borrowers are most likely to default, how those borrowers have repaid in the past, and how risk is spread across the portfolio. A logistic-regression model scores each customer, repayment history is summarised per customer, and a web application presents the results through a dashboard, customer profiles, and a natural-language question interface.

The prototype scores 61,503 held-out customers from the Home Credit Default Risk dataset. The model ranks risk with a ROC-AUC of 0.753, and its High Risk band has a 20.5% observed default rate, against 2.1% for the Low Risk band. Every figure in the product is computed from data by the backend; the question interface calculates numeric answers instead of retrieving text, and no language model writes answers.

RepayX supports analysis and prioritisation. It is not a credit decision system.

## 2. Problem statement

- **Risk without context.** Application data and repayment behaviour sit in separate tables, so analysts judge risk without seeing how a customer has actually paid.
- **Untraceable figures.** Dashboards often show static or hand-entered numbers that cannot be traced to data, and sometimes mix model output with actual outcomes.
- **Hard to ask questions.** Non-specialists cannot query the portfolio directly, and generic chatbots are unreliable for numeric questions such as counts and averages.
- **Hidden data issues.** Raw installment data repeats the full amount on every partial-payment row, which inflates "underpayment" and totals if it is aggregated naively.

## 3. Objectives

| # | Objective | Measure |
|---|---|---|
| O1 | Rank customers by estimated default risk | Holdout ROC-AUC ≥ 0.75 (current: 0.753) |
| O2 | Make risk categories meaningful | Observed default rate rises from Low to Medium to High (current: 2.1% → 6.9% → 20.5%) |
| O3 | Explain each customer's risk with repayment evidence | Every profile shows repayment history, comparison with portfolio averages, and a data-derived insight |
| O4 | Answer portfolio questions correctly | The reference questions return values identical to the analytics endpoints (automated test) |
| O5 | Never show fabricated or leaked data | No hard-coded metrics; no outcome field in any response (automated tests) |
| O6 | Be reproducible by another developer | Documented setup; CI passes on a clean checkout |

## 4. Target users

- **Credit risk analysts**, who monitor portfolio risk and investigate segments.
- **Collections and recovery managers**, who prioritise customers for follow-up.
- **Risk and model governance reviewers**, who check how scores are produced and how well the model performs.
- **Developers and data scientists**, who extend the pipeline, the API, or the interface.

## 5. User personas

*The personas are illustrative.*

**Ananya, credit risk analyst.** She reviews the portfolio each week and wants to know how many customers are High Risk, which segments drive risk, and whether lateness is rising. She is comfortable with dashboards but not with code. She needs trustworthy aggregates, segment breakdowns, and quick answers to ad-hoc questions.

**Rahul, collections manager.** He decides whom his team contacts first, and wants the customers with the highest risk, the most frequent late payments, or the largest unpaid amounts, and a quick read of why each one is flagged. He needs ranked lists, customer profiles with plain-language insights, and search by customer ID.

**Meera, model risk reviewer.** She needs to know how the model was trained and evaluated, which features it uses, which protected attributes are excluded, and what the thresholds mean. She needs evaluation metrics, documented thresholds and bands, and assurance that actual outcomes are not exposed.

**Dev, developer.** He maintains the system and needs clear module boundaries, reproducible artifacts, input validation, and tests that run without the dataset.

## 6. Functional requirements

| ID | Requirement | Status |
|---|---|---|
| FR-1 | Score every customer with an estimated default probability (0–1), a risk score (0–100), a risk category (Low < 30, Medium 30–60, High ≥ 60), and a predicted-default flag at the 0.65 threshold | Done |
| FR-2 | Compute per-customer repayment features from installment history (counts, lateness, underpayment, unpaid amount, payment ratio) | Done |
| FR-3 | Look up any scored customer by ID, with risk, financial, profile, and repayment data | Done |
| FR-4 | List customers with search by ID or ID prefix, risk-category filter, sorting on six fields, and pagination | Done |
| FR-5 | Provide portfolio analytics: category counts and shares, average and median risk score, predicted defaults, repayment statistics, distributions, and segment breakdowns | Done |
| FR-6 | Answer natural-language questions through a hybrid router: customer lookup, then aggregate calculation, then structured repayment retrieval, then TF-IDF retrieval | Done |
| FR-7 | Prioritise customer IDs over all other keywords when routing questions | Done |
| FR-8 | Support risk-category, profile, numeric-threshold, and limit qualifiers in questions | Done |
| FR-9 | Generate each customer's AI Insight (summary and risk indicators) from that customer's data, with no pre-written per-customer text | Done |
| FR-10 | Compare a customer's repayment metrics with portfolio averages | Done |
| FR-11 | Show a disclaimer that scores are estimates and not lending decisions | Done |
| FR-12 | Handle invalid IDs, unknown customers, empty or over-long questions, an unavailable backend, missing or invalid artifacts, and malformed responses with clear messages | Done |
| FR-13 | Keep the original recovery-workflow screens available, clearly labelled as sample-data demos | Done |
| FR-14 | Score new applications on demand through the API | Planned |
| FR-15 | Export reports (CSV or PDF) | Planned |

## 7. Non-functional requirements

| ID | Requirement | Status |
|---|---|---|
| NFR-1 | Every interface figure comes from the backend; no hard-coded metrics | Done |
| NFR-2 | Frontend and backend are separated; API routes are thin and logic lives in services | Done |
| NFR-3 | Frontend reads the API address from configuration (`VITE_API_BASE_URL`) | Done |
| NFR-4 | Accessible charts: legend, table view, and labels that do not rely on colour; colour-blind-safe validated palette | Done |
| NFR-5 | Responsive layout, desktop-first | Done (desktop); mobile navigation not yet optimised |
| NFR-6 | Reproducible: pinned Python dependencies, a lockfile, artifact metadata (version, checksum, library versions), and CI | Done |
| NFR-7 | Testable without the dataset (fixtures and a fake API) | Done |

## 8. ML requirements

| ID | Requirement | Status |
|---|---|---|
| ML-1 | Train logistic regression with `class_weight="balanced"`, median imputation, standard scaling, and one-hot encoding | Done |
| ML-2 | Use a stratified 80/20 split; never use the holdout for fitting or tuning | Done |
| ML-3 | Select the classification threshold from out-of-fold predictions on the training split only (selected: 0.65) | Done |
| ML-4 | Keep the classification threshold separate from the risk presentation bands | Done |
| ML-5 | Aggregate installments at installment grain, so partial payments do not double-count | Done |
| ML-6 | Represent missing repayment history as unknown, not as perfect repayment | Done |
| ML-7 | Exclude protected attributes (`CODE_GENDER`, `NAME_FAMILY_STATUS`) from model inputs | Done |
| ML-8 | Save the model with metadata: version, feature list, threshold, bands, library versions, checksum, and evaluation | Done |
| ML-9 | Reproduce evaluation independently from saved artifacts | Done |
| ML-10 | Present outputs as *estimated* probabilities and never claim guaranteed outcomes | Done |
| ML-11 | Calibrate probabilities and choose the threshold from a cost matrix | Planned |
| ML-12 | Add bureau and previous-application features; evaluate gradient-boosted models | Planned |

## 9. RAG requirements

| ID | Requirement | Status |
|---|---|---|
| RAG-1 | Route numeric questions (counts, averages, totals, shares) to structured calculations, never to vector search | Done |
| RAG-2 | Route repayment criteria to structured retrieval sorted by the relevant fields: late rate, then days late; unpaid amount; risk score | Done |
| RAG-3 | Use TF-IDF with cosine similarity only for general descriptive questions; drop results below 0.05 similarity | Done |
| RAG-4 | Build retrieval documents from the served customer data only, never containing outcomes | Done |
| RAG-5 | Validate the index at startup: checksums, row and ID alignment with customer data, source model version | Done |
| RAG-6 | Generate answers from computed values and state the population used | Done |
| RAG-7 | Keep structured questions working when the TF-IDF index is unavailable | Done |
| RAG-8 | Add semantic (embedding) retrieval as a complement to TF-IDF | Planned |

## 10. Dashboard requirements

| ID | Requirement | Status |
|---|---|---|
| DB-1 | Summary cards: total customers and High / Medium / Low counts with shares | Done |
| DB-2 | Risk distribution, a risk-score histogram coloured by category, and a default-probability overview | Done |
| DB-3 | Repayment metrics: average late payment rate, customers with late payments, unpaid amount, underpaid rate | Done |
| DB-4 | Late-payment-rate distribution, with unknown-history customers reported separately | Done |
| DB-5 | Highest-risk customer table (ID, risk score, default probability, category, late payment rate, unpaid amount, action) | Done |
| DB-6 | Risk Analytics and Repayment Analytics pages with segment breakdowns and model evaluation | Done |
| DB-7 | Customer details at `/customers/{id}`: risk position, AI Insight, indicators, repayment comparison, and financial, profile, and repayment sections | Done |
| DB-8 | AI Insights page: input, suggested questions, query type, answer, and results as cards or tables | Done |
| DB-9 | Navigation: Dashboard, Customers, Risk Analytics, Repayment Analytics, AI Insights | Done |

## 11. API requirements

| ID | Requirement | Status |
|---|---|---|
| API-1 | `GET /api/health` reports overall status and per-artifact availability | Done |
| API-2 | `GET /api/customer/{id}` returns the profile, insight, benchmarks, and threshold; `404` when unknown | Done |
| API-3 | `GET /api/customers` supports `page`, `page_size` (≤ 100), `risk_category`, `search`, `sort_by`, `sort_order` | Done |
| API-4 | `GET /api/analytics` returns dynamic portfolio, repayment, distribution, segment, and model metrics | Done |
| API-5 | `POST /api/query` accepts 1–500 characters and returns `query_type`, `result`, and structured results | Done |
| API-6 | Consistent error envelope; `422` / `404` / `503` / `500` with safe messages | Done |
| API-7 | OpenAPI documentation at `/docs` | Done |

## 12. Data requirements

| ID | Requirement | Status |
|---|---|---|
| DR-1 | Source data: Home Credit `application_train.csv` (307,511 rows), `installments_payments.csv` (13.6M rows), optional `application_test.csv` | Done |
| DR-2 | Served data: Parquet with only the fields the product needs, sorted and indexed by customer ID | Done |
| DR-3 | Reject served data that has missing columns, duplicate or invalid IDs, out-of-range values, unknown categories, or any outcome column | Done |
| DR-4 | Reject served data scored by a different model version than the loaded model | Done |
| DR-5 | Do not commit raw data, customer-level derived data, or holdout IDs; regenerate them through the pipeline | Done |
| DR-6 | Do not join unrelated datasets: the two original prototype CSVs share no IDs and are not used | Done |

## 13. Security requirements

| ID | Requirement | Status |
|---|---|---|
| SEC-1 | No secrets or API keys in the repository; `.env` is git-ignored | Done |
| SEC-2 | CORS restricted to configured frontend origins | Done |
| SEC-3 | Validate all input; do not echo invalid input back | Done |
| SEC-4 | Never expose stack traces, exception text, or file paths to clients | Done |
| SEC-5 | Verify model and index checksums before unpickling | Done |
| SEC-6 | Never expose actual outcomes (`TARGET`) to users | Done |
| SEC-7 | Authentication, role-based access, and audit logging | Planned |

## 14. Performance requirements

| ID | Requirement | Measured (local development machine, 61,503 customers) |
|---|---|---|
| PERF-1 | Load model, data, and index once at startup, not per request | Done; startup load about 0.4 s |
| PERF-2 | Customer lookup under 100 ms | about 30 ms |
| PERF-3 | Sorted and filtered customer page under 200 ms | 33–120 ms |
| PERF-4 | Analytics under 100 ms (computed once, then cached) | about 10 ms |
| PERF-5 | Query answers under 500 ms | 7–170 ms |
| PERF-6 | Initial frontend bundle under 500 KB, with pages loaded on demand | about 324 KB (100 KB gzipped) |

## 15. Success metrics

| Metric | Target | Current |
|---|---|---|
| Holdout ROC-AUC | ≥ 0.75 | 0.753 |
| Recall at the classification threshold | ≥ 40% | 43.4% |
| Precision at the classification threshold | ≥ 20% | 22.6% |
| Default-rate lift, High vs Low band | ≥ 5× | 9.7× (20.5% vs 2.1%) |
| Cross-endpoint consistency of reference answers | 100% | 100% (automated real-data tests) |
| Responses containing outcome fields | 0 | 0 (automated tests) |
| Automated test pass rate | 100% | 100%: 198 backend, 29 ML, 39 frontend |
| Clean-checkout CI | Passing | Passing |

Adoption metrics, such as weekly active analysts, questions asked, and customers reviewed from ranked lists, will be defined once the product is used with real users.

## 16. Future scope

- **Model.** Richer features (bureau, previous applications, card balances), gradient-boosted models, probability calibration, cost-based thresholds, and per-customer explanations.
- **Monitoring.** Fairness checks across segments, drift monitoring, and scheduled re-scoring with model and dataset versioning.
- **Product.** On-demand scoring of new applications, report export, saved views and alerts, and mobile-optimised navigation.
- **Retrieval.** Semantic retrieval, plus optional LLM phrasing that is strictly grounded in computed results.
- **Platform.** Authentication, roles, audit logging, containerised deployment, and a database once data becomes live.
- **Recovery workflow.** Connect the demo loans, follow-ups, conversations, and payments screens to real collections data.
