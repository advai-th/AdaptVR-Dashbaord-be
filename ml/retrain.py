"""
ml/retrain.py
==============
MANUAL RETRAINING ENTRY POINT — Adaptive System Data Flywheel

PURPOSE
-------
Triggered manually by the teacher/researcher when enough new labelled
data has accumulated in the database:

    cd C:\\PROJECT\\AdaptVR-backend\\ml
    python retrain.py

The script:
  1. Loads ALL labelled feature vectors from the PostgreSQL
     TRAINING_FEATURE table (uploaded by Quest devices at session end).
  2. Combines them with the original proxy training corpus so the model
     retains its generalisation from pre-VR data.
  3. Re-trains XGBoost using the same hyperparameters as the current
     best_params.json (or defaults if that file doesn't exist).
  4. Exports the new model to ONNX using skl2onnx.
  5. Validates on a held-out split — only publishes if accuracy IMPROVES
     over the previous best.
  6. Saves the ONNX binary + a new row in the MODEL_MANIFEST table.
  7. Deactivates all previous MODEL_MANIFEST rows so Quest devices
     will detect the new version on next startup.

PREREQUISITES
-------------
  pip install skl2onnx onnx psycopg2-binary
  (already in requirements.txt after this session)

  A .env file at the project root must contain:
    DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD

USAGE
-----
    # Normal run (from the /ml directory):
    cd ml
    python retrain.py

    # Dry run — trains and evaluates but does NOT publish to DB:
    python retrain.py --dry-run

    # Force publish even if accuracy doesn't improve:
    python retrain.py --force-publish

    # Skip combining with proxy corpus (VR-data-only retraining):
    python retrain.py --vr-only
"""

import os
import sys
import json
import pickle
import hashlib
import argparse
import warnings
from datetime import datetime

import numpy as np
import pandas as pd

# ── Ensure src/ is importable when running from /ml ──────────────────
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "src"))
sys.stdout.reconfigure(encoding="utf-8")

# ── Paths ─────────────────────────────────────────────────────────────
ML_ROOT   = os.path.dirname(os.path.abspath(__file__))
MODELS    = os.path.join(ML_ROOT, "models")
PROCESSED = os.path.join(ML_ROOT, "data", "processed")
REPORTS   = os.path.join(ML_ROOT, "reports")

# ── The 12 VR feature columns (must match LearnerFeatureVector in Unity) ──
VR_FEATURE_COLUMNS = [
    "hesitation_time",
    "wrong_snap_count",
    "correct_snap_count",
    "hint_request_count",
    "total_interactions",
    "average_response_time",
    "idle_seconds",
    "head_direction_changes",
    "backtracking_count",
    "success_rate",
    "task_duration",
    "consecutive_errors",
]

# ── The 5 proxy feature columns used in the baseline corpus ──────────
PROXY_FEATURE_COLUMNS = [
    "error_rate",
    "avg_response_time",
    "hint_requests",
    "idle_time",
    "engagement_score",
]


# =============================================================================
# DB CONNECTION
# =============================================================================

def get_db_connection():
    """
    Opens a psycopg2 connection using .env values.
    Falls back to environment variables if dotenv is not available.
    """
    import psycopg2
    try:
        from dotenv import load_dotenv
        env_path = os.path.join(ML_ROOT, "..", ".env")
        load_dotenv(dotenv_path=env_path)
    except ImportError:
        pass  # dotenv not installed — rely on actual environment variables

    conn = psycopg2.connect(
        host     = os.getenv("DB_HOST",     "localhost"),
        port     = int(os.getenv("DB_PORT", "5432")),
        dbname   = os.getenv("DB_NAME",     "adaptvr_db"),
        user     = os.getenv("DB_USER",     "postgres"),
        password = os.getenv("DB_PASSWORD", ""),
    )
    return conn


# =============================================================================
# DATA LOADING
# =============================================================================

