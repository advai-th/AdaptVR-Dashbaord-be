"""
src/feature_engineering.py
===========================
STAGE 2 — Feature Mapping & Engineering

PURPOSE
-------
Takes a raw dataset (as a DataFrame) + a dataset config from
feature_map.yaml, and transforms it into our CANONICAL schema:

    ┌──────────────────────┬────────────────────────────────────────┐
    │ Canonical Feature    │ What it represents                     │
    ├──────────────────────┼────────────────────────────────────────┤
    │ error_rate           │ Proportion of wrong answers / actions  │
    │ avg_response_time    │ Mean time per task (higher = slower)   │
    │ hint_requests        │ Number of help / hint requests         │
    │ idle_time            │ Pause / inactivity duration            │
    │ engagement_score     │ Overall performance / engagement score │
    └──────────────────────┴────────────────────────────────────────┘

The output is always the same 5 features, regardless of which dataset
you feed in.  This is the "VR-ready" interface — when real VR data
arrives, you only need to update feature_map.yaml and nothing else.

HOW TO USE
----------
    from src.feature_engineering import transform_dataset
    import yaml, pandas as pd

    config = yaml.safe_load(open("src/feature_map.yaml"))["datasets"]["xapi_edu"]
    df_raw = pd.read_csv("data/raw/xAPI-Edu-Data.csv")
    df_canonical = transform_dataset(df_raw, config, dataset_name="xapi_edu")
"""

import os
import yaml
import numpy as np
import pandas as pd

# Canonical feature names — these NEVER change across datasets
CANONICAL_FEATURES = [
    "error_rate",
    "avg_response_time",
    "hint_requests",
    "idle_time",
    "engagement_score",
]

ML_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FEATURE_MAP_PATH = os.path.join(ML_ROOT, "src", "feature_map.yaml")


def load_feature_map(path: str = FEATURE_MAP_PATH) -> dict:
    """Load and return the full feature_map.yaml as a Python dict."""
    with open(path, "r", encoding="utf-8") as f:
        return yaml.safe_load(f)


def _normalize_column(series: pd.Series) -> pd.Series:
    """
    Min-max normalize a Series to [0, 1].

    Why min-max here instead of z-score?
    XGBoost doesn't need normalisation for training, but normalisation
    makes features comparable when we compute the composite labeling
    score in Stage 3.  Min-max keeps things interpretable (0 = min, 1 = max).

    Edge case: if all values are the same, return 0.5 uniformly.
    """
    mn, mx = series.min(), series.max()
    if mx == mn:
        return pd.Series(0.5, index=series.index)
    return (series - mn) / (mx - mn)


def _derive_error_rate(df: pd.DataFrame, config: dict) -> pd.Series:
    """
    Derives error_rate when it's not directly available.

    ASSUMPTION (xAPI dataset):
        error_rate = 1 - normalized(engagement_score)
    Rationale: a student who visits many resources and engages heavily
    is less likely to be making errors.  This is an *imperfect* proxy —
    flag for replacement with real incorrect-action counts from VR logs.

    ASSUMPTION (general):
        If the dataset already has error_rate mapped, this function is
        not called.
    """
    derived_cfg = config.get("derived_features", {}).get("error_rate", {})
    method = derived_cfg.get("method", "complement_of_engagement")
    source_col = derived_cfg.get("source_column", "engagement_score")

    if source_col not in df.columns:
        # Fall back to zeros if we have no basis for derivation
        print(
            f"  [WARN] Cannot derive error_rate — '{source_col}' not found."
            " Filling with 0.0 (update feature_map.yaml when real data arrives)."
        )
        return pd.Series(0.0, index=df.index)

    if method == "complement_of_engagement":
        # Invert: high engagement → low error rate
        normalized = _normalize_column(df[source_col])
        return 1.0 - normalized

    # Unknown method — return zeros and warn
    print(f"  [WARN] Unknown derivation method '{method}'. Filling error_rate with 0.0.")
    return pd.Series(0.0, index=df.index)


def _invert_column(series: pd.Series) -> pd.Series:
    """
    Inverts a normalized column: high values become low and vice versa.

    Used for avg_response_time in the UCI dataset where the raw column
    (studytime) is 1–4 with 4 = most study time, meaning a *higher*
    studytime should correspond to *faster* (lower) response time.
    So we invert it to match the canonical direction.
    """
    normalized = _normalize_column(series)
    return 1.0 - normalized


