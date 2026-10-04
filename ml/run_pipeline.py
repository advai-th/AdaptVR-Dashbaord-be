"""
run_pipeline.py
================
MASTER PIPELINE RUNNER

Runs all 5 stages of the AdaptVR ML pipeline in sequence.
Run this script to train the model end-to-end from scratch.

Usage
-----
    cd ml
    python run_pipeline.py

    # Or run a specific stage only:
    python run_pipeline.py --stage 4

    # Or combine datasets and skip download (if data already exists):
    python run_pipeline.py --skip-download

Prerequisites
-------------
1. kaggle.json must be in ~/.kaggle/ to download xAPI dataset.
   (See src/data_loader.py for setup instructions if missing.)
2. pip install -r requirements.txt (from the project root)
"""

import os
import sys
import argparse

# Make sure src/ is on the path when running from /ml
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "src"))


def run_all(skip_download: bool = False):
    """Run all stages sequentially."""

    # ── STAGE 1: Data Acquisition ─────────────────────────────────────
    print("\n" + "█" * 55)
    print("  STAGE 1 — Data Acquisition")
    print("█" * 55)
    from data_loader import run_stage1
    df_xapi_raw, df_uci_raw, df_sse_raw = run_stage1()

    # ── STAGE 2: Feature Engineering ─────────────────────────────────
    print("\n" + "█" * 55)
    print("  STAGE 2 — Feature Engineering")
    print("█" * 55)
    from feature_engineering import run_stage2
    df_xapi_canonical, df_uci_canonical, df_sse_canonical = run_stage2(
        df_xapi_raw, df_uci_raw, df_sse_raw
    )

    # ── STAGE 3: Labeling ─────────────────────────────────────────────
    print("\n" + "█" * 55)
    print("  STAGE 3 — Labeling")
    print("█" * 55)
    from labeling import run_stage3
    df_xapi_labeled, df_uci_labeled, df_sse_labeled = run_stage3(
        df_xapi_canonical, df_uci_canonical, df_sse_canonical
    )

    # ── STAGE 4: Training ─────────────────────────────────────────────
    print("\n" + "█" * 55)
    print("  STAGE 4 — Model Training")
    print("█" * 55)
    from train import run_stage4
    model, le, X_test, y_test = run_stage4()

    # ── STAGE 5: Evaluation ───────────────────────────────────────────
    print("\n" + "█" * 55)
    print("  STAGE 5 — Evaluation & SHAP")
    print("█" * 55)
    from evaluate import run_stage5
    metrics = run_stage5(model, le, X_test, y_test)

    print("\n" + "█" * 55)
    print("  ✓ PIPELINE COMPLETE")
    print(f"  Accuracy : {metrics['accuracy']:.4f}")
    print(f"  Macro-F1 : {metrics['macro_f1']:.4f}")
    print("  Reports  : ml/reports/")
    print("  Model    : ml/models/")
    print("█" * 55 + "\n")


def run_single_stage(stage: int):
    """Run a single stage by number (1–6)."""
    if stage == 1:
        from data_loader import run_stage1
        run_stage1()
    elif stage == 2:
        from feature_engineering import run_stage2
        run_stage2()
    elif stage == 3:
        from labeling import run_stage3
        run_stage3()
    elif stage == 4:
        from train import run_stage4
        run_stage4()
    elif stage == 5:
        from evaluate import run_stage5
        run_stage5()
    elif stage == 6:
        from predict import predict_with_confidence
        print("Stage 6 is the inference interface — see src/predict.py.")
        print("Run: python src/predict.py for a quick test.")
    else:
        print(f"Unknown stage: {stage}. Valid stages: 1–6.")
        sys.exit(1)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="AdaptVR ML Pipeline Runner")
    parser.add_argument(
        "--stage", type=int, default=None,
        help="Run a specific stage only (1–6). Omit to run all stages."
    )
    parser.add_argument(
        "--skip-download", action="store_true",
        help="Skip download and load existing raw data files."
    )
    args = parser.parse_args()

    # Change working directory to /ml so relative paths work correctly
    ml_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(ml_dir)

    if args.stage is not None:
        run_single_stage(args.stage)
    else:
        run_all(skip_download=args.skip_download)
