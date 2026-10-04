"""
src/predict.py
===============
STAGE 6 — Inference Interface

PURPOSE
-------
Provides a single callable function:

    predict_learner_state(features: dict) -> str

that the VR backend can call at runtime to get a Low/Medium/High
prediction from a dictionary of behavioral features.

USAGE EXAMPLE (from the Node.js backend via a Python subprocess,
or via a FastAPI/Flask wrapper — see README for integration guide):

    from src.predict import predict_learner_state

    result = predict_learner_state({
        "error_rate":        0.3,
        "avg_response_time": 0.6,
        "hint_requests":     0.2,
        "idle_time":         0.1,
        "engagement_score":  0.8,
    })
    print(result)   # → "High"

IMPORTANT NOTES
---------------
1. All feature values must be normalized to [0, 1] BEFORE calling
   this function.  The model was trained on normalized features.
   (In production, run the same feature_engineering.py normalization
   on the raw VR session data before calling predict_learner_state.)

2. The model is loaded once on first call and cached in memory.
   Subsequent calls reuse the same model object — no disk I/O overhead.

3. This function returns the MOST LIKELY class as a string.
   Call predict_with_confidence() for the full probability distribution
   (useful for displaying confidence on the trainer dashboard).
"""

import os
import json
import pickle
import functools

import numpy as np
import xgboost as xgb

# ── Paths ─────────────────────────────────────────────────────────────
ML_ROOT  = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODELS   = os.path.join(ML_ROOT, "models")

# ── Expected canonical feature order ─────────────────────────────────
# The model was trained with features in THIS exact order.
# If the order changes, predictions will be wrong — we enforce it here.
FEATURE_COLUMNS = [
    "error_rate",
    "avg_response_time",
    "hint_requests",
    "idle_time",
    "engagement_score",
]


# ─────────────────────────────────────────────────────────────────────
#  MODEL LOADING (cached after first call)
# ─────────────────────────────────────────────────────────────────────

@functools.lru_cache(maxsize=1)
def _load_model_artifacts():
    """
    Loads model, label encoder, and feature list from /models.
    Uses @functools.lru_cache so the files are read only once —
    subsequent calls hit the in-memory cache instantly.

    Returns
    -------
    tuple: (XGBClassifier, LabelEncoder, list_of_feature_names)

    Raises
    ------
    FileNotFoundError if any artifact file is missing.
    """
    model_path   = os.path.join(MODELS, "xgboost_model.json")
    encoder_path = os.path.join(MODELS, "label_encoder.pkl")
    feature_path = os.path.join(MODELS, "feature_list.json")

    for p, name in [
        (model_path,   "xgboost_model.json"),
        (encoder_path, "label_encoder.pkl"),
        (feature_path, "feature_list.json"),
    ]:
        if not os.path.exists(p):
            raise FileNotFoundError(
                f"Missing model artifact: {p}\n"
                "Run the full pipeline (run_pipeline.py) to generate it."
            )

    model = xgb.XGBClassifier()
    model.load_model(model_path)

    with open(encoder_path, "rb") as f:
        le = pickle.load(f)

    with open(feature_path, "r") as f:
        saved_features = json.load(f)

    return model, le, saved_features


# ─────────────────────────────────────────────────────────────────────
#  VALIDATION HELPER
# ─────────────────────────────────────────────────────────────────────

def _validate_and_build_input(
    features: dict,
    expected_features: list,
) -> np.ndarray:
    """
    Validates the input dict and converts it to the numpy array the
    model expects.

    Checks:
    - All required features are present.
    - All values are numeric.
    - All values are in [0, 1] (with a warning if outside, but still runs).

    Parameters
    ----------
    features         : Dict mapping feature name → float value.
    expected_features: List of feature names in the required order.

    Returns
    -------
    np.ndarray of shape (1, n_features)
    """
    # Check for missing keys
    missing = [f for f in expected_features if f not in features]
    if missing:
        raise ValueError(
            f"Missing features: {missing}\n"
            f"Required features: {expected_features}"
        )

    # Build the input array in the exact feature order
    row = []
    for feat in expected_features:
        val = features[feat]
        if not isinstance(val, (int, float)):
            raise TypeError(
                f"Feature '{feat}' must be a number, got {type(val).__name__}"
            )
        if not (0.0 <= float(val) <= 1.0):
            print(
                f"  [WARN] Feature '{feat}' = {val:.4f} is outside [0, 1]. "
                "Did you forget to normalize? Prediction may be unreliable."
            )
        row.append(float(val))

    return np.array([row], dtype=np.float32)


