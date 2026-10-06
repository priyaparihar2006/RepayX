"""End-to-end tests for POST /api/query against the six-customer fixture in conftest.

Fixture (probability, history): 385772 0.80 High (always late, 0.225 unpaid), 200004 0.65 High (no history),
100003 0.45 Medium (20% late, 1500 unpaid), 385001 0.45 Medium (10% late), 100002 0.20 Low, 300005 0.05 Low.
"""

import pytest

from tests.conftest import write_test_customers, write_test_index, write_test_model


@pytest.fixture
def client(settings, client_factory):
    write_test_model(settings)
    write_test_customers(settings)
    write_test_index(settings)
    return client_factory()


def ask(client, query):
    response = client.post("/api/query", json={"query": query})
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["success"] is True
    return body


def ids(body):
    return [c["customer_id"] for c in body["customers"]]


def metric(body, name):
    return next(m for m in body["metrics"] if m["name"] == name)


# --- The five required example questions -------------------------------------


def test_customer_risk_status(client):
    body = ask(client, "What is the risk status of customer 385772?")

    assert body["query_type"] == "customer_query"
    assert body["customer"]["customer_id"] == 385772
    assert body["customer"]["risk_category"] == "High Risk"
    assert body["result"].startswith(
        "Customer 385772 is High Risk with a risk score of 80.13/100 (estimated default probability 80.13%). "
        "Predicted default: Yes (classification threshold 65%)."
    )
    assert "3 installments, 3 paid late (late payment rate 100.00%" in body["result"]


@pytest.mark.parametrize("query", [
    "when is birthday of rahul sharma?",
    "When is customer 385772's birthday?",
    "What is the date of birth of customer 385772?",
    "When was customer 385772 born?",
])
def test_birthdays_do_not_return_risk_summary_or_retrieval_matches(client, query):
    body = ask(client, query)
    assert body["query_type"] == "unsupported_query"
    assert "dates of birth are not available" in body["result"]
    assert "customer" not in body and "customers" not in body
    assert "High Risk" not in body["result"]


def test_demo_name_is_not_mapped_to_scored_customer(client):
    body = ask(client, "What is the status of Rahul Sharma?")
    assert body["query_type"] == "unsupported_query"
    assert "Customer names are not available" in body["result"]
    assert "customer" not in body and "customers" not in body


def test_specific_customer_fields_answer_the_question(client):
    status = ask(client, "What is the risk status of customer 385772?")
    income = ask(client, "What is the annual income of customer 385772?")
    assert income["result"] != status["result"]
    assert "annual income is" in income["result"]
    assert "risk score" not in income["result"]


def test_unknown_customer_question_does_not_repeat_summary(client):
    body = ask(client, "What is customer 385772's favourite colour?")
    assert "cannot answer that question" in body["result"]
    assert "High Risk" not in body["result"]


def test_high_risk_count(client):
    body = ask(client, "How many high-risk customers are there?")

    assert body["query_type"] == "aggregate_query"
    assert metric(body, "customer_count")["value"] == 2
    assert body["result"] == "There are 2 High Risk customers, 33.33% of the 6 scored customers."


def test_average_late_payment_rate_excludes_unknown(client):
    body = ask(client, "What is the average late payment rate?")

    # (100 + 10 + 0 + 20 + 0) / 5 customers with history
    m = metric(body, "average_late_payment_rate")
    assert (m["value"], m["unit"], m["population"]) == (26.0, "percent", 5)
    assert body["result"] == (
        "The average late payment rate is 26.00% across 5 customers (1 without a known value excluded)."
    )


def test_frequent_late_payers(client):
    body = ask(client, "Which customers frequently pay late?")

    assert body["query_type"] == "retrieval_query"
    assert ids(body) == [385772, 100003, 385001]
    assert body["total_matches"] == 3
    assert body["customers"][0]["late_payment_rate"] == 100.0
    assert body["customers"][0]["avg_days_late"] == 4.33


def test_customers_with_unpaid_amounts(client):
    body = ask(client, "Show customers with unpaid amounts.")

    assert body["query_type"] == "retrieval_query"
    assert ids(body) == [100003, 385772]
    assert "sorted by total unpaid amount" in body["result"]


# --- Other aggregates ------------------------------------------------------------


@pytest.mark.parametrize(
    "query,name,value",
    [
        ("How many customers have a 100% late payment rate?", "customer_count", 1),
        ("How many customers have no installment history?", "customer_count", 1),
        ("How many customers have unpaid amounts?", "customer_count", 2),
        ("How many customers have a risk score above 50?", "customer_count", 2),
        ("how many laborers are high risk", "customer_count", 2),
        ("What percentage of customers are predicted to default?", "share_of_portfolio", 33.33),
        ("What is the average risk score of high risk customers?", "average_risk_score", 72.56),
        ("What is the total unpaid amount?", "sum_total_unpaid_amount", 1500.22),
        ("median default probability", "median_default_probability", 45.0),
    ],
)
def test_aggregate_values(client, query, name, value):
    body = ask(client, query)
    assert body["query_type"] == "aggregate_query"
    assert metric(body, name)["value"] == value


