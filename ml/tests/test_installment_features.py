import math

import numpy as np
import pandas as pd
import pytest

from ml.features.installment_features import CUSTOMER_FEATURES, build_installment_features, collapse_to_installments

COLUMNS = ["SK_ID_PREV", "SK_ID_CURR", "NUM_INSTALMENT_VERSION", "NUM_INSTALMENT_NUMBER",
           "DAYS_INSTALMENT", "DAYS_ENTRY_PAYMENT", "AMT_INSTALMENT", "AMT_PAYMENT"]


def rows(*records):
    return pd.DataFrame(records, columns=COLUMNS)


def test_partial_payments_are_collapsed_to_one_installment():
    raw = rows(
        # One installment of 100 paid in two parts; final part 3 days late.
        (1, 10, 1.0, 1, -100.0, -101.0, 100.0, 60.0),
        (1, 10, 1.0, 1, -100.0, -97.0, 100.0, 40.0),
    )
    collapsed = collapse_to_installments(raw)
    assert len(collapsed) == 1
    row = collapsed.iloc[0]
    assert row.AMT_INSTALMENT == 100.0 and row.AMT_PAYMENT == 100.0 and row.DAYS_ENTRY_PAYMENT == -97.0

    features = build_installment_features(raw).loc[10]
    assert features.INSTALLMENT_COUNT == 1
    assert features.TOTAL_INSTALLMENT_AMOUNT == 100.0  # not double-counted as 200
    assert features.UNDERPAID_COUNT == 0 and features.TOTAL_UNPAID_AMOUNT == 0.0
    assert features.LATE_PAYMENT_COUNT == 1 and features.MAX_DAYS_LATE == 3.0
    assert features.PAYMENT_RATIO == 1.0


def test_customer_aggregates():
    raw = rows(
        (1, 7, 1.0, 1, -90.0, -95.0, 100.0, 100.0),   # 5 days early
        (1, 7, 1.0, 2, -60.0, -54.0, 100.0, 100.0),   # 6 days late
        (1, 7, 1.0, 3, -30.0, -28.0, 100.0, 80.0),    # 2 days late, underpaid by 20
        (2, 7, 1.0, 1, -20.0, -20.0, 50.0, 50.0),     # on time
    )
    f = build_installment_features(raw).loc[7]
    assert f.INSTALLMENT_COUNT == 4
    assert f.TOTAL_INSTALLMENT_AMOUNT == 350.0 and f.TOTAL_PAYMENT_AMOUNT == 330.0
    assert f.AVG_INSTALLMENT_AMOUNT == 87.5 and f.AVG_PAYMENT_AMOUNT == 82.5
    assert f.LATE_PAYMENT_COUNT == 2 and f.LATE_PAYMENT_RATE == 0.5
    assert f.AVG_DAYS_LATE == pytest.approx((0 + 6 + 2 + 0) / 4)
    assert f.MAX_DAYS_LATE == 6.0
    assert f.UNDERPAID_COUNT == 1 and f.UNDERPAID_RATE == 0.25
    assert f.TOTAL_UNPAID_AMOUNT == pytest.approx(20.0)
    assert f.PAYMENT_RATIO == pytest.approx(330 / 350)


def test_missing_payment_counts_as_underpaid_not_late_or_on_time():
    raw = rows(
        (1, 5, 1.0, 1, -60.0, -60.0, 100.0, 100.0),
        (1, 5, 1.0, 2, -30.0, np.nan, 100.0, np.nan),
    )
    f = build_installment_features(raw).loc[5]
    assert f.INSTALLMENT_COUNT == 2
    assert f.UNDERPAID_COUNT == 1 and f.TOTAL_UNPAID_AMOUNT == 100.0
    assert f.LATE_PAYMENT_COUNT == 0
    assert f.LATE_PAYMENT_RATE == 0.0  # over the one installment with a known payment date
    assert f.PAYMENT_RATIO == 0.5


def test_customer_with_only_missing_payments_has_unknown_late_rate():
    f = build_installment_features(rows((1, 6, 1.0, 1, -30.0, np.nan, 100.0, np.nan))).loc[6]
    assert math.isnan(f.LATE_PAYMENT_RATE) and math.isnan(f.AVG_DAYS_LATE)
    assert f.UNDERPAID_RATE == 1.0


def test_tiny_shortfall_within_tolerance_is_not_underpaid():
    f = build_installment_features(rows((1, 8, 1.0, 1, -30.0, -30.0, 100.004, 100.0))).loc[8]
    assert f.UNDERPAID_COUNT == 0 and f.TOTAL_UNPAID_AMOUNT == 0.0


def test_overpayment_is_not_negative_unpaid():
    f = build_installment_features(rows((1, 9, 1.0, 1, -30.0, -30.0, 100.0, 150.0))).loc[9]
    assert f.TOTAL_UNPAID_AMOUNT == 0.0 and f.PAYMENT_RATIO == 1.5


def test_output_columns_and_index():
    out = build_installment_features(rows((1, 3, 1.0, 1, -30.0, -30.0, 10.0, 10.0), (2, 4, 1.0, 1, -30.0, -31.0, 10.0, 10.0)))
    assert list(out.columns) == CUSTOMER_FEATURES
    assert list(out.index) == [3, 4]
