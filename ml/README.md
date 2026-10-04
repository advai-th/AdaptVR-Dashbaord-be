# AdaptVR ML Pipeline

> **AI-Driven Learner State Classifier** for the AdaptVR adaptive VR learning system.
> Predicts a student's engagement level — **Low / Medium / High** — from behavioral interaction features.

---

## ⚠️ Important Limitation (Read First)

> **This model is trained on proxy (non-VR) data.**
>
> Because no public VR learning dataset exists yet, we train on two Intelligent Tutoring System (ITS) datasets that have analogous behavioral features:
> - **xAPI-Edu-Data** (Kaggle) — LMS interaction logs
> - **UCI Student Performance** — school behavioral + grade data
>
> **The model will need fine-tuning once real VR session data is collected.**
> The pipeline is designed to make this swap-in easy — see [Plugging In Real VR Data](#plugging-in-real-vr-data) below.

---

## Project Structure

```
ml/
├── data/
│   ├── raw/              ← Downloaded datasets land here
│   └── processed/        ← Canonicalized + labeled datasets
├── models/
│   ├── xgboost_model.json   ← Trained XGBoost model
│   ├── label_encoder.pkl    ← Maps Low/Medium/High ↔ 0/1/2
│   └── feature_list.json    ← Feature order the model expects
├── reports/
│   ├── data_profile.json    ← Schema + stats for both datasets
│   ├── metrics.json         ← Accuracy, F1 scores
│   ├── confusion_matrix.png ← Prediction error heatmap
│   └── shap_summary.png     ← Feature importance plot
├── src/
│   ├── feature_map.yaml     ← Column mappings per dataset (config)
│   ├── data_loader.py       ← Stage 1: Download & profile data
│   ├── feature_engineering.py ← Stage 2: Transform to canonical schema
│   ├── labeling.py          ← Stage 3: Assign Low/Medium/High labels
│   ├── train.py             ← Stage 4: Train XGBoost classifier
│   ├── evaluate.py          ← Stage 5: Metrics, confusion matrix, SHAP
│   └── predict.py           ← Stage 6: Runtime inference interface
├── run_pipeline.py          ← Master runner (runs all stages)
└── README.md                ← This file
```

---

## Quick Start

### 1. Install Dependencies

```bash
# From the project root (AdaptVR-backend/)
pip install -r requirements.txt
```

### 2. Set Up Kaggle API (for xAPI dataset)

The xAPI-Edu-Data dataset requires a free Kaggle account:

1. Go to [kaggle.com](https://www.kaggle.com) → Account → API → **Create New Token**
2. This downloads `kaggle.json` to your Downloads folder
3. Move it to: `C:\Users\<YourName>\.kaggle\kaggle.json`  
   *(create the `.kaggle` folder if it doesn't exist)*

> **Note:** The UCI Student Performance dataset downloads automatically without any API key.

### 3. Run the Full Pipeline

```bash
cd ml
python run_pipeline.py
```

This runs all 5 stages in sequence and saves everything to `models/` and `reports/`.

### 4. Run a Single Stage

```bash
cd ml
python run_pipeline.py --stage 1   # Data download only
python run_pipeline.py --stage 4   # Training only (assumes stages 1–3 ran)
python run_pipeline.py --stage 5   # Evaluation only
```

### 5. Test the Inference Interface

```bash
cd ml
python src/predict.py
```

---

## Feature Reference

All features are **normalized to [0, 1]** before being fed to the model.

| Feature | What It Measures | Direction |
|---|---|---|
| `error_rate` | Proportion of incorrect answers / actions | ↑ higher = worse |
| `avg_response_time` | Mean time to respond per task | ↑ higher = slower |
| `hint_requests` | Number of help / hint requests | ↑ higher = more help-seeking |
| `idle_time` | Inactivity / pause duration | ↑ higher = less engaged |
| `engagement_score` | Overall performance / engagement level | ↑ higher = better |

### How Features Are Mapped from Proxy Datasets

Since VR telemetry isn't available yet, we use analogous columns:

| Canonical Feature | xAPI-Edu-Data | UCI Student Performance |
|---|---|---|
| `error_rate` | *derived from engagement* | `failures` |
| `avg_response_time` | `AnnouncementsView` | `studytime` (inverted) |
| `hint_requests` | `raisedhands` | `freetime` |
| `idle_time` | `Discussion` | `absences` |
| `engagement_score` | `VisITedResources` | `G3` (final grade) |

> **⚠️ Proxy caveat:** `avg_response_time` and `idle_time` are derived from
> non-time columns and should be replaced with real VR session timestamps.

---

## How Labeling Works

### For xAPI Dataset
The dataset already has `L / M / H` labels, which are mapped directly to `Low / Medium / High`.

### For UCI Dataset (and real VR data)
A **composite score** is computed as a weighted combination:

```
score = 0.30 × (1 - error_rate)        # accuracy
      + 0.20 × (1 - avg_response_time)  # speed
      + 0.20 × (1 - hint_requests)      # self-sufficiency
      + 0.15 × (1 - idle_time)          # focus
      + 0.15 × engagement_score         # performance
```

Labels are then assigned using **percentile-based thresholds** (configurable):

| Label | Default Threshold |
|---|---|
| **Low** | Bottom 33rd percentile |
| **Medium** | 33rd – 66th percentile |
| **High** | Above 66th percentile |

### Adjusting the Thresholds

Edit `run_stage3()` call in `run_pipeline.py` or call directly:

```python
from src.labeling import run_stage3
run_stage3(
    df_xapi, df_uci,
    weights={"accuracy": 0.4, "speed": 0.15, "self_reliance": 0.2,
             "focus": 0.1, "engagement": 0.15},  # custom weights
    thresholds={"low_pct": 25, "high_pct": 75},  # custom percentile cutoffs
)
```

---

## Model Details

| Parameter | Value |
|---|---|
| Algorithm | XGBoost (`multi:softprob`) |
| Max depth | 4 |
| Learning rate | 0.1 |
| Max estimators | 500 (with early stopping) |
| Early stopping | 20 rounds patience on validation loss |
| Class imbalance | Sample weighting (`compute_sample_weight("balanced")`) |
| Train/val/test split | 70% / 10% / 20% |

### Why XGBoost?
- Works well on small/medium tabular datasets
- Handles mixed feature scales without strict preprocessing
- Provides SHAP values natively
- Can be exported to ONNX format for Unity/C# inference

---

## Current Model Performance

> *Performance will vary. Re-run `run_pipeline.py` to get up-to-date numbers.*

See `reports/metrics.json` for the latest numbers after running the pipeline.

Key outputs saved to `reports/`:
- **`metrics.json`** — accuracy, macro-F1, per-class F1
- **`confusion_matrix.png`** — actual vs predicted label heatmap
- **`shap_summary.png`** — feature importance with ⚠ artifact flags

---

## Using the Inference Interface

### From Python (e.g., a Flask/FastAPI wrapper)

```python
from src.predict import predict_learner_state, predict_with_confidence

# Simple prediction
state = predict_learner_state({
    "error_rate":        0.15,
    "avg_response_time": 0.4,
    "hint_requests":     0.1,
    "idle_time":         0.2,
    "engagement_score":  0.85,
})
print(state)   # → "High"

# With confidence scores (useful for dashboard)
result = predict_with_confidence({...})
# Returns: {"predicted_state": "High", "confidence": 0.82,
#           "probabilities": {"High": 0.82, "Medium": 0.15, "Low": 0.03}}
```

### From Node.js Backend

Add a thin Python microservice or use `child_process`:

```javascript
const { execSync } = require("child_process");

function predictLearnerState(features) {
    const featuresJson = JSON.stringify(features);
    const script = `
import sys, json
sys.path.insert(0, 'ml/src')
from predict import predict_with_confidence
print(json.dumps(predict_with_confidence(${featuresJson})))
    `;
    const output = execSync(`python -c "${script}"`).toString();
    return JSON.parse(output);
}
```

> For production, wrap `predict.py` in a FastAPI endpoint and call it via HTTP from Node.js.

---

## Plugging In Real VR Data

When real VR session data is available:

1. **Add a new block** to `ml/src/feature_map.yaml` under `datasets: vr_telemetry:`
2. **Map your raw Unity/VR column names** to the canonical features
3. **Add a loader** function in `data_loader.py` (`load_vr_data()`)
4. **Call it** in `run_pipeline.py` alongside or replacing the proxy datasets
5. **Re-run** `python run_pipeline.py` — everything else adapts automatically

The key principle: the pipeline never hardcodes a dataset. It reads the column mappings from YAML and the feature engineering module handles the rest.

---

## Known Limitations

| Limitation | Impact | Mitigation |
|---|---|---|
| Trained on proxy (non-VR) data | Low confidence on real VR sessions | Fine-tune with VR data when available |
| `avg_response_time` is not a real time value | Feature may mislead model | Replace with VR session timestamps |
| `idle_time` derived from discussion/absence columns | Weak proxy | Replace with actual VR pause durations |
| Small dataset (~1000 combined rows) | Risk of overfitting | Use cross-validation + more data in production |
| No temporal modeling | Can't capture within-session state changes | Add LSTM/rolling window model in v2 |

---

## Files NOT to Commit

Add to `.gitignore`:
```
ml/data/raw/
ml/data/processed/
ml/models/
ml/reports/confusion_matrix.png
ml/reports/shap_summary.png
~/.kaggle/kaggle.json   ← NEVER commit this
```
