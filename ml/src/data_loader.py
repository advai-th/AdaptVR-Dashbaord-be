import sys
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

"""
src/data_loader.py
==================
STAGE 1 — Data Acquisition & Profiling

PURPOSE
-------
This module handles downloading and loading both proxy datasets, then
saves a short data-profile report to /reports.  When you have real VR
data, you just need to add a new loader function following the same
pattern (load_vr_data) and call it from run_stage1().

TWO DATASETS
------------
1. xAPI-Edu-Data  (Kaggle: aljarah/xAPI-Edu-Data)
   — LMS interaction logs from a real e-learning ITS.
   — Has a built-in L/M/H label, which we'll use directly.

2. UCI Student Performance  (student-mat.csv)
   — Behavioural + grade data from Portuguese secondary schools.
   — No pre-existing label; we'll derive one in Stage 3.

WHY THESE TWO?
--------------
Neither is VR data, but both capture:
  - Help-seeking (hand raises, family/school support)
  - Task performance (grades, failures)
  - Engagement level (resource visits, discussion, absences)
…which are the closest analogues available to VR behavioral features
in public ITS/education datasets.
"""

import os
import sys
import json
import zipfile
import urllib.request

import pandas as pd
import numpy as np

# ── Paths ────────────────────────────────────────────────────────────
# All paths are relative to the /ml directory so the script works
# regardless of where you call it from.
ML_ROOT    = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_RAW   = os.path.join(ML_ROOT, "data", "raw")
REPORTS    = os.path.join(ML_ROOT, "reports")

# UCI Student Performance dataset — direct public download URL
UCI_URL = (
    "https://archive.ics.uci.edu/ml/machine-learning-databases/"
    "00320/student.zip"
)


# ─────────────────────────────────────────────────────────────────────
#  KAGGLE SETUP HELPER
# ─────────────────────────────────────────────────────────────────────

def check_kaggle_credentials():
    """
    Checks whether kaggle.json exists.  If not, prints clear setup
    instructions and exits so the user knows exactly what to do.

    Why kaggle.json?
    ----------------
    The Kaggle API authenticates via a personal token stored in
    ~/.kaggle/kaggle.json.  Without it the download will always fail.
    """
    kaggle_json = os.path.expanduser("~/.kaggle/kaggle.json")

    if not os.path.exists(kaggle_json):
        print("\n" + "=" * 60)
        print("KAGGLE API KEY NOT FOUND")
        print("=" * 60)
        print(
            "\nTo download the xAPI-Edu-Data dataset you need a free"
            " Kaggle account and an API token.\n"
            "\nSTEPS:\n"
            "  1. Go to https://www.kaggle.com and sign in.\n"
            "  2. Click your profile picture → Account.\n"
            "  3. Scroll to 'API' section → click 'Create New Token'.\n"
            "  4. This downloads kaggle.json to your Downloads folder.\n"
            "  5. Move it to: C:\\Users\\<YourName>\\.kaggle\\kaggle.json\n"
            "     (create the .kaggle folder if it doesn't exist).\n"
            "  6. Re-run this script.\n"
        )
        print("=" * 60 + "\n")
        return False

    # Warn if permissions are too open (Kaggle recommends 600 on Linux/Mac;
    # on Windows this isn't enforced but it's good to note.)
    print(f"[✓] Kaggle credentials found at: {kaggle_json}")
    return True


# ─────────────────────────────────────────────────────────────────────
#  DATASET 1 — xAPI-Edu-Data (Kaggle)
# ─────────────────────────────────────────────────────────────────────

def download_xapi_dataset():
    """
    Downloads xAPI-Edu-Data via the Kaggle API.
    Saves to data/raw/xAPI-Edu-Data.csv.

    Returns True on success, False if credentials are missing.
    """
    out_path = os.path.join(DATA_RAW, "xAPI-Edu-Data.csv")
    if os.path.exists(out_path):
        print(f"[✓] xAPI dataset already exists at: {out_path}")
        return True

    if not check_kaggle_credentials():
        return False

    # Import kaggle here (not at top) so the module loads even without
    # kaggle installed — we give a friendly error instead of a crash.
    try:
        import kaggle
    except ImportError:
        print("[✗] kaggle package not installed. Run: pip install kaggle")
        return False

    print("[…] Downloading xAPI-Edu-Data from Kaggle…")
    kaggle.api.authenticate()
    kaggle.api.dataset_download_files(
        "aljarah/xapi-edu-data",
        path=DATA_RAW,
        unzip=True,
    )
    print(f"[✓] xAPI dataset downloaded to: {DATA_RAW}")
    return True


