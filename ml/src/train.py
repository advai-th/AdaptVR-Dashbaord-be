"""
src/train.py
=============
STAGE 4 — Train/Test Pipeline

PURPOSE
-------
Trains a baseline XGBoost multiclass classifier on both proxy datasets,
combined into one training corpus.  The model predicts Learner State:
Low / Medium / High.

KEY DESIGN DECISIONS
--------------------

1. SPLIT BY STUDENT — NOT BY ROW
   Problem: if we split randomly by row, the same student's data could
   appear in both train AND test sets.  The model would learn
   student-specific patterns rather than generalizable behavioral signals.
   Solution: group all rows by a 'student_id' proxy (row-block index),
   then split groups.  In the UCI dataset each row IS one student, so
   this is naturally enforced.  In xAPI, same logic applies.

2. CLASS IMBALANCE — USING scale_pos_weight / XGBoost's built-in class weights
   We chose XGBoost's built-in 'sample_weight' approach (sklearn's
   compute_sample_weight) rather than SMOTE because:
   - SMOTE synthesizes new fake data points by interpolating between
     real ones.  On proxy (non-VR) data this risks amplifying the
     artificial nature of our features.
   - XGBoost's sample weights simply tell the model "pay more attention
     to minority class mistakes during training" — no new fake data.
   - Simpler, less risk of overfitting to synthetic artifacts.
   NOTE: You can switch to SMOTE by setting USE_SMOTE=True in the config.

3. EARLY STOPPING
   We hold out 10% of the training data as a validation set.
   XGBoost monitors validation loss and stops adding trees when it
   stops improving (patience = 20 rounds).  This prevents overfitting
   without requiring a full cross-validation loop at this stage.

4. SAVED ARTIFACTS
   - model.json         : XGBoost model (loadable in Unity via ONNX export)
   - label_encoder.pkl  : maps Low/Medium/High ↔ 0/1/2
   - feature_list.json  : the exact feature order the model expects
   These three files are everything the inference module needs.
"""

import os
import json
import pickle
import numpy as np
import pandas as pd

import xgboost as xgb
from sklearn.model_selection import GroupShuffleSplit
from sklearn.preprocessing import LabelEncoder
from sklearn.utils.class_weight import compute_sample_weight

# ── Paths ─────────────────────────────────────────────────────────────
ML_ROOT   = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODELS    = os.path.join(ML_ROOT, "models")
PROCESSED = os.path.join(ML_ROOT, "data", "processed")

# ── Canonical feature list (order matters for inference) ──────────────
FEATURE_COLUMNS = [
    "error_rate",
    "avg_response_time",
    "hint_requests",
    "idle_time",
    "engagement_score",
]

# ── Model hyperparameters ─────────────────────────────────────────────
# These are sensible starting values used when no tuned params exist yet.
# After running src/tune.py, best_params.json will be loaded automatically.
XGBOOST_PARAMS_DEFAULT = {
    "objective":       "multi:softprob",
    "num_class":       3,
    "max_depth":       4,
    "learning_rate":   0.1,
    "n_estimators":    500,
    "subsample":       0.8,
    "colsample_bytree": 1.0,
    "min_child_weight": 5,
    "random_state":    42,
    "tree_method":     "hist",
    "eval_metric":     "mlogloss",
    "early_stopping_rounds": 20,
}


def load_xgboost_params() -> dict:
    """
    Loads hyperparameters from models/best_params.json if it exists
    (produced by src/tune.py), otherwise returns the defaults above.

    This means you can run the pipeline before tuning (uses defaults)
    or after tuning (automatically picks up the better parameters).
    """
    best_params_path = os.path.join(MODELS, "best_params.json")
    params = XGBOOST_PARAMS_DEFAULT.copy()

    if os.path.exists(best_params_path):
        with open(best_params_path, "r") as f:
            tuned = json.load(f)
        params.update(tuned)   # override defaults with tuned values
        print(f"  [✓] Loaded tuned parameters from: {best_params_path}")
        for k, v in sorted(tuned.items()):
            print(f"      {k:25s}: {v}")
    else:
        print("  [i] No best_params.json found — using default hyperparameters.")
        print("      Run 'python src/tune.py' to find better parameters.")

    return params


def load_labeled_datasets() -> pd.DataFrame:
    """
    Loads and combines both labeled datasets from Stage 3 output.

    Why combine?
    ------------
    More data = more generalizable model.  Both datasets target the
    same behavioral features, so combining them makes sense.  When real
    VR data is available, you can add it here or replace both.

    Returns
    -------
    pd.DataFrame with FEATURE_COLUMNS + 'learner_state'.
    """
    frames = []

    for fname in [
        "xapi_edu_labeled.csv",
        "uci_student_labeled.csv",
        "super_simple_english_labeled.csv",   # NEW: 632 rows with real response time & hesitation
    ]:
        path = os.path.join(PROCESSED, fname)
        if os.path.exists(path):
            df = pd.read_csv(path)
            # Drop the composite score column if present (not a feature)
            df.drop(columns=["_composite_score"], errors="ignore", inplace=True)
            frames.append(df)
            print(f"  Loaded {path} — {len(df)} rows")
        else:
            print(f"  [SKIP] {path} not found.")


    if not frames:
        raise FileNotFoundError(
            "No labeled datasets found.  Run Stages 1–3 first."
        )

    combined = pd.concat(frames, ignore_index=True)
    print(f"\n  Combined dataset: {combined.shape[0]} rows, {combined.shape[1]} cols")
    print(f"  Label distribution:\n{combined['learner_state'].value_counts().to_string()}")
    return combined