def load_vr_training_data(conn) -> pd.DataFrame:
    """
    Fetches all labelled feature vectors from the TRAINING_FEATURE table.
    Teacher-labelled examples (label_confidence = 1.0) are included with
    higher sample weights during training.

    Returns a DataFrame with VR_FEATURE_COLUMNS + 'learner_state' + 'label_confidence'.
    """
    sql = """
        SELECT
            hesitation_time,
            wrong_snap_count,
            correct_snap_count,
            hint_request_count,
            total_interactions,
            average_response_time,
            idle_seconds,
            head_direction_changes,
            backtracking_count,
            success_rate,
            task_duration,
            consecutive_errors,
            derived_label   AS learner_state,
            label_confidence
        FROM TRAINING_FEATURE
        ORDER BY uploaded_at ASC
    """
    with conn.cursor() as cur:
        cur.execute(sql)
        rows = cur.fetchall()
        cols = [desc[0] for desc in cur.description]

    if not rows:
        return pd.DataFrame(columns=VR_FEATURE_COLUMNS + ["learner_state", "label_confidence"])

    df = pd.DataFrame(rows, columns=cols)
    print(f"  Loaded {len(df)} VR feature vectors from TRAINING_FEATURE")
    print(f"  Label distribution:\n{df['learner_state'].value_counts().to_string()}")
    print(f"  Teacher-labelled: {(df['label_confidence'] == 1.0).sum()} / {len(df)}")
    return df


def load_proxy_corpus() -> pd.DataFrame:
    """
    Loads the original 5-feature proxy corpus (xAPI + UCI + SuperSimpleEnglish)
    that the baseline model was trained on.

    Returns a DataFrame compatible with VR features (mapped to the 12 VR columns).
    Missing VR-specific features are filled with sensible defaults:
      - wrong_snap_count, correct_snap_count, head_direction_changes,
        backtracking_count, consecutive_errors → 0
      - success_rate = 1 - error_rate
      - hesitation_time = idle_time (best available proxy)
      - average_response_time = avg_response_time
      - idle_seconds = idle_time
      - task_duration = avg_response_time * 10 (rough approximation)
      - hint_request_count = hint_requests (already an integer-ish float)
      - total_interactions = correct_snap_count + wrong_snap_count (= 0)
    """
    frames = []
    for fname in [
        "xapi_edu_labeled.csv",
        "uci_student_labeled.csv",
        "super_simple_english_labeled.csv",
    ]:
        path = os.path.join(PROCESSED, fname)
        if os.path.exists(path):
            df = pd.read_csv(path)
            df.drop(columns=["_composite_score"], errors="ignore", inplace=True)
            frames.append(df)
            print(f"  [proxy] Loaded {path} — {len(df)} rows")

    if not frames:
        print("  [proxy] No proxy datasets found — proceeding with VR data only.")
        return pd.DataFrame()

    combined = pd.concat(frames, ignore_index=True)

    # Map 5 proxy features → 12 VR features
    mapped = pd.DataFrame()
    mapped["hesitation_time"]         = combined.get("idle_time", pd.Series(0.0, index=combined.index))
    mapped["wrong_snap_count"]        = 0
    mapped["correct_snap_count"]      = 0
    mapped["hint_request_count"]      = combined.get("hint_requests", pd.Series(0.0, index=combined.index))
    mapped["total_interactions"]      = 0
    mapped["average_response_time"]   = combined.get("avg_response_time", pd.Series(0.0, index=combined.index))
    mapped["idle_seconds"]            = combined.get("idle_time", pd.Series(0.0, index=combined.index))
    mapped["head_direction_changes"]  = 0
    mapped["backtracking_count"]      = 0
    mapped["success_rate"]            = 1.0 - combined.get("error_rate", pd.Series(0.0, index=combined.index))
    mapped["task_duration"]           = combined.get("avg_response_time", pd.Series(0.0, index=combined.index)) * 10
    mapped["consecutive_errors"]      = 0

    mapped["learner_state"]     = combined["learner_state"]
    mapped["label_confidence"]  = 0.50   # lower weight — these are proxy samples

    print(f"  [proxy] Combined proxy corpus: {len(mapped)} rows")
    return mapped


