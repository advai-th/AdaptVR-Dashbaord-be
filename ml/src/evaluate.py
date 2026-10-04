"""
src/evaluate.py
================
STAGE 5 — Model Evaluation & SHAP Explainability

PURPOSE
-------
Evaluates the trained model on the held-out test set and produces:
  1. metrics.json           — accuracy, macro-F1, per-class F1
  2. confusion_matrix.png   — heatmap of predicted vs actual labels
  3. shap_summary.png       — SHAP feature importance plot

WHAT IS SHAP?
-------------
SHAP (SHapley Additive exPlanations) is a method from game theory that
tells us *how much each feature contributed* to each prediction.

Example: for a student predicted as "Low":
  - error_rate    → pushes prediction toward Low  (+0.4)
  - hint_requests → pushes prediction toward Low  (+0.2)
  - engagement    → pushes prediction toward High (-0.1)
  Net result: Low (error rate and hints dominate)

This is crucial for the VR system: it lets the instructor understand
*why* a student was flagged as Low, not just that they were.

ARTIFACT FLAGS
--------------
We also flag any feature that looks like a dataset-specific artifact
rather than a genuine behavioral signal, and suggest whether to drop it.
"""

import os
import json
import pickle
import warnings

import numpy as np
import pandas as pd
import matplotlib
matplotlib.use("Agg")   # non-interactive backend (for saving to file without display)
import matplotlib.pyplot as plt
import seaborn as sns

import xgboost as xgb
import shap
from sklearn.metrics import (
    accuracy_score,
    f1_score,
    classification_report,
    confusion_matrix,
)

# ── Paths ─────────────────────────────────────────────────────────────
ML_ROOT  = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODELS   = os.path.join(ML_ROOT, "models")
REPORTS  = os.path.join(ML_ROOT, "reports")

FEATURE_COLUMNS = [
    "error_rate",
    "avg_response_time",
    "hint_requests",
    "idle_time",
    "engagement_score",
]

# ── Known artifact features (dataset-specific, not genuine VR signals)  ──
# These are the canonical features that are DERIVED from proxy datasets
# and may not reflect real VR behavior.  We flag them in the SHAP report.
ARTIFACT_FEATURES = {
    "avg_response_time": (
        "Derived from 'AnnouncementsView' (xAPI) or 'studytime' (UCI). "
        "Neither is a real time measurement.  Replace with actual task "
        "duration in seconds from VR logs."
    ),
    "idle_time": (
        "Derived from 'Discussion' posts (xAPI) or 'freetime' (UCI). "
        "Not a real idle-time measurement.  Replace with actual pause "
        "duration from VR session timestamps."
    ),
    "hint_requests": (
        "Derived from 'raisedhands' (xAPI) or 'freetime' (UCI). "
        "Reasonable proxy, but 'freetime' is a demographic feature (UCI). "
        "Replace with actual hint-button press counts from VR."
    ),
}


def load_artifacts():
    """
    Loads model, label encoder, and feature list saved by Stage 4.

    Returns
    -------
    model, label_encoder, feature_list
    """
    model_path   = os.path.join(MODELS, "xgboost_model.json")
    encoder_path = os.path.join(MODELS, "label_encoder.pkl")
    feature_path = os.path.join(MODELS, "feature_list.json")

    for p in [model_path, encoder_path, feature_path]:
        if not os.path.exists(p):
            raise FileNotFoundError(f"Artifact not found: {p}. Run Stage 4 first.")

    model = xgb.XGBClassifier()
    model.load_model(model_path)

    with open(encoder_path, "rb") as f:
        le = pickle.load(f)

    with open(feature_path, "r") as f:
        features = json.load(f)

    return model, le, features


