"""
src/tune.py
============
Fix #2 — Hyperparameter Tuning

PURPOSE
-------
Finds the best XGBoost hyperparameters for our combined dataset using
RandomizedSearchCV with cross-validation, then saves the best params
to models/best_params.json so train.py can load and use them.

WHY RANDOMIZED SEARCH (not grid search)?
-----------------------------------------
Grid search tries every single combination of parameters, which
becomes very slow exponentially as you add more parameters.
Randomized search samples N random combinations from the full
parameter space — it's much faster and usually finds near-optimal
parameters within ~60-80% fewer trials.

CROSS-VALIDATION (cv=5)
-----------------------
Instead of one fixed train/test split, we train and evaluate on
5 different splits of the data and average the scores. This gives
a much more reliable estimate of how the model will perform on unseen
data, and prevents accidentally picking parameters that happen to work
well on one particular split.

HOW TO RUN
----------
    cd ml
    python src/tune.py

Takes ~2–5 minutes. Results saved to models/best_params.json.
Then run the full pipeline: python run_pipeline.py
"""

import os
import sys
import json
import numpy as np
import pandas as pd

import xgboost as xgb
from sklearn.model_selection import RandomizedSearchCV, StratifiedKFold
from sklearn.preprocessing import LabelEncoder

# ── Paths ─────────────────────────────────────────────────────────────
ML_ROOT   = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODELS    = os.path.join(ML_ROOT, "models")
PROCESSED = os.path.join(ML_ROOT, "data", "processed")

FEATURE_COLUMNS = [
    "error_rate",
    "avg_response_time",
    "hint_requests",
    "idle_time",
    "engagement_score",
]

# ── Hyperparameter search space ────────────────────────────────────────
# Each key is an XGBoost parameter; each value is a list of candidates
# to sample from during the random search.
#
# Plain-language explanation of each parameter:
#
#  max_depth       : How many levels deep each decision tree can go.
#                    Deeper = more complex patterns learned, but also
#                    more risk of memorizing training data (overfitting).
#                    Range 3–7 is typical for small/medium datasets.
#
#  learning_rate   : How big a step the model takes each round.
#                    Smaller = more rounds needed but smoother convergence.
#                    Larger = faster but may overshoot the optimum.
#
#  subsample       : What fraction of training rows to use per tree.
#                    < 1.0 introduces randomness → reduces overfitting.
#
#  colsample_bytree: What fraction of features (columns) to use per tree.
#                    With only 5 features, values close to 1.0 make sense.
#
#  min_child_weight: Minimum number of samples required in a leaf node.
#                    Higher = more conservative splits → less overfitting.
#
#  gamma           : Minimum loss reduction needed to make a split.
#                    Higher = more conservative → fewer splits → simpler trees.
#
#  reg_alpha       : L1 regularization (like Lasso). Pushes some feature
#                    weights to exactly 0, creating sparse trees.
#
#  reg_lambda      : L2 regularization (like Ridge). Shrinks weights
#                    toward 0 without zeroing them out.

PARAM_GRID = {
    "max_depth":          [3, 4, 5, 6, 7],
    "learning_rate":      [0.01, 0.05, 0.1, 0.15, 0.2],
    "subsample":          [0.6, 0.7, 0.8, 0.9, 1.0],
    "colsample_bytree":   [0.7, 0.8, 0.9, 1.0],
    "min_child_weight":   [1, 3, 5, 7, 10],
    "gamma":              [0, 0.1, 0.2, 0.5, 1.0],
    "reg_alpha":          [0, 0.01, 0.1, 0.5, 1.0],
    "reg_lambda":         [0.5, 1.0, 1.5, 2.0, 5.0],
}


def load_combined_data():
    """
    Loads and combines both labeled datasets.
    Returns X (features), y (encoded labels), and the LabelEncoder.
    """
    frames = []
    for fname in ["xapi_edu_labeled.csv", "uci_student_labeled.csv"]:
        path = os.path.join(PROCESSED, fname)
        if os.path.exists(path):
            df = pd.read_csv(path)
            df.drop(columns=["_composite_score"], errors="ignore", inplace=True)
            frames.append(df)

    if not frames:
        raise FileNotFoundError(
            "No labeled datasets found. Run Stages 1–3 first (python run_pipeline.py --stage 3)."
        )

    combined = pd.concat(frames, ignore_index=True)
    X = combined[FEATURE_COLUMNS].values
    y_raw = combined["learner_state"].values

    le = LabelEncoder()
    y = le.fit_transform(y_raw)

    print(f"  Loaded {len(combined)} rows for tuning.")
    print(f"  Label distribution: {dict(zip(*np.unique(y_raw, return_counts=True)))}")
    return X, y, le


def run_tuning(n_iter: int = 50, cv_folds: int = 5, random_state: int = 42) -> dict:
    """
    Runs RandomizedSearchCV to find the best XGBoost hyperparameters.

    Parameters
    ----------
    n_iter      : Number of random parameter combinations to try.
                  More = better chance of finding optimum, but slower.
                  50 is a good balance for our dataset size.
    cv_folds    : Number of cross-validation folds.
                  5 is standard — each fold uses 80% train / 20% val.
    random_state: For reproducibility.

    Returns
    -------
    dict of best parameters (also saved to models/best_params.json)
    """
    print("=" * 55)
    print(f" Hyperparameter Tuning — {n_iter} random combinations × {cv_folds}-fold CV")
    print("=" * 55)

    X, y, le = load_combined_data()

    # Base model — we'll override with tuned params after search
    base_model = xgb.XGBClassifier(
        objective="multi:softprob",
        num_class=3,
        n_estimators=300,       # fixed during search; early stopping not used in CV
        eval_metric="mlogloss",
        random_state=random_state,
        tree_method="hist",
    )

    # StratifiedKFold ensures each fold has the same class proportions
    # (important when classes are slightly imbalanced)
    cv = StratifiedKFold(n_splits=cv_folds, shuffle=True, random_state=random_state)

    search = RandomizedSearchCV(
        estimator=base_model,
        param_distributions=PARAM_GRID,
        n_iter=n_iter,
        scoring="f1_macro",     # optimise for macro-F1 (balanced across all 3 classes)
        cv=cv,
        verbose=1,              # print progress
        random_state=random_state,
        n_jobs=-1,              # use all CPU cores
        refit=True,             # refit best model on full data after search
    )

    print(f"\n[…] Running search (this may take a few minutes)…\n")
    search.fit(X, y)

    best_params = search.best_params_
    best_score  = search.best_score_

    print(f"\n[✓] Search complete!")
    print(f"    Best Macro-F1 (CV): {best_score:.4f}")
    print(f"\n    Best parameters found:")
    for k, v in sorted(best_params.items()):
        print(f"      {k:25s}: {v}")

    # Save best params to disk so train.py can load them
    os.makedirs(MODELS, exist_ok=True)
    out_path = os.path.join(MODELS, "best_params.json")
    with open(out_path, "w") as f:
        json.dump(best_params, f, indent=2)
    print(f"\n    [✓] Saved to: {out_path}")
    print(f"    Re-run the pipeline to train with these parameters:")
    print(f"    python run_pipeline.py")

    return best_params


if __name__ == "__main__":
    run_tuning(n_iter=50, cv_folds=5)