def load_xapi_dataset():
    """
    Loads xAPI-Edu-Data.csv into a DataFrame.

    Returns
    -------
    pd.DataFrame or None
    """
    csv_path = os.path.join(DATA_RAW, "xAPI-Edu-Data.csv")
    if not os.path.exists(csv_path):
        print(f"[✗] File not found: {csv_path}")
        return None

    df = pd.read_csv(csv_path)
    print(f"\n[✓] xAPI dataset loaded — shape: {df.shape}")
    return df


# ─────────────────────────────────────────────────────────────────────
#  DATASET 2 — UCI Student Performance
# ─────────────────────────────────────────────────────────────────────

def download_uci_dataset():
    """
    Downloads UCI Student Performance dataset directly from UCI's
    public repository (no API key required).

    Returns True on success.
    """
    out_csv = os.path.join(DATA_RAW, "student-mat.csv")
    if os.path.exists(out_csv):
        print(f"[✓] UCI dataset already exists at: {out_csv}")
        return True

    zip_path = os.path.join(DATA_RAW, "student.zip")

    print(f"[…] Downloading UCI Student Performance dataset from UCI…")
    try:
        urllib.request.urlretrieve(UCI_URL, zip_path)
    except Exception as e:
        print(f"[✗] Download failed: {e}")
        return False

    # The zip contains student-mat.csv (Math) and student-por.csv (Portuguese).
    # We use Math since it has more consistent feature coverage.
    with zipfile.ZipFile(zip_path, "r") as z:
        z.extractall(DATA_RAW)

    if os.path.exists(out_csv):
        print(f"[✓] UCI dataset extracted to: {out_csv}")
        os.remove(zip_path)   # clean up the zip
        return True
    else:
        print("[✗] student-mat.csv not found after extraction.")
        return False


def load_uci_dataset():
    """
    Loads student-mat.csv into a DataFrame.

    Note: This CSV uses semicolons (;) as separators — common for
    European academic datasets.

    Returns
    -------
    pd.DataFrame or None
    """
    csv_path = os.path.join(DATA_RAW, "student-mat.csv")
    if not os.path.exists(csv_path):
        print(f"[✗] File not found: {csv_path}")
        return None

    df = pd.read_csv(csv_path, sep=";")
    print(f"[✓] UCI dataset loaded — shape: {df.shape}")
    return df


# ─────────────────────────────────────────────────────────────────────
#  DATASET 3 — SuperEnglish/SimpleEnglish (Zenodo)
# ─────────────────────────────────────────────────────────────────────

def load_super_simple_english():
    """
    Loads the SuperEnglish/SimpleEnglish dataset from the local xlsx file
    (already downloaded to data/raw/).

    Returns a merged DataFrame with per-session telemetry rows enriched with
    the per-participant E_Avg (engagement scale score) from the
    Usability_Engagement sheet.

    Shape: 632 rows × ~7 columns

    Why we merge Telemetry + Usability_Engagement:
    -----------------------------------------------
    - Telemetry sheet: 632 session rows with real MeanAnswerTime and MeanHesitation
    - Usability_Engagement sheet: 96 participant rows with validated E_Avg score
    We join on 'User' so every session row gets the participant's engagement score.
    """
    xlsx_path = os.path.join(DATA_RAW, "SuperSimpleEnglish_Data.xlsx")
    if not os.path.exists(xlsx_path):
        print(f"[✗] SuperSimpleEnglish_Data.xlsx not found at: {xlsx_path}")
        print("    Download it from: https://zenodo.org/records/19926382")
        return None

    try:
        import openpyxl  # noqa: F401 — just check it's available
    except ImportError:
        print("[✗] openpyxl not installed. Run: pip install openpyxl")
        return None

    print("[...] Loading SuperEnglish/SimpleEnglish dataset...")

    # Load both sheets
    xl = pd.ExcelFile(xlsx_path)
    df_telemetry = xl.parse("Telemetry")
    df_engagement = xl.parse("Usability_Engagement")[["User", "E_Avg"]]

    # Merge per-session telemetry with per-user engagement score
    df = df_telemetry.merge(df_engagement, on="User", how="left")

    print(f"[OK] SuperSimpleEnglish dataset loaded -- shape: {df.shape}")
    print(f"     Columns: {list(df.columns)}")
    return df


