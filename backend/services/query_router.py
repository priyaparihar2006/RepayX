"""Classifies natural-language questions for the RepayX hybrid query engine.

`route_repayx_query(query)` decides how a question is answered, in priority order:

1. customer_query     - mentions a customer ID -> direct lookup
2. aggregate_query    - asks for a count / average / total / share / breakdown
                        -> computed with pandas over the customer data
3. retrieval_query    - asks for customers matching repayment or risk criteria
                        (late payers, unpaid amounts, high risk, predicted default)
                        -> structured filtering and sorting
4. general_retrieval  - anything else -> TF-IDF cosine similarity

Numeric questions never reach TF-IDF. Classification is rule-based and
deterministic; it does not call a language model.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Literal, Mapping

QueryType = Literal["customer_query", "aggregate_query", "retrieval_query", "general_retrieval"]
Condition = Literal["late", "always_late", "on_time", "unpaid", "no_history", "predicted_default"]
RetrievalKind = Literal[
    "late_payers", "on_time", "unpaid", "predicted_default", "highest_risk", "lowest_risk", "lowest_payment_ratio"
]
Comparison = Literal[">", ">=", "<", "<="]

DEFAULT_LIMIT = 10
MAX_LIMIT = 50
MAX_CUSTOMER_IDS = 5

# --- Customer IDs -------------------------------------------------------------

# "customer 385772", "client #385772", "id: 385772", "SK_ID_CURR 385772"
_KEYWORD_ID = re.compile(
    r"\b(?:customers?|clients?|borrowers?|applicants?|accounts?|sk_id_curr|id)\b\s*(?:id|number|no\.?)?\s*[:#]?\s*(\d{4,10})\b",
    re.I,
)
_HASH_ID = re.compile(r"#\s*(\d{4,10})\b")
# A bare 6-digit number (the SK_ID_CURR format), unless it reads like an amount or threshold.
_BARE_ID = re.compile(r"(?<![\d.,])(\d{6})(?![\d.,%])")
_AMOUNT_CONTEXT = re.compile(
    r"(?:over|above|below|under|more than|less than|greater than|at least|at most|exceeding|[<>=₹$€£]|rs\.?|inr)\s*$",
    re.I,
)

# --- Risk and profile filters ---------------------------------------------------

_RISK = [
    ("High Risk", re.compile(r"\bhigh(?:est)?[\s-]*risk\b", re.I)),
    ("Medium Risk", re.compile(r"\b(?:medium|moderate|mid)[\s-]*risk\b", re.I)),
    ("Low Risk", re.compile(r"\blow(?:est)?[\s-]*risk\b", re.I)),
]
_PREDICTED_DEFAULT = re.compile(
    r"\b(?:predicted (?:to )?default|predicted defaults?|likely to default|expected to default|flagged (?:for|as) default)\b",
    re.I,
)
_PROFILE_ALIASES = {
    "family_status": {"single": "Single / not married", "unmarried": "Single / not married", "widowed": "Widow",
                      "widows": "Widow", "widowers": "Widow"},
    "education": {"secondary education": "Secondary / secondary special", "secondary school": "Secondary / secondary special",
                  "university": "Higher education", "graduates": "Higher education"},
    "income_type": {"pensioners": "Pensioner", "retired": "Pensioner", "retirees": "Pensioner",
                    "businessmen": "Businessman", "state servants": "State servant", "government employees": "State servant"},
}
_PROFILE_FIELDS = ("income_type", "education", "family_status", "occupation")

# --- Aggregate intent -------------------------------------------------------------

_COUNT = re.compile(r"\b(?:how many|number of|count(?: of)?|how much of)\b", re.I)
_SHARE = re.compile(r"\b(?:what (?:percent(?:age)?|share|fraction|proportion)|percent(?:age)? of|share of|proportion of)\b", re.I)
_AVERAGE = re.compile(r"\b(?:average|avg|mean|typical)\b", re.I)
_MEDIAN = re.compile(r"\bmedian\b", re.I)
_SUM = re.compile(r"\b(?:sum|total)\b", re.I)
_DISTRIBUTION = re.compile(r"\b(?:distribution|breakdown|split|summary|overview)\b", re.I)
_LIST_WORDS = re.compile(r"\b(?:which|who|show|list|find|display|give me|top|names?|identify)\b", re.I)

# Metric phrases, most specific first.
_METRICS: list[tuple[str, re.Pattern]] = [
    ("default_probability", re.compile(r"\b(?:default probabilit(?:y|ies)|probabilit(?:y|ies) of default|chance of default|default risk)\b", re.I)),
    ("late_payment_rate", re.compile(r"\blate[\s-]*(?:payment )?(?:rate|ratio|percentage)\b|\blateness\b", re.I)),
    ("underpaid_rate", re.compile(r"\bunder[\s-]?pa(?:id|yment) (?:rate|ratio|percentage)\b", re.I)),
    ("payment_ratio", re.compile(r"\b(?:re)?payment ratio\b", re.I)),
    ("avg_days_late", re.compile(r"\bdays? (?:late|overdue|past due)\b|\bdelay\b", re.I)),
    ("total_unpaid_amount", re.compile(r"\b(?:unpaid|outstanding|underpaid)(?: amounts?| balances?)?\b", re.I)),
    ("installment_count", re.compile(r"\b(?:number of )?installments?\b", re.I)),
    ("annual_income", re.compile(r"\bincome\b", re.I)),
    ("credit_amount", re.compile(r"\b(?:credit|loan) amounts?\b|\bcredit\b", re.I)),
    ("annuity_amount", re.compile(r"\bannuit(?:y|ies)\b", re.I)),
    ("risk_score", re.compile(r"\brisk scores?\b|\bscores?\b", re.I)),
]

# Row conditions for counts and structured retrieval, most specific first.
_CONDITIONS: list[tuple[Condition, re.Pattern]] = [
    ("no_history", re.compile(r"\b(?:no|without|missing|lack(?:ing)?)\b.{0,20}\b(?:installment|repayment|payment|credit) history\b", re.I)),
    ("always_late", re.compile(r"(?:\b100\s*%|\b100 percent\b|\balways\b|\bevery\b|\ball\b).{0,25}\blate\b|\blate\b.{0,25}(?:\bevery\b|\ball\b|\b100\s*%)", re.I)),
    ("on_time", re.compile(r"\b(?:on[\s-]time|never (?:been )?late|always pa(?:y|id) on time|punctual)\b", re.I)),
    ("late", re.compile(r"\b(?:late|overdue|past[\s-]due|delinquen\w*|delay(?:ed|s)?|behind on)\b", re.I)),
    ("unpaid", re.compile(r"\b(?:unpaid|underpaid|under[\s-]?payments?|outstanding|shortfalls?|owe|owing|not (?:fully )?paid)\b", re.I)),
]

_THRESHOLD_WORDS = {
    "over": ">", "above": ">", "more than": ">", "greater than": ">", "exceeding": ">", "at least": ">=",
    "under": "<", "below": "<", "less than": "<", "at most": "<=", ">": ">", ">=": ">=", "<": "<", "<=": "<=",
}
_THRESHOLD = re.compile(
    r"(over|above|more than|greater than|exceeding|at least|under|below|less than|at most|>=|<=|>|<)\s*"
    r"(?:[₹$€£]|rs\.?\s*|inr\s*)?(\d+(?:,\d{3})*(?:\.\d+)?)\s*(%|percent\b)?",
    re.I,
)
# Rates and probabilities are expressed in percent for thresholds.
PERCENT_METRICS = {"late_payment_rate", "underpaid_rate", "default_probability"}
_DEFAULT_THRESHOLD_METRIC = {
    "late_payers": "late_payment_rate",
    "unpaid": "total_unpaid_amount",
    "highest_risk": "risk_score",
    "lowest_risk": "risk_score",
    "predicted_default": "risk_score",
    "lowest_payment_ratio": "payment_ratio",
}

_LIMIT = re.compile(r"\b(?:top|first|bottom|last)\s+(\d{1,3})\b|\b(\d{1,3})\s+(?:customers|clients|borrowers|accounts|people)\b", re.I)
_LOWEST = re.compile(r"\b(?:lowest|least|smallest|minimum|safest)\b", re.I)


@dataclass(frozen=True)
class QueryFilters:
    risk_category: str | None = None
    predicted_default: bool = False
    profile: tuple[tuple[str, str], ...] = ()  # (field, value) pairs

    def is_empty(self) -> bool:
        return not (self.risk_category or self.predicted_default or self.profile)


@dataclass(frozen=True)
class RoutedQuery:
    query: str
    query_type: QueryType
    customer_ids: tuple[int, ...] = ()
    operation: Literal["count", "share", "average", "median", "sum", "distribution"] | None = None
    metric: str | None = None
    conditions: tuple[Condition, ...] = ()
    retrieval: RetrievalKind | None = None
    filters: QueryFilters = field(default_factory=QueryFilters)
    limit: int = DEFAULT_LIMIT
    # Optional numeric criterion, e.g. ("total_unpaid_amount", ">", 100000.0). Rates are in percent.
    threshold: tuple[str, Comparison, float] | None = None


def extract_customer_ids(query: str) -> tuple[int, ...]:
    found: list[int] = []
    for pattern in (_KEYWORD_ID, _HASH_ID):
        found += [int(m.group(1)) for m in pattern.finditer(query)]
    for m in _BARE_ID.finditer(query):
        if not _AMOUNT_CONTEXT.search(query[: m.start()]):
            found.append(int(m.group(1)))
    unique = list(dict.fromkeys(i for i in found if i > 0))
    return tuple(unique[:MAX_CUSTOMER_IDS])


def _profile_filters(query: str, profile_values: Mapping[str, list[str]] | None) -> tuple[tuple[str, str], ...]:
    lowered = query.lower()
    matches: list[tuple[str, str]] = []
    for field_name in _PROFILE_FIELDS:
        candidates: dict[str, str] = dict(_PROFILE_ALIASES.get(field_name, {}))
        for value in (profile_values or {}).get(field_name, []):
            base = value.lower()
            candidates.setdefault(base, value)
            candidates.setdefault(base + "s", value)
            if base.endswith("s"):
                candidates.setdefault(base[:-1], value)
        best: tuple[int, str] | None = None
        for alias, value in candidates.items():
            if re.search(rf"(?<![\w-]){re.escape(alias)}(?![\w-])", lowered) and (best is None or len(alias) > best[0]):
                best = (len(alias), value)
        if best:
            matches.append((field_name, best[1]))
    return tuple(matches)


def _filters(query: str, profile_values) -> QueryFilters:
    risk = next((name for name, pattern in _RISK if pattern.search(query)), None)
    return QueryFilters(
        risk_category=risk,
        predicted_default=bool(_PREDICTED_DEFAULT.search(query)),
        profile=_profile_filters(query, profile_values),
    )


def _limit(query: str) -> int:
    m = _LIMIT.search(query)
    if not m:
        return DEFAULT_LIMIT
    return max(1, min(MAX_LIMIT, int(m.group(1) or m.group(2))))


def _conditions(query: str) -> tuple[Condition, ...]:
    found: list[Condition] = []
    for name, pattern in _CONDITIONS:
        if pattern.search(query):
            if name == "late" and ("always_late" in found or "on_time" in found):
                continue
            found.append(name)
    return tuple(found)


def _metric(query: str) -> str | None:
    return next((name for name, pattern in _METRICS if pattern.search(query)), None)


def _threshold(query: str, metric: str | None) -> tuple[str, Comparison, float] | None:
    if metric is None:
        return None
    m = _THRESHOLD.search(query)
    if not m:
        return None
    value = float(m.group(2).replace(",", ""))
    if metric in PERCENT_METRICS and not m.group(3) and value <= 1:
        value *= 100  # "late rate above 0.5" -> 50%
    return metric, _THRESHOLD_WORDS[m.group(1).lower()], value


def _aggregate(query: str, filters: QueryFilters) -> RoutedQuery | None:
    wants_list = bool(_LIST_WORDS.search(query))
    if _SHARE.search(query):
        operation = "share"
    elif _MEDIAN.search(query):
        operation = "median"
    elif _AVERAGE.search(query):
        operation = "average"
    elif _COUNT.search(query):
        operation = "count"
    elif _SUM.search(query) and not wants_list:
        operation = "sum"
    elif _DISTRIBUTION.search(query) and not wants_list:
        operation = "distribution"
    else:
        return None

    if operation in ("count", "share", "distribution"):
        # "number of installments" is a metric, not a request to count customers.
        threshold = _threshold(query, _metric(query))
        return RoutedQuery(query, "aggregate_query", operation=operation, conditions=_conditions(query),
                           filters=filters, threshold=threshold)

    metric = _metric(query)
    if metric is None:
        return None
    # Averages are over a population; repayment conditions narrow it ("average risk score of late payers").
    conditions = tuple(c for c in _conditions(query) if not (c == "unpaid" and metric == "total_unpaid_amount")
                       and not (c == "late" and metric in ("late_payment_rate", "avg_days_late")))
    return RoutedQuery(query, "aggregate_query", operation=operation, metric=metric, conditions=conditions, filters=filters)


def _retrieval(query: str, filters: QueryFilters) -> RoutedQuery | None:
    conditions = _conditions(query)
    limit = _limit(query)
    lowest = bool(_LOWEST.search(query))
    if "late" in conditions or "always_late" in conditions:
        kind: RetrievalKind = "late_payers"
    elif "on_time" in conditions:
        kind = "on_time"
    elif "unpaid" in conditions:
        kind = "unpaid"
    elif _metric(query) == "payment_ratio" and lowest:
        kind = "lowest_payment_ratio"
    elif filters.predicted_default:
        kind = "predicted_default"
    elif filters.risk_category or re.search(r"\b(?:riskiest|risky|highest risk|most at risk|at[\s-]risk)\b", query, re.I):
        kind = "lowest_risk" if lowest or filters.risk_category == "Low Risk" else "highest_risk"
    elif re.search(r"\bsafest\b", query, re.I):
        kind = "lowest_risk"
    elif _metric(query) in ("risk_score", "default_probability"):
        threshold = _threshold(query, _metric(query))
        kind = "lowest_risk" if lowest or (threshold and threshold[1] in ("<", "<=")) else "highest_risk"
    else:
        return None
    threshold = _threshold(query, _metric(query) or _DEFAULT_THRESHOLD_METRIC.get(kind))
    return RoutedQuery(query, "retrieval_query", retrieval=kind, conditions=conditions, filters=filters, limit=limit,
                       threshold=threshold)


def route_repayx_query(query: str, profile_values: Mapping[str, list[str]] | None = None) -> RoutedQuery:
    """Decide how a question is answered. `profile_values` lists known values per profile field."""
    text = " ".join(query.split())
    customer_ids = extract_customer_ids(text)
    if customer_ids:
        return RoutedQuery(text, "customer_query", customer_ids=customer_ids)

    filters = _filters(text, profile_values)
    routed = _aggregate(text, filters) or _retrieval(text, filters)
    if routed:
        return routed
    return RoutedQuery(text, "general_retrieval", filters=filters, limit=_limit(text))