def transform_dataset(
    df_raw: pd.DataFrame,
    dataset_config: dict,
    dataset_name: str = "unknown",
) -> pd.DataFrame:
    """
    Transforms a raw DataFrame into the canonical 5-feature schema.

    Parameters
    ----------
    df_raw         : Raw DataFrame straight from pd.read_csv().
    dataset_config : The config block for this dataset from feature_map.yaml.
    dataset_name   : Used for logging messages only.

    Returns
    -------
    pd.DataFrame with exactly the columns in CANONICAL_FEATURES,
    plus a '_raw_label' column if the dataset has one (used in Stage 3).
    """
    print(f"\n[→] Transforming dataset: {dataset_name}")

    # Work on a copy so we never modify the original DataFrame
    df = df_raw.copy()

    # ── STEP 1: Drop dataset-specific / demographic columns ──────────
    # These columns don't generalise to a VR context.  Keeping them
    # would risk the model learning shortcuts from demographics instead
    # of genuine behavioral signals.
    drop_cols = dataset_config.get("drop_columns", [])
    present_drops = [c for c in drop_cols if c in df.columns]
    df.drop(columns=present_drops, inplace=True)
    print(f"  Dropped {len(present_drops)} demographic/artifact columns.")

    # ── STEP 2: Apply column mappings ────────────────────────────────
    # Rename raw columns to their canonical counterparts.
    col_mappings = dataset_config.get("column_mappings", {})
    rename_map = {}
    for raw_col, canonical_col in col_mappings.items():
        if raw_col == "_placeholder":
            continue   # Skip the placeholder entry for vr_telemetry
        if raw_col in df.columns:
            rename_map[raw_col] = canonical_col
        else:
            print(f"  [WARN] Column '{raw_col}' not found in data — skipping.")
    df.rename(columns=rename_map, inplace=True)

    # ── STEP 3: Derive missing canonical features ─────────────────────
    # If a canonical feature still isn't present, try to derive it.
    for feature in CANONICAL_FEATURES:
        if feature not in df.columns:
            if feature == "error_rate":
                print(f"  Deriving 'error_rate' (not directly available)…")
                df["error_rate"] = _derive_error_rate(df, dataset_config)
            else:
                # No derivation rule — fill with 0 and warn
                print(
                    f"  [WARN] '{feature}' not found and no derivation rule exists."
                    " Filling with 0.0."
                )
                df[feature] = 0.0

    # ── STEP 4: Special post-processing per dataset ───────────────────
    #
    # UCI studytime is coded 1–4 (1=low, 4=high).  We mapped it to
    # avg_response_time, but the direction is REVERSED: more study time
    # → faster response times.  So we invert it.
    #
    # NOTE: This is a dataset-specific assumption documented here so
    # you can revisit it when real VR data (with actual timestamps) is
    # available.
    if dataset_name == "uci_student" and "avg_response_time" in df.columns:
        print("  Inverting 'avg_response_time' (studytime proxy — direction reversed)…")
        df["avg_response_time"] = _invert_column(df["avg_response_time"])

    # ── STEP 5: Handle missing values ────────────────────────────────
    # Simple strategy: median for numeric, 0 for everything else.
    # XGBoost can actually handle NaN natively, but filling early
    # keeps the pipeline clean and explicit.
    before_nulls = df[CANONICAL_FEATURES].isnull().sum().sum()
    if before_nulls > 0:
        for col in CANONICAL_FEATURES:
            if df[col].isnull().any():
                median_val = df[col].median()
                df[col].fillna(median_val, inplace=True)
                print(f"  Filled {df[col].isnull().sum()} NaN(s) in '{col}' with median={median_val:.3f}")

    # ── STEP 6: Normalize all canonical features to [0, 1] ───────────
    # Keeps features on a common scale for the composite labeling score.
    # (XGBoost training itself doesn't need this, but Stage 3 does.)
    for feature in CANONICAL_FEATURES:
        df[feature] = _normalize_column(df[feature])

    # ── STEP 7: Keep only what we need ───────────────────────────────
    keep_cols = CANONICAL_FEATURES.copy()
    if "_raw_label" in df.columns:
        keep_cols.append("_raw_label")
    df_canonical = df[keep_cols].reset_index(drop=True)

    print(f"  [✓] Transformation complete — shape: {df_canonical.shape}")
    print(f"      Columns: {list(df_canonical.columns)}")
    return df_canonical


