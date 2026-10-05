"""Application cleaning, feature assembly, and the sklearn preprocessing pipeline.

Feature engineering that needs domain rules (anomaly fixes, ratios, log
amounts) happens here in pandas, before the model. The fitted model is a
plain sklearn Pipeline of built-in transformers, so loading it never depends
on project code.
"""

from __future__ import annotations

from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

from ml.features.installment_features import CUSTOMER_FEATURES

ID_COLUMN = "SK_ID_CURR"
TARGET_COLUMN = "TARGET"

# Shown on the customer profile; not all of them are model inputs.
PROFILE_COLUMNS = [
    "AMT_INCOME_TOTAL",
    "AMT_CREDIT",
    "AMT_ANNUITY",
    "NAME_INCOME_TYPE",
    "NAME_EDUCATION_TYPE",
    "NAME_FAMILY_STATUS",
    "OCCUPATION_TYPE",
]

RAW_NUMERIC = [
    "AMT_INCOME_TOTAL",
    "AMT_CREDIT",
    "AMT_ANNUITY",
    "AMT_GOODS_PRICE",
    "CNT_CHILDREN",
    "CNT_FAM_MEMBERS",
    "DAYS_BIRTH",
    "DAYS_EMPLOYED",
    "DAYS_REGISTRATION",
    "DAYS_ID_PUBLISH",
    "DAYS_LAST_PHONE_CHANGE",
    "OWN_CAR_AGE",
    "REGION_POPULATION_RELATIVE",
    "REGION_RATING_CLIENT",
    "REGION_RATING_CLIENT_W_CITY",
    "EXT_SOURCE_1",
    "EXT_SOURCE_2",
    "EXT_SOURCE_3",
    "FLAG_WORK_PHONE",
    "FLAG_PHONE",
    "REG_CITY_NOT_LIVE_CITY",
    "REG_CITY_NOT_WORK_CITY",
    "DEF_30_CNT_SOCIAL_CIRCLE",
    "DEF_60_CNT_SOCIAL_CIRCLE",
    "AMT_REQ_CREDIT_BUREAU_YEAR",
    "FLAG_DOCUMENT_3",
]

CATEGORICAL_FEATURES = [
    "NAME_CONTRACT_TYPE",
    "FLAG_OWN_CAR",
    "FLAG_OWN_REALTY",
    "NAME_INCOME_TYPE",
    "NAME_EDUCATION_TYPE",
    "NAME_HOUSING_TYPE",
    "OCCUPATION_TYPE",
    "ORGANIZATION_TYPE",
]

# Deliberately not used as model inputs.
EXCLUDED_FEATURES = {
    "CODE_GENDER": "Protected attribute (sex); excluded from risk scoring.",
    "NAME_FAMILY_STATUS": "Marital status is a protected attribute in many lending regimes; shown on the profile only.",
}

ENGINEERED_NUMERIC = [
    "DAYS_EMPLOYED_ANOMALY",
    "CREDIT_INCOME_RATIO",
    "ANNUITY_INCOME_RATIO",
    "CREDIT_TERM_RATIO",
    "GOODS_CREDIT_RATIO",
    "EMPLOYED_TO_AGE_RATIO",
    "HAS_INSTALLMENT_HISTORY",
]

NUMERIC_FEATURES = RAW_NUMERIC + ENGINEERED_NUMERIC + CUSTOMER_FEATURES
MODEL_FEATURES = NUMERIC_FEATURES + CATEGORICAL_FEATURES

# Heavily skewed money amounts are log-transformed for the linear model.
LOG_FEATURES = [
    "AMT_INCOME_TOTAL",
    "AMT_CREDIT",
    "AMT_ANNUITY",
    "AMT_GOODS_PRICE",
    "TOTAL_INSTALLMENT_AMOUNT",
    "TOTAL_PAYMENT_AMOUNT",
    "AVG_INSTALLMENT_AMOUNT",
    "AVG_PAYMENT_AMOUNT",
    "TOTAL_UNPAID_AMOUNT",
]

