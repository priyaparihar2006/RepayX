# RepayX backend

FastAPI service that serves the scored customer data, portfolio analytics, customer insights, and the hybrid query router. For setup, the ML pipeline, and the full API reference, see the [root README](../README.md).

## Run

```bash
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements-dev.txt
python run.py          # http://127.0.0.1:8000, docs at /docs
pytest                 # 190 tests (+8 real-data tests when artifacts exist)
```

`requirements.txt` includes `../ml/requirements.txt`, so the backend uses exactly the scikit-learn version the model was trained with. The backend refuses to load a model trained with a different version.

## Configuration

Environment variables (defaults in brackets; the backend does not read `.env` itself):

| Variable | Purpose |
|---|---|
| `API_HOST` [`127.0.0.1`], `API_PORT` [`8000`] | Bind address for `run.py` |
| `CORS_ALLOWED_ORIGINS` [`http://localhost:3000,http://127.0.0.1:3000`] | Comma-separated frontend origins |
| `CUSTOMER_DATA_PATH` [`backend/data/customer_data.parquet`] | Scored customer data |
| `MODEL_PATH`, `MODEL_METADATA_PATH` [`models/repayx_model.joblib`, `models/repayx_model.metadata.json`] | Trained model and metadata |
| `TFIDF_VECTORIZER_PATH`, `TFIDF_MATRIX_PATH`, `TFIDF_IDS_PATH`, `TFIDF_METADATA_PATH` [`backend/rag/...`] | Retrieval index |

Relative paths resolve against the repository root.

## Layout

| Module | Responsibility |
|---|---|
| `api/main.py` | App factory, CORS, startup loading (lifespan), router registration |
| `api/errors.py` | Error types and handlers that produce the safe `{"success": false, "error": {...}}` envelope |
| `api/routes_*.py` | Thin routes: validate input, call services |
| `services/resources.py` | Loads and validates every artifact once; reports `available` / `missing` / `invalid` |
| `services/repayx_engine.py` | Model loading with checksum, library-version, and column validation |
| `services/customer_service.py` | Parquet loading and validation; lookup, filtering, sorting, pagination |
| `services/analytics_service.py` | Pandas calculations: portfolio summary (cached), benchmarks, filtered counts and statistics |
| `services/insight_service.py` | Rule-based customer insight and risk indicators |
| `services/query_router.py` | `route_repayx_query()`: deterministic question classification |
| `services/query_service.py` | Runs routed questions and phrases answers from computed values |
| `services/rag_service.py` | TF-IDF index loading, validation, and cosine-similarity search |
| `models/schemas.py` | Pydantic request and response schemas |

## Startup behaviour

On startup the service loads the model, then the customer data, then the TF-IDF index. Each artifact that is missing or fails validation is reported by `GET /api/health`, and only the endpoints that depend on it return `503`. For example, without the index, every question type except general retrieval still works. Customer data scored by another model version, or an index built from other customer data, is marked `invalid` rather than served.