def _derive_sse_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Applies SuperSimpleEnglish-specific derivations before the generic transform.

    1. error_rate  = WrongAnswers / (RightAnswers + WrongAnswers)
       → Direct ratio from real per-session answer counts.

    2. engagement_score = E_Avg  (already merged from Usability_Engagement sheet)
       → Validated 4-item engagement scale, scored 1–5 per item, averaged.
       → Normalized to [0,1] by the generic normalizer in transform_dataset.

    3. hint_requests = 0.0
       → The app has no hint button — so this feature is absent.
       → We fill with 0 rather than dropping the column so the canonical
          schema stays intact (the model still expects all 5 features).
    """
    df = df.copy()

    # 1. error_rate from actual right/wrong answer counts
    total = df["RightAnswers"] + df["WrongAnswers"]
    df["error_rate"] = (df["WrongAnswers"] / total.replace(0, np.nan)).fillna(0.0)

    # 2. engagement_score from merged E_Avg column
    if "E_Avg" in df.columns:
        df["engagement_score"] = df["E_Avg"]
    else:
        df["engagement_score"] = 0.5   # fallback if merge failed

    # 3. hint_requests — no hint mechanic in this app
    df["hint_requests"] = 0.0

    return df


def run_stage2(df_xapi: pd.DataFrame = None, df_uci: pd.DataFrame = None,
               df_sse: pd.DataFrame = None):

    """
    Stage 2 entry point: transforms all three datasets and saves them.

    Parameters
    ----------
    df_xapi, df_uci : Raw DataFrames from Stage 1.
                      If None, attempts to load from disk.
    df_sse          : SuperSimpleEnglish merged DataFrame from Stage 1.
                      If None, attempts to load from disk (xlsx).

    Returns
    -------
    tuple: (df_xapi_canonical, df_uci_canonical, df_sse_canonical)
    """
    import os
    feature_map = load_feature_map()
    processed_dir = os.path.join(ML_ROOT, "data", "processed")
    os.makedirs(processed_dir, exist_ok=True)

    results = {}

    datasets_to_process = {
        "xapi_edu": (df_xapi, feature_map["datasets"]["xapi_edu"]),
        "uci_student": (df_uci, feature_map["datasets"]["uci_student"]),
    }

    for ds_name, (df_raw, config) in datasets_to_process.items():
        # If caller didn't provide the DataFrame, try loading from disk
        if df_raw is None:
            raw_path = os.path.join(ML_ROOT, config["file"])
            if not os.path.exists(raw_path):
                print(f"[SKIP] {ds_name}: raw file not found at {raw_path}")
                results[ds_name] = None
                continue
            sep = ";" if ds_name == "uci_student" else ","
            df_raw = pd.read_csv(raw_path, sep=sep)

        df_canonical = transform_dataset(df_raw, config, dataset_name=ds_name)

        # Save processed version
        out_path = os.path.join(processed_dir, f"{ds_name}_canonical.csv")
        df_canonical.to_csv(out_path, index=False)
        print(f"  [OK] Saved to: {out_path}")
        results[ds_name] = df_canonical

    # ── SuperSimpleEnglish — special pre-processing needed ───────────
    sse_config = feature_map["datasets"]["super_simple_english"]
    if df_sse is None:
        # Try loading from disk if not passed in
        xlsx_path = os.path.join(ML_ROOT, "data", "raw", "SuperSimpleEnglish_Data.xlsx")
        if os.path.exists(xlsx_path):
            import pandas as _pd
            xl = _pd.ExcelFile(xlsx_path)
            df_tel = xl.parse("Telemetry")
            df_eng = xl.parse("Usability_Engagement")[["User", "E_Avg"]]
            df_sse = df_tel.merge(df_eng, on="User", how="left")
        else:
            print("[SKIP] super_simple_english: xlsx not found")

    if df_sse is not None:
        # Derive features that need special logic before the generic transform
        df_sse_pre = _derive_sse_features(df_sse)
        df_sse_canonical = transform_dataset(df_sse_pre, sse_config,
                                             dataset_name="super_simple_english")
        out_path = os.path.join(processed_dir, "super_simple_english_canonical.csv")
        df_sse_canonical.to_csv(out_path, index=False)
        print(f"  [OK] Saved to: {out_path}")
        results["super_simple_english"] = df_sse_canonical
    else:
        results["super_simple_english"] = None

    return (results.get("xapi_edu"),
            results.get("uci_student"),
            results.get("super_simple_english"))


if __name__ == "__main__":
    # Quick smoke-test: run both stages end-to-end
    from data_loader import run_stage1
    df_xapi_raw, df_uci_raw, df_sse_raw = run_stage1()
    run_stage2(df_xapi_raw, df_uci_raw, df_sse_raw)