# =============================================================================
# TRAINING
# =============================================================================

def load_best_params() -> dict:
    """Loads tuned XGBoost params from best_params.json, or returns defaults."""
    defaults = {
        "objective":            "multi:softprob",
        "num_class":            3,
        "max_depth":            6,
        "learning_rate":        0.05,
        "n_estimators":         500,
        "subsample":            1.0,
        "colsample_bytree":     1.0,
        "min_child_weight":     5,
        "reg_lambda":           0.5,
        "random_state":         42,
        "tree_method":          "hist",
        "eval_metric":          "mlogloss",
        "early_stopping_rounds": 20,
    }
    best_params_path = os.path.join(MODELS, "best_params.json")
    if os.path.exists(best_params_path):
        with open(best_params_path) as f:
            tuned = json.load(f)
        defaults.update(tuned)
        print(f"  [params] Loaded tuned params from best_params.json")
    else:
        print("  [params] No best_params.json — using defaults")
    return defaults


def retrain_model(df_combined: pd.DataFrame):
    """
    Trains XGBoost on the combined VR + proxy corpus.

    Returns (model, label_encoder, X_test, y_test, accuracy)
    """
    import xgboost as xgb
    from sklearn.model_selection import train_test_split
    from sklearn.preprocessing import LabelEncoder
    from sklearn.metrics import accuracy_score

    X = df_combined[VR_FEATURE_COLUMNS].values.astype(np.float32)
    y_raw = df_combined["learner_state"].values
    weights = df_combined["label_confidence"].values.astype(np.float32)

    # Label encode
    le = LabelEncoder()
    y = le.fit_transform(y_raw)
    print(f"\n  Label encoding: {dict(zip(le.classes_, le.transform(le.classes_)))}")

    # Train / test split (stratified by label, not group-based — VR sessions are independent)
    X_train, X_test, y_train, y_test, w_train, _ = train_test_split(
        X, y, weights, test_size=0.20, random_state=42, stratify=y
    )
    X_train, X_val, y_train, y_val = train_test_split(
        X_train, y_train, test_size=0.10, random_state=42
    )

    print(f"\n  Split — train: {len(X_train)}, val: {len(X_val)}, test: {len(X_test)}")
    print(f"  Training samples: {len(X_train)}  |  Class counts: {dict(zip(le.classes_, np.bincount(y_train)))}")

    params = load_best_params()
    model = xgb.XGBClassifier(**params)

    model.fit(
        X_train, y_train,
        sample_weight=w_train,
        eval_set=[(X_val, y_val)],
        verbose=50,
    )

    y_pred = model.predict(X_test)
    accuracy = accuracy_score(y_test, y_pred)
    print(f"\n  [✓] Validation accuracy: {accuracy:.4f}  (best round: {model.best_iteration})")

    return model, le, X_test, y_test, accuracy


# =============================================================================
# ONNX EXPORT
# =============================================================================

def export_to_onnx(model, n_features: int = 12) -> bytes:
    """
    Converts the trained XGBoost model to ONNX format.

    The ONNX model expects a float32 input tensor of shape [batch, 12]
    and outputs:
      - output_label      : int64[batch]        — predicted class index (0=High, 1=Low, 2=Medium)
      - output_probability: seq(map(str,float)) — class probabilities

    Returns the raw ONNX bytes (ready to write to disk or the DB).
    """
    from skl2onnx import convert_sklearn
    from skl2onnx.common.data_types import FloatTensorType

    initial_type = [("float_input", FloatTensorType([None, n_features]))]

    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        onnx_model = convert_sklearn(model, initial_types=initial_type)

    return onnx_model.SerializeToString()


# =============================================================================
# VERSION MANAGEMENT
# =============================================================================

