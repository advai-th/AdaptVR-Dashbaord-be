"""
src/labeling.py
================
STAGE 3 — Learner State Labeling

PURPOSE
-------
Takes a canonically-transformed DataFrame and assigns each row a
Learner State label: "Low", "Medium", or "High".

WHY A COMPOSITE SCORE?
----------------------
No single feature tells the whole story.  A student who takes a long
time but never asks for hints and rarely errors is very different from
one who is fast but makes lots of mistakes.  So we combine all signals
into one number — the composite score — and then threshold it.

COMPOSITE SCORE FORMULA
-----------------------
    score = w1 * (1 - error_rate)        # accuracy component
          + w2 * (1 - avg_response_time)  # speed component (inverted: lower time is better)
          + w3 * (1 - hint_requests)      # self-sufficiency (less help-seeking = more capable)
          + w4 * (1 - idle_time)          # engagement (less idle = more engaged)
          + w5 * engagement_score         # direct performance signal

    Default weights: [0.30, 0.20, 0.20, 0.15, 0.15]
    Sum of weights = 1.0

WHY PERCENTILE-BASED THRESHOLDS?
---------------------------------
Fixed thresholds (e.g., score < 0.4 = Low) break when datasets have
different score distributions.  Percentile-based thresholds adapt to
*this dataset's* distribution, ensuring we always get a reasonable
balance of Low/Medium/High — even on proxy data.

Default thresholds:
    Low    : bottom 33rd percentile
    Medium : 33rd – 66th percentile
    High   : above 66th percentile

These are configurable via the 'thresholds' parameter.
"""

import numpy as np
import pandas as pd
from typing import Dict, Optional, List


# Default weights for the composite score formula.
# Adjust these based on domain expertise once you have VR data.
DEFAULT_WEIGHTS = {
    "accuracy":      0.30,   # (1 - error_rate) — most important signal
    "speed":         0.20,   # (1 - avg_response_time)
    "self_reliance": 0.20,   # (1 - hint_requests)
    "engagement":    0.15,   # direct engagement_score
    "focus":         0.15,   # (1 - idle_time)
}

# Default percentile cut-points for Low/Medium/High
DEFAULT_THRESHOLDS = {
    "low_pct":  33,   # bottom 33% → Low
    "high_pct": 66,   # top 34%   → High
    # Everything between low_pct and high_pct → Medium
}


def compute_composite_score(
    df: pd.DataFrame,
    weights: Optional[Dict[str, float]] = None,
) -> pd.Series:
    """
    Computes a scalar composite score in [0, 1] for each student row.

    Parameters
    ----------
    df      : DataFrame with the 5 canonical features (all normalized to [0,1]).
    weights : Dict with keys matching DEFAULT_WEIGHTS. If None, uses defaults.

    Returns
    -------
    pd.Series of composite scores, one per row.

    Notes
    -----
    All input features are expected to already be normalized to [0,1]
    by feature_engineering.py.  Higher score = better learner state.
    """
    if weights is None:
        weights = DEFAULT_WEIGHTS

    # Validate weights sum to ~1.0
    total = sum(weights.values())
    if abs(total - 1.0) > 0.01:
        print(f"  [WARN] Weights sum to {total:.3f}, not 1.0. Normalizing automatically.")
        weights = {k: v / total for k, v in weights.items()}

    # --- Build each component ---
    # For error_rate, hint_requests, idle_time, and avg_response_time:
    # a HIGHER value is WORSE, so we invert them (1 - value).
    accuracy     = 1.0 - df["error_rate"]          # more accuracy = better
    speed        = 1.0 - df["avg_response_time"]   # faster = better
    self_reliance = 1.0 - df["hint_requests"]      # less hints needed = better
    focus        = 1.0 - df["idle_time"]            # less idle = more focused
    engagement   = df["engagement_score"]           # higher is directly better

    # --- Weighted sum ---
    score = (
        weights["accuracy"]      * accuracy
        + weights["speed"]       * speed
        + weights["self_reliance"] * self_reliance
        + weights["focus"]       * focus
        + weights["engagement"]  * engagement
    )

    return score.clip(0.0, 1.0)   # clamp to [0, 1] just in case


