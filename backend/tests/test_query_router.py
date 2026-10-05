import pytest

from services.query_router import extract_customer_ids, route_repayx_query

PROFILE = {
    "income_type": ["Commercial associate", "Pensioner", "State servant", "Working"],
    "education": ["Higher education", "Lower secondary", "Secondary / secondary special"],
    "family_status": ["Married", "Single / not married", "Widow"],
    "occupation": ["Drivers", "High skill tech staff", "Laborers", "Low-skill Laborers", "Managers"],
}


def route(q):
    return route_repayx_query(q, PROFILE)


@pytest.mark.parametrize(
    "query,expected_type",
    [
        ("What is the risk status of customer 385772?", "customer_query"),
        ("How many high-risk customers are there?", "aggregate_query"),
        ("What is the average late payment rate?", "aggregate_query"),
        ("Which customers frequently pay late?", "retrieval_query"),
        ("Show customers with unpaid amounts.", "retrieval_query"),
        ("Which customers have high late-payment rates?", "retrieval_query"),
        ("Show customers with overdue payments.", "retrieval_query"),
        ("Find customers with unpaid amounts.", "retrieval_query"),
        ("What is the average risk score?", "aggregate_query"),
        ("married drivers with higher education", "general_retrieval"),
        ("What is the weather like?", "general_retrieval"),
    ],
)
def test_spec_examples_route_correctly(query, expected_type):
    assert route(query).query_type == expected_type


def test_customer_id_takes_priority_over_aggregate_and_retrieval_words():
    for q in (
        "What is the risk status of customer 385772?",
        "How many late payments does customer 385772 have?",
        "Show the average risk score for client #385772",
        "385772",
    ):
        routed = route(q)
        assert routed.query_type == "customer_query", q
        assert routed.customer_ids == (385772,)


@pytest.mark.parametrize(
    "query,ids",
    [
        ("customer id: 100002", (100002,)),
        ("compare customer 100002 and customer 385772", (100002, 385772)),
        ("SK_ID_CURR 456255", (456255,)),
        ("unpaid amounts over 100000", ()),
        ("risk score above 80", ()),
        ("customers owing more than ₹250000", ()),
        ("late rate 100%", ()),
        ("top 10 customers", ()),
        ("amount 1,234,567", ()),
    ],
)
def test_customer_id_extraction(query, ids):
    assert extract_customer_ids(query) == ids


@pytest.mark.parametrize(
    "query,operation,metric,conditions",
    [
        ("How many customers are there?", "count", None, ()),
        ("How many customers have a 100% late payment rate?", "count", None, ("always_late",)),
        ("How many customers have no installment history?", "count", None, ("no_history",)),
        ("how many customers have unpaid amounts", "count", None, ("unpaid",)),
        ("What percentage of customers are predicted to default?", "share", None, ()),
        ("What is the average late payment rate?", "average", "late_payment_rate", ()),
        ("average number of installments", "average", "installment_count", ()),
        ("median default probability", "median", "default_probability", ()),
        ("What is the total unpaid amount?", "sum", "total_unpaid_amount", ()),
        ("average risk score of late payers", "average", "risk_score", ("late",)),
        ("risk distribution", "distribution", None, ()),
    ],
)
def test_aggregate_parsing(query, operation, metric, conditions):
    routed = route(query)
    assert routed.query_type == "aggregate_query"
    assert (routed.operation, routed.metric, routed.conditions) == (operation, metric, conditions)


def test_aggregate_without_known_metric_falls_through():
    assert route("what is the average?").query_type == "general_retrieval"


@pytest.mark.parametrize(
    "query,kind",
    [
        ("Which customers frequently pay late?", "late_payers"),
        ("customers who are always late", "late_payers"),
        ("Which customers are always on time?", "on_time"),
        ("Show customers with unpaid amounts", "unpaid"),
        ("show customers with highest total unpaid amount", "unpaid"),
        ("Which customers are likely to default?", "predicted_default"),
        ("show high risk customers", "highest_risk"),
        ("riskiest customers", "highest_risk"),
        ("show low risk customers", "lowest_risk"),
        ("customers with the lowest payment ratio", "lowest_payment_ratio"),
        ("top 5 customers with risk score below 20", "lowest_risk"),
    ],
)
def test_retrieval_kinds(query, kind):
    routed = route(query)
    assert routed.query_type == "retrieval_query"
    assert routed.retrieval == kind


def test_limits_are_parsed_and_capped():
    assert route("top 5 late payers").limit == 5
    assert route("show 3 customers with unpaid amounts").limit == 3
    assert route("top 500 late payers").limit == 50
    assert route("late payers").limit == 10


@pytest.mark.parametrize(
    "query,threshold",
    [
        ("Show customers with unpaid amounts over 100000", ("total_unpaid_amount", ">", 100000.0)),
        ("how many customers have unpaid amounts over $5,000", ("total_unpaid_amount", ">", 5000.0)),
        ("How many customers have a risk score above 80?", ("risk_score", ">", 80.0)),
        ("customers with late payment rate above 50%", ("late_payment_rate", ">", 50.0)),
        ("late rate over 0.5", ("late_payment_rate", ">", 50.0)),
        ("customers with risk score at most 10", ("risk_score", "<=", 10.0)),
    ],
)
def test_thresholds(query, threshold):
    assert route(query).threshold == threshold


def test_risk_and_profile_filters():
    routed = route("Top 5 high risk laborers who pay late")
    assert routed.filters.risk_category == "High Risk"
    assert routed.filters.profile == (("occupation", "Laborers"),)

    assert route("how many low-skill laborers").filters.profile == (("occupation", "Low-skill Laborers"),)
    assert route("average risk score of pensioners").filters.profile == (("income_type", "Pensioner"),)
    assert route("how many single customers").filters.profile == (("family_status", "Single / not married"),)
    assert route("medium risk customers").filters.risk_category == "Medium Risk"


def test_whitespace_is_normalised():
    assert route("  how   many\ncustomers  ").query == "how many customers"