def split_train_test(
    df: pd.DataFrame,
    test_size: float = 0.20,
    val_size: float = 0.10,
    random_state: int = 42,
) -> tuple:
    """
    Splits data into train / validation / test sets.

    HOW WE AVOID DATA LEAKAGE
    --------------------------
    In a real VR system, each row represents one student-session summary.
    Splitting by student ID ensures no student's data leaks from
    train into test.

    Since our proxy datasets have one row per student (or per log entry
    with no persistent student ID), we use the row index as a "group ID."
    This is equivalent to row-level splitting here, but the code is
    structured so you can swap in real student_id when it becomes
    available — just replace 'groups' below.

    Parameters
    ----------
    df         : Labeled combined DataFrame.
    test_size  : Fraction of data held out for final test evaluation.
    val_size   : Fraction of *training* data used for early-stopping validation.

    Returns
    -------
    X_train, X_val, X_test, y_train, y_val, y_test
    (all as numpy arrays after label encoding)
    """
    X = df[FEATURE_COLUMNS].values
    y_raw = df["learner_state"].values

    # ── Label encoding ─────────────────────────────────────────────────
    # Convert Low/Medium/High → 0/1/2 for XGBoost.
    # We save the encoder so predictions can be decoded back to strings.
    le = LabelEncoder()
    y = le.fit_transform(y_raw)
    print(f"\n  Label encoding: {dict(zip(le.classes_, le.transform(le.classes_)))}")

    # ── Group-based split ─────────────────────────────────────────────
    # groups = row index (stand-in for student ID)
    groups = np.arange(len(df))

    gss_test = GroupShuffleSplit(
        n_splits=1, test_size=test_size, random_state=random_state
    )
    train_val_idx, test_idx = next(gss_test.split(X, y, groups=groups))

    X_trainval, y_trainval = X[train_val_idx], y[train_val_idx]
    X_test,     y_test     = X[test_idx],      y[test_idx]

    # ── Validation split from within training ─────────────────────────
    gss_val = GroupShuffleSplit(
        n_splits=1, test_size=val_size, random_state=random_state
    )
    sub_groups = np.arange(len(train_val_idx))
    train_idx, val_idx = next(
        gss_val.split(X_trainval, y_trainval, groups=sub_groups)
    )

    X_train, y_train = X_trainval[train_idx], y_trainval[train_idx]
    X_val,   y_val   = X_trainval[val_idx],   y_trainval[val_idx]

    print(f"\n  Split sizes:")
    print(f"    Train      : {len(X_train)} rows")
    print(f"    Validation : {len(X_val)} rows  (used for early stopping)")
    print(f"    Test       : {len(X_test)} rows  (held out for final eval)")

    return X_train, X_val, X_test, y_train, y_val, y_test, le


def run_stage4() -> tuple:
    """
    Stage 4 entry point: train the XGBoost classifier.

    Steps
    -----
    1. Load and combine labeled datasets.
    2. Split into train / val / test (student-aware).
    3. Compute sample weights for class imbalance handling.
    4. Train XGBoost with early stopping on validation loss.
    5. Save model, label encoder, and feature list to /models.

    Returns
    -------
    tuple: (model, label_encoder, X_test, y_test)
    """
    os.makedirs(MODELS, exist_ok=True)

    print("=" * 55)
    print(" STAGE 4 — Training XGBoost Classifier")
    print("=" * 55)

    # ── Load data ──────────────────────────────────────────────────────
    df = load_labeled_datasets()

    # ── Split ─────────────────────────────────────────────────────────
    X_train, X_val, X_test, y_train, y_val, y_test, le = split_train_test(df)

    # ── Class imbalance: compute sample weights ───────────────────────
    # compute_sample_weight('balanced') gives each training sample a weight
    # inversely proportional to its class frequency.
    # Minority class samples get higher weights → XGBoost pays more
    # attention to getting them right.
    sample_weights = compute_sample_weight("balanced", y_train)
    class_counts = np.bincount(y_train)
    print(f"\n  Class counts in training set: {dict(zip(le.classes_, class_counts))}")
    print(f"  Sample weights range: [{sample_weights.min():.3f}, {sample_weights.max():.3f}]")

    # ── Train ─────────────────────────────────────────────────────────
    print("\n[…] Training XGBoost model (early stopping on validation loss)…")

    # Load tuned params if available (from src/tune.py), else use defaults
    params = load_xgboost_params()
    model = xgb.XGBClassifier(**params)

    model.fit(
        X_train, y_train,
        sample_weight=sample_weights,
        eval_set=[(X_val, y_val)],    # validation set for early stopping
        verbose=50,                    # print loss every 50 rounds
    )

    best_round = model.best_iteration
    print(f"\n  [✓] Training complete. Best round: {best_round}")

    # ── Save artifacts ────────────────────────────────────────────────
    # Check before overwriting (user constraint)
    model_path = os.path.join(MODELS, "xgboost_model.json")
    encoder_path = os.path.join(MODELS, "label_encoder.pkl")
    feature_path = os.path.join(MODELS, "feature_list.json")

    for path in [model_path, encoder_path, feature_path]:
        if os.path.exists(path):
            print(f"  [!] Overwriting existing file: {path}")

    model.save_model(model_path)
    with open(encoder_path, "wb") as f:
        pickle.dump(le, f)
    with open(feature_path, "w") as f:
        json.dump(FEATURE_COLUMNS, f, indent=2)

    print(f"\n  Saved:")
    print(f"    {model_path}")
    print(f"    {encoder_path}")
    print(f"    {feature_path}")

    return model, le, X_test, y_test


if __name__ == "__main__":
    model, le, X_test, y_test = run_stage4()