def assign_labels_from_score(
    scores: pd.Series,
    thresholds: Optional[Dict[str, int]] = None,
) -> pd.Series:
    """
    Converts composite scores to Low/Medium/High labels using
    percentile-based thresholds.

    Parameters
    ----------
    scores     : pd.Series of composite scores in [0, 1].
    thresholds : Dict with 'low_pct' and 'high_pct' keys (percentiles).
                 Defaults to {"low_pct": 33, "high_pct": 66}.

    Returns
    -------
    pd.Series of string labels: "Low", "Medium", or "High".

    Why percentiles?
    ----------------
    Percentile boundaries mean "the bottom 33% of this dataset = Low"
    rather than a fixed score cutoff.  This makes the labeler portable
    across datasets with different score ranges.

    Note: This WILL be recalibrated on real VR data — the percentile
    boundaries should shift once you have ground-truth annotations.
    """
    if thresholds is None:
        thresholds = DEFAULT_THRESHOLDS

    low_cut  = np.percentile(scores, thresholds["low_pct"])
    high_cut = np.percentile(scores, thresholds["high_pct"])

    print(f"\n  Label thresholds (from percentiles):")
    print(f"    Low    : score < {low_cut:.3f}  (≤ {thresholds['low_pct']}th percentile)")
    print(f"    Medium : {low_cut:.3f} ≤ score ≤ {high_cut:.3f}")
    print(f"    High   : score > {high_cut:.3f}  (> {thresholds['high_pct']}th percentile)")

    labels = pd.cut(
        scores,
        bins=[-np.inf, low_cut, high_cut, np.inf],
        labels=["Low", "Medium", "High"],
    )
    return labels.astype(str)


def label_from_existing(df: pd.DataFrame, raw_label_map: Dict[str, str]) -> pd.Series:
    """
    Converts a pre-existing label column (_raw_label) to our standard
    Low/Medium/High labels using a mapping from feature_map.yaml.

    Used for xAPI-Edu-Data, which already has its own L/M/H labels.
    We convert those directly rather than re-deriving from the score,
    which preserves the dataset's original ground truth.

    Parameters
    ----------
    df           : DataFrame containing a '_raw_label' column.
    raw_label_map: Dict like {"L": "Low", "M": "Medium", "H": "High"}.

    Returns
    -------
    pd.Series of mapped label strings.
    """
    if "_raw_label" not in df.columns:
        raise ValueError("DataFrame has no '_raw_label' column.")

    mapped = df["_raw_label"].map(raw_label_map)

    # Check for any unmapped values and warn
    unmapped = mapped.isnull().sum()
    if unmapped > 0:
        unique_raw = df["_raw_label"].unique()
        print(f"  [WARN] {unmapped} rows had unrecognised labels: {unique_raw}")
        print(f"         Filling unmapped rows with 'Medium'.")
        mapped.fillna("Medium", inplace=True)

    return mapped


