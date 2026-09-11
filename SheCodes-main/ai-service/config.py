"""
NeuroAid AI Service - Configuration
======================================
Central configuration for scoring weights, risk thresholds,
and model parameters.

v2.0 — Added:
  - Age-bracket norms (mean + std) for z-score normalization
  - Education correction factors (cognitive reserve)
  - Medical condition risk multipliers (γ coefficients)
  - Fatigue/temporary-factor configuration
  - Logistic regression biases per disease model
"""

# ---------------------------------------------------------------------------
# Scoring weights
# Must sum to 1.0 for the composite score to remain in [0, 100].
# ---------------------------------------------------------------------------
WEIGHTS: dict = {
    "speech":   0.4,
    "memory":   0.4,
    "reaction": 0.2,
}

# ---------------------------------------------------------------------------
# Risk level thresholds  (applied to the 0–100 composite score)
# ---------------------------------------------------------------------------
THRESHOLDS: dict = {
    "low_max":      40,   # score ≤ 40  → Low
    "moderate_max": 70,   # score ≤ 70  → Moderate
                          # score >  70 → High
}

# ---------------------------------------------------------------------------
# ✅ LAYER 1 — Age-bracket norms for z-score normalization
# Source: approximate population norms for reaction time (ms) & memory (%)
# Format: { bracket_label: { "mean": float, "std": float } }
# ---------------------------------------------------------------------------
AGE_NORMS: dict = {
    "reaction_time": {
        "20-39": {"mean": 280, "std": 45},
        "40-59": {"mean": 330, "std": 55},
        "60-75": {"mean": 400, "std": 70},
        "75+":   {"mean": 480, "std": 90},
    },
    "memory_accuracy": {
        "20-39": {"mean": 82, "std": 12},
        "40-59": {"mean": 75, "std": 13},
        "60-75": {"mean": 65, "std": 15},
        "75+":   {"mean": 55, "std": 18},
    },
    "wpm": {
        "20-39": {"mean": 145, "std": 30},
        "40-59": {"mean": 135, "std": 30},
        "60-75": {"mean": 120, "std": 32},
        "75+":   {"mean": 105, "std": 35},
    },
}

def get_age_bracket(age: int) -> str:
    """Return the age bracket string for a given age."""
    if age < 40:
        return "20-39"
    elif age < 60:
        return "40-59"
    elif age < 75:
        return "60-75"
    else:
        return "75+"

def age_z_score(value: float, metric: str, age: int) -> float:
    """
    Compute an age-adjusted z-score for a given metric.
    Z = (X - μ_age) / σ_age
    Positive Z = above peer mean (better), Negative = below peer mean (worse).
    """
    bracket = get_age_bracket(age)
    norms = AGE_NORMS.get(metric, {}).get(bracket)
    if not norms:
        return 0.0
    z = (value - norms["mean"]) / norms["std"]
    return round(z, 3)

# ---------------------------------------------------------------------------
# ✅ LAYER 2 — Education correction factors (cognitive reserve)
# education_level: 1=No formal, 2=Primary, 3=Secondary, 4=Graduate, 5=Postgrad
# β_education is added to the raw memory score before risk computation.
# ---------------------------------------------------------------------------
EDUCATION_CORRECTION: dict = {
    1: +0.05,   # No formal schooling → compensate upward
    2: +0.03,   # Primary school
    3:  0.00,   # Secondary (baseline)
    4:  0.00,   # Graduate (no adjustment)
    5: -0.02,   # Postgraduate → stricter threshold
}

def get_education_correction(education_level: int) -> float:
    """Return the β_education correction factor (added to memory score)."""
    return EDUCATION_CORRECTION.get(education_level, 0.0)

