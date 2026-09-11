# 🧠 NeuroAid V4 — Cognitive Risk Screening Tool

> ⚠️ This is a behavioral screening tool, NOT a medical diagnostic system.
> Always consult a qualified neurologist or physician for clinical evaluation.

---

## What's New in V4

V4 merges the best of two versions:
- **V3 architecture** — JSON persistence, auth router, messaging, content manager, clean separation
- **V2 brain logic** — 4-layer clinical pipeline, medical conditions, education correction
- **New ML layer** — anomaly detection, hybrid scoring, confidence intervals, feature importance

---

## Architecture

```
backend/
├── core/                          ← NEW in V4 (V2 logic + ML)
│   ├── clinical_config.py         ← Age norms, education correction, condition multipliers, fatigue
│   ├── ml_engine.py               ← Hybrid scoring, anomaly detection, confidence intervals
│   └── progress_tracker.py        ← Trend analysis, trajectory computation
│
├── routers/
│   ├── analyze.py                 ← Main scoring pipeline (updated for V4)
│   ├── auth.py                    ← JSON-based auth (register/login/logout)
│   ├── messages.py                ← Patient–doctor messaging
│   └── content.py                 ← Doctor content manager
│
├── services/
│   └── ai_service.py              ← 18-feature extractor + 3-disease logistic models
│
├── models/
│   └── schemas.py                 ← Pydantic models (extended for V4 fields)
│
└── data/                          ← JSON persistence (gitignored)
    ├── users.json
    ├── sessions.json
    ├── results.json
    └── messages.json
```

---

## Scoring Pipeline (4 Layers)

### Layer 1 — Feature Extraction (18 features)
Five cognitive domains → one 18-dimensional feature vector:
- **Speech (5):** WPM, speed deviation, variability, pause ratio, start delay
- **Memory (5):** Immediate recall, delayed recall, intrusions, latency, order ratio
- **Reaction (5):** Mean RT, std RT, min RT, drift, miss count
- **Executive (2):** Stroop error rate, Stroop RT
- **Motor (1):** Tap interval std

### Layer 2 — Disease-Specific Logistic Models
Three separate logistic regression models with clinically-tuned weights:
- **Alzheimer's** — dominated by memory + word-finding
- **General Dementia** — attention + processing speed + broad decline
- **Parkinson's** — motor timing + bradykinesia

### Layer 3 — Clinical Adjustments (from V2)
- **Age-adjusted z-score norms** — population-based correction per age bracket
- **Education correction** — cognitive reserve factor on memory score
- **Medical condition multipliers** — 7 clinical comorbidities (diabetes, hypertension, stroke, etc.)
- **Fatigue confidence** — session quality score with retest recommendation

### Layer 4 — ML Hybrid Scoring
```
Final Risk = 0.6 × Clinical-Adjusted Probability + 0.4 × Raw ML Probability
```
Plus:
- **95% Confidence Interval** on hybrid risk
- **Progress Anomaly Detection** (Z-score based) — alerts on sudden drops
- **Feature Importance** — top 6 explainable clinical factors

---

## API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register patient or doctor |
| POST | `/api/auth/login` | Login with role validation |
| POST | `/api/auth/logout` | Invalidate session |
| GET | `/api/auth/me` | Get current user profile |
| PUT | `/api/auth/me` | Update profile |
| GET | `/api/auth/patients` | Doctor: list all patients |
| GET | `/api/auth/doctors` | Patient: list all doctors |

### Analysis
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/analyze` | Run full cognitive assessment |
| GET | `/api/results/my` | Get own results + progress summary |
| GET | `/api/results/patient/{id}` | Doctor: get patient results |

### Messaging
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/messages/send` | Send message |
| GET | `/api/messages/{other_user_id}` | Get conversation |
| GET | `/api/conversations` | List all conversations |
| GET | `/api/messages/unread/count` | Unread count |

---

## New Request Fields (V4)

The `/api/analyze` endpoint now accepts two new optional objects:

```json
{
  "conditions": {
    "diabetes": false,
    "hypertension": true,
    "stroke_history": false,
    "family_alzheimers": true,
    "parkinsons_dx": false,
    "depression": false,
    "thyroid_disorder": false
  },
  "fatigue": {
    "tired": false,
    "sleep_deprived": true,
    "sick": false,
    "anxious": false
  }
}
```

---

## New Response Fields (V4)

```json
{
  "hybrid_risk": 0.3841,
  "confidence": 0.88,
  "recommend_retest": false,
  "ci_lower": 0.344,
  "ci_upper": 0.424,
  "ci_label": "38.4% (±4%)",
  "anomaly_alert": "none",
  "anomaly_details": null,
  "feature_importance": [
    {"feature": "delayed_recall_accuracy", "importance": 0.35, "value": 72.5},
    {"feature": "immediate_recall_accuracy", "importance": 0.30, "value": 78.0}
  ]
}
```

---

## Setup & Run

```bash
# Backend
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000

# Frontend
cd frontend
npm install
npm run dev
```

---

## Validation Notes

All scoring uses approximate population norms inspired by MMSE/MoCA literature.
Logistic model weights are clinically-tuned heuristics for hackathon use.
Validation metrics (sensitivity 0.82, specificity 0.78, AUC 0.85) are simulated.
**This tool requires real clinical validation before any medical use.**