# ─────────────────────────────────────────────────────────────────────
#  PROFILING UTILITY
# ─────────────────────────────────────────────────────────────────────

def profile_dataset(df: pd.DataFrame, name: str) -> dict:
    """
    Prints a concise schema + summary stats and returns a dict that
    gets saved to reports/data_profile.json.

    What we check and why
    ---------------------
    - dtypes        : tells us which columns need encoding
    - nulls         : we need to handle missing data before training
    - value_counts  : for the label column, to see class balance
    - describe()    : min/max/mean to spot scale differences between features
                      (tree models like XGBoost don't require scaling, but
                      it's good practice to document it)
    """
    print(f"\n{'='*55}")
    print(f" PROFILE: {name}")
    print(f"{'='*55}")
    print(f"  Rows: {df.shape[0]}   Columns: {df.shape[1]}")
    print(f"\n--- Column Types ---")
    print(df.dtypes.to_string())
    print(f"\n--- Missing Values ---")
    null_counts = df.isnull().sum()
    print(null_counts[null_counts > 0].to_string() if null_counts.sum() > 0
          else "  (none)")
    print(f"\n--- Numeric Summary ---")
    print(df.describe().round(2).to_string())

    # Build a serialisable profile dict for the JSON report
    profile = {
        "dataset": name,
        "rows": df.shape[0],
        "columns": df.shape[1],
        "column_dtypes": df.dtypes.astype(str).to_dict(),
        "null_counts": df.isnull().sum().to_dict(),
        "numeric_summary": df.describe().round(2).to_dict(),
    }

    # Show label distribution if a 'Class' or label-like column exists
    for col in ["Class", "G3", "learner_state"]:
        if col in df.columns:
            print(f"\n--- '{col}' Distribution ---")
            print(df[col].value_counts().to_string())
            profile[f"{col}_distribution"] = df[col].value_counts().to_dict()

    return profile


# ─────────────────────────────────────────────────────────────────────
#  MAIN STAGE 1 RUNNER
# ─────────────────────────────────────────────────────────────────────

def run_stage1():
    """
    Orchestrates Stage 1:
      1. Download proxy datasets (skips if already present).
      2. Load into DataFrames — including SuperSimpleEnglish if available.
      3. Print profiles.
      4. Save a combined data_profile.json to /reports.

    Returns
    -------
    tuple: (df_xapi, df_uci, df_sse)
           Any may be None if download/load failed.
           df_sse = SuperSimpleEnglish dataset (632 session rows)
    """
    os.makedirs(DATA_RAW, exist_ok=True)
    os.makedirs(REPORTS, exist_ok=True)

    all_profiles = {}

    # ── xAPI ──────────────────────────────────────────────────────────
    xapi_ok = download_xapi_dataset()
    df_xapi = load_xapi_dataset() if xapi_ok else None
    if df_xapi is not None:
        all_profiles["xapi_edu"] = profile_dataset(df_xapi, "xAPI-Edu-Data")

    # ── UCI ───────────────────────────────────────────────────────────
    uci_ok = download_uci_dataset()
    df_uci = load_uci_dataset() if uci_ok else None
    if df_uci is not None:
        all_profiles["uci_student"] = profile_dataset(
            df_uci, "UCI Student Performance (Math)"
        )

    # ── SuperSimpleEnglish ────────────────────────────────────────────
    # Already downloaded — just load from disk.
    df_sse = load_super_simple_english()
    if df_sse is not None:
        all_profiles["super_simple_english"] = profile_dataset(
            df_sse, "SuperEnglish/SimpleEnglish (Zenodo)"
        )

    # ── Save profile report ───────────────────────────────────────────
    report_path = os.path.join(REPORTS, "data_profile.json")
    with open(report_path, "w", encoding="utf-8") as f:
        json.dump(all_profiles, f, indent=2, default=str)
    print(f"\n[OK] Data profile saved to: {report_path}")

    return df_xapi, df_uci, df_sse


# ─────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    df_xapi, df_uci, df_sse = run_stage1()