def run_stage3(
    df_xapi: pd.DataFrame = None,
    df_uci: pd.DataFrame = None,
    df_sse: pd.DataFrame = None,
    weights: Optional[Dict[str, float]] = None,
    thresholds: Optional[Dict[str, int]] = None,
    harmonize_labels: bool = True,
) -> tuple:
    """
    Stage 3 entry point: adds a 'learner_state' column to all datasets.

    All three datasets use the composite score formula for label consistency
    (harmonize_labels=True by default since Session 3).

    Returns
    -------
    tuple: (df_xapi_labeled, df_uci_labeled, df_sse_labeled)
    """
    import os, yaml
    ML_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    PROCESSED = os.path.join(ML_ROOT, "data", "processed")
    FEATURE_MAP_PATH = os.path.join(ML_ROOT, "src", "feature_map.yaml")

    feature_map = yaml.safe_load(open(FEATURE_MAP_PATH, "r", encoding="utf-8"))

    results = {}

    # ── xAPI: use composite score OR existing label ───────────────────
    if df_xapi is not None:
        df_xapi = df_xapi.copy()

        if harmonize_labels:
            print("\n[->] Labeling xAPI dataset (harmonized -- using composite score)...")
            df_xapi.drop(columns=["_raw_label"], errors="ignore", inplace=True)
            scores = compute_composite_score(df_xapi, weights=weights)
            df_xapi["_composite_score"] = scores
            df_xapi["learner_state"] = assign_labels_from_score(scores, thresholds)
        else:
            print("\n[->] Labeling xAPI dataset (using existing L/M/H labels)...")
            label_map = feature_map["datasets"]["xapi_edu"]["label_mapping"]
            df_xapi["learner_state"] = label_from_existing(df_xapi, label_map)
            df_xapi.drop(columns=["_raw_label"], errors="ignore", inplace=True)

        print("  Label distribution:")
        print(df_xapi["learner_state"].value_counts().to_string())

        out_path = os.path.join(PROCESSED, "xapi_edu_labeled.csv")
        df_xapi.to_csv(out_path, index=False)
        print(f"  [OK] Saved to: {out_path}")
        results["xapi_edu"] = df_xapi

    # ── UCI: derive label from composite score ────────────────────────
    if df_uci is not None:
        print("\n[->] Labeling UCI dataset (deriving from composite score)...")
        df_uci = df_uci.copy()
        df_uci.drop(columns=["_raw_label"], errors="ignore", inplace=True)

        scores = compute_composite_score(df_uci, weights=weights)
        df_uci["_composite_score"] = scores
        df_uci["learner_state"] = assign_labels_from_score(scores, thresholds)

        print("\n  Label distribution:")
        print(df_uci["learner_state"].value_counts().to_string())

        out_path = os.path.join(PROCESSED, "uci_student_labeled.csv")
        df_uci.to_csv(out_path, index=False)
        print(f"  [OK] Saved to: {out_path}")
        results["uci_student"] = df_uci

    # ── SuperSimpleEnglish: derive label from composite score ─────────
    if df_sse is not None:
        print("\n[->] Labeling SuperSimpleEnglish dataset (composite score)...")
        df_sse = df_sse.copy()
        df_sse.drop(columns=["_raw_label"], errors="ignore", inplace=True)

        scores = compute_composite_score(df_sse, weights=weights)
        df_sse["_composite_score"] = scores
        df_sse["learner_state"] = assign_labels_from_score(scores, thresholds)

        print("\n  Label distribution:")
        print(df_sse["learner_state"].value_counts().to_string())

        out_path = os.path.join(PROCESSED, "super_simple_english_labeled.csv")
        df_sse.to_csv(out_path, index=False)
        print(f"  [OK] Saved to: {out_path}")
        results["super_simple_english"] = df_sse

    return (results.get("xapi_edu"),
            results.get("uci_student"),
            results.get("super_simple_english"))



if __name__ == "__main__":
    import os, pandas as pd
    ML_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    PROCESSED = os.path.join(ML_ROOT, "data", "processed")

    # Load canonicalized data from Stage 2 output
    df_xapi = pd.read_csv(os.path.join(PROCESSED, "xapi_edu_canonical.csv")) \
        if os.path.exists(os.path.join(PROCESSED, "xapi_edu_canonical.csv")) else None
    df_uci  = pd.read_csv(os.path.join(PROCESSED, "uci_student_canonical.csv")) \
        if os.path.exists(os.path.join(PROCESSED, "uci_student_canonical.csv")) else None

    run_stage3(df_xapi, df_uci)