def get_current_best_accuracy(conn) -> float:
    """Returns the validation_accuracy of the most recently published model."""
    with conn.cursor() as cur:
        cur.execute(
            "SELECT validation_accuracy FROM MODEL_MANIFEST ORDER BY release_date DESC LIMIT 1"
        )
        row = cur.fetchone()
    return float(row[0]) if row and row[0] is not None else 0.0


def bump_version(conn) -> str:
    """
    Determines the next version string.
    If no models exist yet: returns "v2" (v1 is the bundled baseline).
    Otherwise increments the numeric suffix of the latest version.
    """
    with conn.cursor() as cur:
        cur.execute(
            "SELECT version FROM MODEL_MANIFEST ORDER BY release_date DESC LIMIT 1"
        )
        row = cur.fetchone()
    if not row:
        return "v2"
    latest = row[0]   # e.g. "v3"
    try:
        num = int(latest.lstrip("v"))
        return f"v{num + 1}"
    except ValueError:
        return "v2"


def publish_model(conn, new_version: str, onnx_bytes: bytes,
                  accuracy: float, n_samples: int, notes: str = "") -> None:
    """
    Deactivates all existing MODEL_MANIFEST rows, then inserts the new one.
    This is the signal Quest devices use to trigger a download on next startup.
    """
    sha256 = hashlib.sha256(onnx_bytes).hexdigest()

    with conn.cursor() as cur:
        # Deactivate previous models
        cur.execute("UPDATE MODEL_MANIFEST SET is_active = FALSE")

        # Insert new manifest row with the ONNX binary
        cur.execute(
            """
            INSERT INTO MODEL_MANIFEST
              (version, sha256, training_samples, validation_accuracy, onnx_binary, is_active, notes)
            VALUES (%s, %s, %s, %s, %s, TRUE, %s)
            """,
            (new_version, sha256, n_samples, accuracy, onnx_bytes, notes)
        )

    conn.commit()
    print(f"\n  [DB] Model {new_version} published:")
    print(f"       SHA-256   : {sha256[:16]}...")
    print(f"       Accuracy  : {accuracy:.4f}")
    print(f"       Samples   : {n_samples}")
    print(f"       ONNX size : {len(onnx_bytes) / 1024:.1f} KB")


def save_local_onnx_copy(onnx_bytes: bytes, version: str) -> str:
    """
    Optionally saves a local copy of the ONNX file to ml/models/ for inspection.
    Returns the path.
    """
    os.makedirs(MODELS, exist_ok=True)
    path = os.path.join(MODELS, f"cognitive_load_{version}.onnx")
    with open(path, "wb") as f:
        f.write(onnx_bytes)
    print(f"  [local] Saved ONNX copy to: {path}")
    return path


# =============================================================================
# MAIN ENTRY POINT
# =============================================================================