def compute_and_save_metrics(
    y_true: np.ndarray,
    y_pred: np.ndarray,
    le: "LabelEncoder",
) -> dict:
    """
    Computes accuracy, macro-F1, and per-class F1.
    Saves results to reports/metrics.json.

    Why macro-F1 (not micro)?
    -------------------------
    Macro-F1 computes F1 for each class separately then averages them,
    giving equal weight to each class.  This matters because:
    - Our classes might be imbalanced (fewer 'High' students, for example).
    - Micro-F1 would be dominated by the majority class.
    - Macro-F1 flags if the model is poor on a minority class.

    Returns
    -------
    dict of metric values (also written to disk)
    """
    class_names = list(le.classes_)   # ["High", "Low", "Medium"] (alphabetical)

    acc      = accuracy_score(y_true, y_pred)
    macro_f1 = f1_score(y_true, y_pred, average="macro")
    per_cls  = f1_score(y_true, y_pred, average=None)

    print(f"\n  Accuracy  : {acc:.4f}")
    print(f"  Macro-F1  : {macro_f1:.4f}")
    print("\n  Per-Class F1:")
    per_class_dict = {}
    for cls_name, f1_val in zip(class_names, per_cls):
        print(f"    {cls_name:8s} : {f1_val:.4f}")
        per_class_dict[cls_name] = round(f1_val, 4)

    print("\n  Full Classification Report:")
    print(classification_report(y_true, y_pred, target_names=class_names))

    metrics = {
        "accuracy":     round(acc, 4),
        "macro_f1":     round(macro_f1, 4),
        "per_class_f1": per_class_dict,
        "note": (
            "Model trained on proxy (non-VR) data. "
            "Performance may not reflect real VR session accuracy. "
            "Fine-tune once real VR data is collected."
        ),
    }

    os.makedirs(REPORTS, exist_ok=True)
    metrics_path = os.path.join(REPORTS, "metrics.json")
    with open(metrics_path, "w") as f:
        json.dump(metrics, f, indent=2)
    print(f"\n  [✓] Metrics saved to: {metrics_path}")
    return metrics


def plot_confusion_matrix(
    y_true: np.ndarray,
    y_pred: np.ndarray,
    le: "LabelEncoder",
):
    """
    Creates and saves a styled confusion matrix heatmap.

    Reading a confusion matrix:
    - Rows = actual label
    - Columns = predicted label
    - Diagonal = correct predictions
    - Off-diagonal = errors

    A model confusing 'Low' with 'Medium' (adjacent states) is less
    concerning than confusing 'Low' with 'High' (opposite extremes).
    """
    class_names = list(le.classes_)
    cm = confusion_matrix(y_true, y_pred)

    fig, ax = plt.subplots(figsize=(7, 5))
    sns.heatmap(
        cm,
        annot=True,
        fmt="d",
        cmap="Blues",
        xticklabels=class_names,
        yticklabels=class_names,
        ax=ax,
        linewidths=0.5,
    )
    ax.set_xlabel("Predicted Label", fontsize=12)
    ax.set_ylabel("Actual Label", fontsize=12)
    ax.set_title("Confusion Matrix — Learner State Classifier", fontsize=13)
    plt.tight_layout()

    out_path = os.path.join(REPORTS, "confusion_matrix.png")
    fig.savefig(out_path, dpi=150, bbox_inches="tight")
    plt.close(fig)
    print(f"  [✓] Confusion matrix saved to: {out_path}")