# ---------------------------------------------------------------------------
# ✅ LAYER 3 — Medical condition risk multipliers (γ coefficients)
# R_final = R × (1 + γ1·D + γ2·H + γ3·S + ...) capped at 0.95
# ---------------------------------------------------------------------------
CONDITION_MULTIPLIERS: dict = {
    "diabetes":           0.04,   # γ1 — vascular cognitive risk
    "hypertension":       0.05,   # γ2 — vascular dementia risk
    "stroke_history":     0.08,   # γ3 — highest single factor
    "family_alzheimers":  0.06,   # γ4 — genetic predisposition
    "parkinsons_dx":      0.10,   # γ5 — existing PD diagnosis
    "depression":         0.04,   # γ6 — linked to dementia risk
    "thyroid_disorder":   0.03,   # γ7 — cognitive impairment link
}

MAX_RISK_CAP = 0.95  # Never output probability > 0.95

def apply_condition_multipliers(base_risk: float, conditions: dict) -> float:
    """
    Apply medical condition risk multipliers.
    conditions: { "diabetes": True/False, "hypertension": True/False, ... }
    Returns capped final risk probability.
    """
    gamma_sum = sum(
        CONDITION_MULTIPLIERS.get(k, 0.0)
        for k, v in conditions.items() if v
    )
    r_final = base_risk * (1 + gamma_sum)
    return min(r_final, MAX_RISK_CAP)

# ---------------------------------------------------------------------------
# ✅ LAYER 4 — Fatigue / temporary factor configuration
# ---------------------------------------------------------------------------
FATIGUE_FACTORS: dict = {
    "tired":          0.10,   # Self-reported tiredness
    "sleep_deprived": 0.12,   # < 5 hours sleep
    "sick":           0.08,   # Currently ill
    "anxious":        0.06,   # High anxiety/stress
}

FATIGUE_CONFIDENCE_THRESHOLD = 0.75  # Below this → recommend retest

def compute_confidence_score(
    missing_data_ratio: float,
    fatigue_flags: dict,
) -> float:
    """
    Confidence = 1 - MissingDataRatio - FatiguePenalty
    fatigue_flags: { "tired": True, "sleep_deprived": False, ... }
    """
    fatigue_penalty = sum(
        FATIGUE_FACTORS.get(k, 0.0)
        for k, v in fatigue_flags.items() if v
    )
    confidence = 1.0 - missing_data_ratio - fatigue_penalty
    return round(max(0.0, min(1.0, confidence)), 3)

# ---------------------------------------------------------------------------
# Model paths  (dummy paths – replace with real paths when models are ready)
# ---------------------------------------------------------------------------
MODEL_PATHS: dict = {
    "speech_model":   "models/speech_classifier.pt",
    "memory_model":   "models/memory_classifier.pt",
    "reaction_model": "models/reaction_regressor.pt",
    "whisper_model":  "models/whisper_base",
}

# ---------------------------------------------------------------------------
# Audio preprocessing settings
# ---------------------------------------------------------------------------
AUDIO_CONFIG: dict = {
    "sample_rate":   16000,
    "n_mfcc":        13,
    "hop_length":    512,
    "n_fft":         2048,
}

# ---------------------------------------------------------------------------
# Reaction-time normalisation settings
# ---------------------------------------------------------------------------
REACTION_CONFIG: dict = {
    "min_rt_ms": 100,
    "max_rt_ms": 1500,
}

# ---------------------------------------------------------------------------
# Ethical safeguards — output language rules
# ---------------------------------------------------------------------------
SAFE_OUTPUT_LANGUAGE: dict = {
    "disclaimer": (
        "⚠️ This is NOT a diagnosis. This tool identifies cognitive risk indicators only. "
        "Always consult a qualified neurologist or physician for clinical evaluation."
    ),
    "elevated_risk_phrase": "Elevated cognitive risk indicators detected.",
    "retest_recommendation": "Results may be temporarily affected by fatigue. Please retest after adequate rest.",
    "forbidden_phrases": [
        "You likely have Alzheimer's",
        "You have dementia",
        "You are diagnosed with",
    ],
}