def main():
    parser = argparse.ArgumentParser(
        description="AdaptVR Manual Retraining — XGBoost → ONNX → PostgreSQL"
    )
    parser.add_argument(
        "--dry-run", action="store_true",
        help="Train and evaluate but do NOT publish to the database."
    )
    parser.add_argument(
        "--force-publish", action="store_true",
        help="Publish the new model even if accuracy does not improve."
    )
    parser.add_argument(
        "--vr-only", action="store_true",
        help="Skip combining with the original proxy corpus — use only VR session data."
    )
    parser.add_argument(
        "--min-samples", type=int, default=50,
        help="Minimum number of VR training examples required before retraining (default: 50)."
    )
    args = parser.parse_args()

    print("\n" + "=" * 60)
    print("  AdaptVR Retraining Pipeline")
    print(f"  Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)

    # ── Connect to DB ─────────────────────────────────────────────────
    print("\n[1/6] Connecting to PostgreSQL...")
    try:
        conn = get_db_connection()
        print("  [✓] Connected")
    except Exception as e:
        print(f"  [X] Could not connect to database: {e}")
        print("  Check your .env file (DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD)")
        sys.exit(1)

    # ── Load VR training data ─────────────────────────────────────────
    print("\n[2/6] Loading VR training data from TRAINING_FEATURE table...")
    df_vr = load_vr_training_data(conn)

    if len(df_vr) < args.min_samples:
        print(f"\n  [!] Only {len(df_vr)} VR examples found — minimum is {args.min_samples}.")
        print("      Accumulate more session data before retraining.")
        print("      Use --min-samples N to override this threshold.")
        conn.close()
        sys.exit(0)

    # ── Optionally combine with proxy corpus ──────────────────────────
    if not args.vr_only:
        print("\n[3/6] Loading proxy training corpus for combined training...")
        df_proxy = load_proxy_corpus()
        if not df_proxy.empty:
            df_combined = pd.concat([df_vr, df_proxy], ignore_index=True)
        else:
            df_combined = df_vr
    else:
        print("\n[3/6] --vr-only flag set — skipping proxy corpus.")
        df_combined = df_vr

    print(f"\n  Combined training set: {len(df_combined)} rows")

    # ── Retrain ───────────────────────────────────────────────────────
    print("\n[4/6] Training XGBoost classifier...")
    model, le, X_test, y_test, accuracy = retrain_model(df_combined)

    # ── Export to ONNX ────────────────────────────────────────────────
    print("\n[5/6] Exporting to ONNX (skl2onnx)...")
    onnx_bytes = export_to_onnx(model, n_features=len(VR_FEATURE_COLUMNS))
    sha256 = hashlib.sha256(onnx_bytes).hexdigest()
    print(f"  [✓] ONNX export complete — {len(onnx_bytes) / 1024:.1f} KB, SHA-256: {sha256[:16]}...")

    # ── Check if improvement and publish ─────────────────────────────
    print("\n[6/6] Deciding whether to publish...")
    previous_accuracy = get_current_best_accuracy(conn)
    new_version = bump_version(conn)

    print(f"  Previous best accuracy : {previous_accuracy:.4f}")
    print(f"  New model accuracy     : {accuracy:.4f}")
    print(f"  Would publish as       : {new_version}")

    if args.dry_run:
        print("\n  [dry-run] --dry-run flag set — model NOT published.")
        print(f"  [dry-run] Run without --dry-run to publish {new_version}.")
        save_local_onnx_copy(onnx_bytes, f"{new_version}_dryrun")
        conn.close()
        print("\n" + "=" * 60)
        print(f"  [✓] Dry run complete — accuracy: {accuracy:.4f}")
        print("=" * 60 + "\n")
        return

    if accuracy > previous_accuracy or args.force_publish:
        notes = (
            f"Retrained {datetime.now().strftime('%Y-%m-%d')} on "
            f"{len(df_vr)} VR examples + {len(df_combined) - len(df_vr)} proxy examples."
        )
        publish_model(conn, new_version, onnx_bytes, accuracy, len(df_combined), notes)
        save_local_onnx_copy(onnx_bytes, new_version)

        # Save updated label encoder and feature list for consistency
        with open(os.path.join(MODELS, "label_encoder.pkl"), "wb") as f:
            pickle.dump(le, f)
        with open(os.path.join(MODELS, "feature_list.json"), "w") as f:
            json.dump(VR_FEATURE_COLUMNS, f, indent=2)

        print(f"\n  [✓] Model {new_version} is now live.")
        print("  Quest devices will download it on next startup.")
    else:
        improvement_needed = previous_accuracy - accuracy
        print(f"\n  [!] New model ({accuracy:.4f}) does not improve over previous ({previous_accuracy:.4f}).")
        print(f"      Gap: {improvement_needed:.4f}. Model NOT published.")
        print("      Use --force-publish to override, or accumulate more data.")
        save_local_onnx_copy(onnx_bytes, f"{new_version}_rejected")

    conn.close()

    print("\n" + "=" * 60)
    print(f"  Retrain complete — {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60 + "\n")


if __name__ == "__main__":
    main()