def run_shap_analysis(
    model: xgb.XGBClassifier,
    X_test: np.ndarray,
    feature_names: list,
):
    """
    Computes SHAP values and saves a summary bar plot.

    What the plot shows:
    - Each bar = one canonical feature
    - Bar length = average |SHAP value| across the test set
    - Longer bar = more influential feature overall
    - Color would show direction (positive/negative) in beeswarm plots

    We also print which features are proxy/artifact mappings so you
    know which results to treat with extra skepticism.

    Returns
    -------
    shap_values numpy array (for further analysis if needed)
    """
    print("\n[…] Computing SHAP values (this may take a moment)…")

    # TreeExplainer is optimized for tree-based models (XGBoost, LightGBM, etc.)
    explainer = shap.TreeExplainer(model)

    # Suppress a common benign warning about additivity check
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        shap_values = explainer.shap_values(X_test)

    # shap_values shape: (n_samples, n_features, n_classes) or (n_classes, n_samples, n_features)
    # For multiclass, take the absolute mean across classes for a global importance summary
    if isinstance(shap_values, list):
        # Older SHAP versions return a list of arrays, one per class
        shap_abs_mean = np.mean([np.abs(sv) for sv in shap_values], axis=0)
    else:
        # Newer SHAP returns 3D array: (samples, features, classes)
        shap_abs_mean = np.mean(np.abs(shap_values), axis=(0, 2)) \
            if shap_values.ndim == 3 else np.abs(shap_values).mean(axis=0)

    # ── Bar chart of feature importance ──────────────────────────────
    importance_df = pd.DataFrame({
        "feature": feature_names,
        "mean_abs_shap": shap_abs_mean if shap_abs_mean.ndim == 1
                         else shap_abs_mean.mean(axis=1),
    }).sort_values("mean_abs_shap", ascending=True)

    fig, ax = plt.subplots(figsize=(8, 4))
    bars = ax.barh(
        importance_df["feature"],
        importance_df["mean_abs_shap"],
        color="#4C72B0",
        edgecolor="white",
    )

    # Annotate artifact features with a warning marker
    for bar, feature in zip(bars, importance_df["feature"]):
        if feature in ARTIFACT_FEATURES:
            ax.text(
                bar.get_width() + 0.001,
                bar.get_y() + bar.get_height() / 2,
                "⚠ proxy",
                va="center", ha="left", fontsize=8, color="#CC4400",
            )

    ax.set_xlabel("Mean |SHAP Value| (feature importance)", fontsize=11)
    ax.set_title("SHAP Feature Importance — AdaptVR Learner State Model", fontsize=12)
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)
    plt.tight_layout()

    out_path = os.path.join(REPORTS, "shap_summary.png")
    fig.savefig(out_path, dpi=150, bbox_inches="tight")
    plt.close(fig)
    print(f"  [✓] SHAP summary plot saved to: {out_path}")

    # ── Print artifact flags ──────────────────────────────────────────
    print("\n  ── ARTIFACT FEATURE FLAGS ──────────────────────────────────")
    print("  Features marked ⚠ below are proxy mappings, NOT real VR signals.")
    print("  Their SHAP importance may be inflated or misleading on real data.\n")
    for feat, note in ARTIFACT_FEATURES.items():
        shap_val = importance_df.loc[
            importance_df["feature"] == feat, "mean_abs_shap"
        ].values
        val_str = f"{shap_val[0]:.4f}" if len(shap_val) > 0 else "N/A"
        print(f"  ⚠  {feat} (SHAP: {val_str})")
        print(f"     → {note}\n")

    print("  Recommendation:")
    print("  → Keep all features for now (proxy is all we have).")
    print("  → Once VR data is available, replace artifact features")
    print("    with real measurements and re-run SHAP to validate.")
    print("  ─────────────────────────────────────────────────────────────")

    return shap_values


def run_stage5(model=None, le=None, X_test=None, y_test=None):
    """
    Stage 5 entry point: runs full evaluation on the test set.

    If model/le/X_test/y_test are not passed (e.g., running standalone),
    loads artifacts from disk and expects test data to also be on disk.

    Parameters
    ----------
    model   : Trained XGBClassifier (from Stage 4) or None.
    le      : LabelEncoder (from Stage 4) or None.
    X_test  : Test features array or None.
    y_test  : Test label array (encoded) or None.
    """
    print("\n" + "=" * 55)
    print(" STAGE 5 — Evaluation & SHAP Analysis")
    print("=" * 55)

    os.makedirs(REPORTS, exist_ok=True)

    # ── Load artifacts if not passed ─────────────────────────────────
    if model is None or le is None:
        model, le, features = load_artifacts()
    else:
        features = FEATURE_COLUMNS

    # ── Load test data if not passed ─────────────────────────────────
    if X_test is None or y_test is None:
        # Reconstruct from the processed labeled files
        from train import load_labeled_datasets, split_train_test
        df = load_labeled_datasets()
        _, _, X_test, _, _, y_test, le = split_train_test(df)

    # ── Predict ───────────────────────────────────────────────────────
    y_pred = model.predict(X_test)

    # ── Metrics ───────────────────────────────────────────────────────
    metrics = compute_and_save_metrics(y_test, y_pred, le)

    # ── Confusion matrix ──────────────────────────────────────────────
    plot_confusion_matrix(y_test, y_pred, le)

    # ── SHAP ──────────────────────────────────────────────────────────
    run_shap_analysis(model, X_test, features)

    print("\n[✓] Stage 5 complete. All reports saved to /reports.")
    return metrics


if __name__ == "__main__":
    run_stage5()