def test_portfolio_count_includes_distribution(client):
    body = ask(client, "How many customers are there?")

    assert body["result"] == (
        "There are 6 scored customers. Low Risk: 2 (33.33%); Medium Risk: 2 (33.33%); High Risk: 2 (33.33%)."
    )
    assert {m["label"]: m["value"] for m in body["metrics"] if m["name"].endswith("risk_count")} == {
        "Low Risk": 2, "Medium Risk": 2, "High Risk": 2,
    }


def test_answers_name_the_population(client):
    body = ask(client, "average risk score of pensioners")
    assert "customers with income type 'Pensioner'" in body["result"]


# --- Structured retrieval details ----------------------------------------------------


def test_retrieval_threshold_and_limit(client):
    assert ids(ask(client, "show customers with unpaid amounts over 1000")) == [100003]
    body = ask(client, "top 1 customers that pay late")
    assert ids(body) == [385772] and body["total_matches"] == 3


def test_predicted_default_and_risk_listing(client):
    assert ids(ask(client, "Which customers are likely to default?")) == [385772, 200004]
    assert ids(ask(client, "show low risk customers")) == [300005, 100002]


def test_always_on_time(client):
    assert ids(ask(client, "Which customers are always on time?")) == [100002, 300005]


def test_retrieval_with_no_matches(client):
    body = ask(client, "show customers with unpaid amounts over 999999")
    assert body["customers"] == [] and body["total_matches"] == 0
    assert body["result"] == "No customers with unpaid amount > 999,999.00 were found."


# --- Customer lookups -------------------------------------------------------------


def test_unknown_customer(client):
    body = ask(client, "What is the risk status of customer 999999?")
    assert body["query_type"] == "customer_query"
    assert body["not_found_ids"] == [999999]
    assert body["result"] == "Customer 999999 was not found in the scored portfolio."
    assert "customer" not in body


def test_customer_without_history(client):
    body = ask(client, "customer 200004")
    assert body["result"].endswith("No installment history is available for this customer.")


def test_multiple_customers(client):
    body = ask(client, "compare customer 385772 and customer 100002")
    assert ids(body) == [385772, 100002]
    assert body["customer"]["customer_id"] == 385772


# --- General retrieval (TF-IDF) ---------------------------------------------------------


def test_general_retrieval_uses_tfidf(client):
    body = ask(client, "pensioner widow")

    assert body["query_type"] == "general_retrieval"
    assert ids(body)[0] == 200004
    assert 0 < body["customers"][0]["similarity"] <= 1
    assert "TF-IDF" in body["result"]


def test_general_retrieval_without_matches(client):
    body = ask(client, "what is the weather like")
    assert body["customers"] == [] and body["result"].startswith("No customers closely matched")


def test_general_retrieval_requires_index(settings, client_factory):
    write_test_customers(settings)
    client = client_factory()

    response = client.post("/api/query", json={"query": "pensioner widow"})
    assert response.status_code == 503
    assert response.json()["error"]["code"] == "retrieval_unavailable"
    # Structured questions still work without the index.
    assert ask(client, "How many high-risk customers are there?")["query_type"] == "aggregate_query"


# --- Safety -------------------------------------------------------------------------


@pytest.mark.parametrize("query", ["", "   ", "x" * 501])
def test_invalid_queries_rejected(client, query):
    assert client.post("/api/query", json={"query": query}).status_code == 422


def test_no_outcome_fields_in_any_answer(client):
    for q in ("customer 385772", "How many customers are there?", "Which customers frequently pay late?", "pensioner"):
        text = client.post("/api/query", json={"query": q}).text.lower()
        assert "target" not in text and "actual" not in text


# --- Index validation ------------------------------------------------------------------


def rag_status(client):
    resources = client.get("/api/health").json()["resources"]
    return resources["tfidf_vectorizer"], resources["tfidf_matrix"]


def test_index_from_other_customer_data_is_invalid(settings, client_factory):
    write_test_customers(settings)
    write_test_index(settings, model_version="other-model")
    assert rag_status(client_factory()) == ("invalid", "invalid")


def test_index_with_different_ids_is_invalid(settings, client_factory):
    write_test_customers(settings)
    write_test_index(settings, documents={1: "alpha beta", 2: "beta gamma"})
    assert rag_status(client_factory()) == ("invalid", "invalid")


def test_tampered_index_is_invalid(settings, client_factory):
    write_test_customers(settings)
    write_test_index(settings)
    settings.tfidf_matrix_path.write_bytes(settings.tfidf_matrix_path.read_bytes() + b"x")
    assert rag_status(client_factory()) == ("invalid", "invalid")


def test_index_without_metadata_is_missing(settings, client_factory):
    write_test_customers(settings)
    write_test_index(settings)
    settings.tfidf_metadata_path.unlink()
    assert rag_status(client_factory()) == ("missing", "missing")