# ─────────────────────────────────────────────────────────────────────
#  PUBLIC INTERFACE
# ─────────────────────────────────────────────────────────────────────

def predict_learner_state(features: dict) -> str:
    """
    Predicts the learner state for a single student from a feature dict.

    Parameters
    ----------
    features : dict
        Keys must match the canonical feature names (normalized to [0, 1]):
            - error_rate        (0 = no errors, 1 = all errors)
            - avg_response_time (0 = instant, 1 = very slow)
            - hint_requests     (0 = none, 1 = maximum)
            - idle_time         (0 = always active, 1 = very idle)
            - engagement_score  (0 = disengaged, 1 = fully engaged)

    Returns
    -------
    str: "Low", "Medium", or "High"

    Example
    -------
    >>> predict_learner_state({
    ...     "error_rate": 0.1, "avg_response_time": 0.3,
    ...     "hint_requests": 0.0, "idle_time": 0.05,
    ...     "engagement_score": 0.9
    ... })
    'High'
    """
    model, le, expected_features = _load_model_artifacts()
    X = _validate_and_build_input(features, expected_features)

    encoded_prediction = model.predict(X)[0]       # int: 0, 1, or 2
    label = le.inverse_transform([encoded_prediction])[0]   # "Low"/"Medium"/"High"
    return label


def predict_with_confidence(features: dict) -> dict:
    """
    Returns the predicted class AND the probability for each class.

    This is useful for the trainer dashboard to show confidence levels,
    and for the VR client to trigger adaptations with a threshold
    (e.g., only adapt if P(Low) > 0.6).

    Parameters
    ----------
    features : Same dict as predict_learner_state().

    Returns
    -------
    dict with keys:
        - "predicted_state" : str ("Low" / "Medium" / "High")
        - "confidence"      : float (probability of the predicted class)
        - "probabilities"   : dict {class_name: probability}

    Example
    -------
    >>> predict_with_confidence({...})
    {
        "predicted_state": "Low",
        "confidence": 0.78,
        "probabilities": {"High": 0.05, "Low": 0.78, "Medium": 0.17}
    }
    """
    model, le, expected_features = _load_model_artifacts()
    X = _validate_and_build_input(features, expected_features)

    proba = model.predict_proba(X)[0]    # array of 3 probabilities
    encoded_pred = np.argmax(proba)
    label = le.inverse_transform([encoded_pred])[0]

    prob_dict = {
        cls: round(float(p), 4)
        for cls, p in zip(le.classes_, proba)
    }

    return {
        "predicted_state": label,
        "confidence":       round(float(proba[encoded_pred]), 4),
        "probabilities":    prob_dict,
    }


# ─────────────────────────────────────────────────────────────────────
#  CLI QUICK TEST
# ─────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    print("=== AdaptVR Inference Interface — Quick Test ===\n")

    test_cases = [
        {
            "label": "Expected: High (low errors, fast, no hints, engaged)",
            "features": {
                "error_rate": 0.05,
                "avg_response_time": 0.2,
                "hint_requests": 0.0,
                "idle_time": 0.1,
                "engagement_score": 0.95,
            },
        },
        {
            "label": "Expected: Low (many errors, slow, many hints, disengaged)",
            "features": {
                "error_rate": 0.85,
                "avg_response_time": 0.9,
                "hint_requests": 0.8,
                "idle_time": 0.7,
                "engagement_score": 0.1,
            },
        },
        {
            "label": "Expected: Medium (balanced signals)",
            "features": {
                "error_rate": 0.4,
                "avg_response_time": 0.5,
                "hint_requests": 0.3,
                "idle_time": 0.4,
                "engagement_score": 0.5,
            },
        },
    ]

    for case in test_cases:
        print(f"  Test: {case['label']}")
        result = predict_with_confidence(case["features"])
        print(f"  → Predicted: {result['predicted_state']}")
        print(f"  → Confidence: {result['confidence']:.1%}")
        print(f"  → All probabilities: {result['probabilities']}")
        print()