DAYS_EMPLOYED_SENTINEL = 365243  # Dataset placeholder for "not employed / unknown".


def load_applications(path: Path, require_target: bool) -> pd.DataFrame:
    wanted = {ID_COLUMN, *RAW_NUMERIC, *CATEGORICAL_FEATURES, *PROFILE_COLUMNS}
    if require_target:
        wanted.add(TARGET_COLUMN)
    df = pd.read_csv(path, usecols=lambda c: c in wanted)
    missing = wanted - set(df.columns)
    if missing:
        raise ValueError(f"Application file is missing columns: {sorted(missing)}")
    if df[ID_COLUMN].duplicated().any():
        raise ValueError("Application file has duplicate SK_ID_CURR values.")
    return df


def clean_applications(app: pd.DataFrame) -> pd.DataFrame:
    out = app.copy()
    anomaly = out["DAYS_EMPLOYED"] == DAYS_EMPLOYED_SENTINEL
    out["DAYS_EMPLOYED_ANOMALY"] = anomaly.astype("int8")
    out.loc[anomaly, "DAYS_EMPLOYED"] = np.nan
    for col in CATEGORICAL_FEATURES:
        out[col] = out[col].replace("XNA", np.nan)
    return out


def add_application_ratios(app: pd.DataFrame) -> pd.DataFrame:
    out = app.copy()
    out["CREDIT_INCOME_RATIO"] = out["AMT_CREDIT"] / out["AMT_INCOME_TOTAL"]
    out["ANNUITY_INCOME_RATIO"] = out["AMT_ANNUITY"] / out["AMT_INCOME_TOTAL"]
    out["CREDIT_TERM_RATIO"] = out["AMT_ANNUITY"] / out["AMT_CREDIT"]
    out["GOODS_CREDIT_RATIO"] = out["AMT_GOODS_PRICE"] / out["AMT_CREDIT"]
    out["EMPLOYED_TO_AGE_RATIO"] = out["DAYS_EMPLOYED"] / out["DAYS_BIRTH"]
    ratio_cols = ["CREDIT_INCOME_RATIO", "ANNUITY_INCOME_RATIO", "CREDIT_TERM_RATIO", "GOODS_CREDIT_RATIO", "EMPLOYED_TO_AGE_RATIO"]
    out[ratio_cols] = out[ratio_cols].replace([np.inf, -np.inf], np.nan)
    return out


def assemble_customer_frame(app: pd.DataFrame, installment_features: pd.DataFrame) -> pd.DataFrame:
    """One row per application, joined to repayment history (left join on SK_ID_CURR).

    Customers without installment history keep NaN repayment features and get
    HAS_INSTALLMENT_HISTORY = 0; missing history is not treated as perfect repayment.
    """
    frame = add_application_ratios(clean_applications(app))
    frame = frame.merge(installment_features, how="left", left_on=ID_COLUMN, right_index=True, validate="one_to_one")
    frame["HAS_INSTALLMENT_HISTORY"] = frame["INSTALLMENT_COUNT"].notna().astype("int8")
    return frame


def model_inputs(frame: pd.DataFrame) -> pd.DataFrame:
    """Select model columns and apply log transforms. Never includes TARGET."""
    X = frame[MODEL_FEATURES].copy()
    for col in LOG_FEATURES:
        X[col] = np.log1p(X[col].clip(lower=0))
    for col in CATEGORICAL_FEATURES:
        X[col] = X[col].astype("object")
    return X


def build_preprocessor() -> ColumnTransformer:
    numeric = Pipeline([("impute", SimpleImputer(strategy="median")), ("scale", StandardScaler())])
    categorical = Pipeline(
        [
            ("impute", SimpleImputer(strategy="constant", fill_value="MISSING")),
            ("encode", OneHotEncoder(handle_unknown="ignore", min_frequency=50, sparse_output=False)),
        ]
    )
    return ColumnTransformer(
        [("numeric", numeric, NUMERIC_FEATURES), ("categorical", categorical, CATEGORICAL_FEATURES)],
        verbose_feature_names_out=False,
    )
