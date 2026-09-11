"""
schemas.py — NeuroAid V4
Extended with all fields required by ResultsPage, ProgressPage, ProfileSetup,
and Cognitive Games Engine (SIH PS 26003).
"""
from datetime import datetime
from typing import Dict, List, Optional, Any, Literal
from pydantic import BaseModel, Field


# ── Sub-payloads from frontend ─────────────────────────────────────────────────

class SpeechData(BaseModel):
    audio_b64: Optional[str] = None
    wpm: Optional[float] = None
    speed_deviation: Optional[float] = None
    speech_speed_variability: Optional[float] = None
    pause_ratio: Optional[float] = None
    completion_ratio: Optional[float] = None
    restart_count: Optional[int] = 0
    speech_start_delay: Optional[float] = None

class MemoryData(BaseModel):
    word_recall_accuracy: float = Field(default=50.0, ge=0, le=100)
    pattern_accuracy: float = Field(default=50.0, ge=0, le=100)
    delayed_recall_accuracy: Optional[float] = Field(default=None, ge=0, le=100)
    recall_latency_seconds: Optional[float] = None
    order_match_ratio: Optional[float] = None
    intrusion_count: Optional[int] = 0

class ReactionData(BaseModel):
    times: List[float] = Field(default_factory=list)
    miss_count: Optional[int] = 0
    initiation_delay: Optional[float] = None

class StroopData(BaseModel):
    total_trials: int = 0
    error_count: int = 0
    mean_rt: Optional[float] = None
    incongruent_rt: Optional[float] = None

class TapData(BaseModel):
    intervals: List[float] = Field(default_factory=list)
    tap_count: int = 0

class UserProfile(BaseModel):
    age: Optional[int] = None
    education_level: Optional[int] = None   # 1–5
    sleep_hours: Optional[float] = None

class MedicalConditions(BaseModel):
    diabetes: bool = False
    hypertension: bool = False
    stroke_history: bool = False
    family_alzheimers: bool = False
    parkinsons_dx: bool = False
    depression: bool = False
    thyroid_disorder: bool = False

class FatigueFlags(BaseModel):
    tired: bool = False
    sleep_deprived: bool = False
    sick: bool = False
    anxious: bool = False

# ── Main request ───────────────────────────────────────────────────────────────

class AnalyzeRequest(BaseModel):
    speech_audio: Optional[str] = None
    memory_results: Dict[str, float] = Field(default_factory=lambda: {"word_recall_accuracy": 50.0, "pattern_accuracy": 50.0})
    reaction_times: List[float] = Field(default_factory=list)
    speech: Optional[SpeechData] = None
    memory: Optional[MemoryData] = None
    reaction: Optional[ReactionData] = None
    stroop: Optional[StroopData] = None
    tap: Optional[TapData] = None
    profile: Optional[UserProfile] = None
    conditions: Optional[MedicalConditions] = None
    fatigue: Optional[FatigueFlags] = None

# ── Feature vector (18 features) ──────────────────────────────────────────────

class FeatureVector(BaseModel):
    wpm: float
    speed_deviation: float
    speech_variability: float
    pause_ratio: float
    speech_start_delay: float
    immediate_recall_accuracy: float
    delayed_recall_accuracy: float
    intrusion_count: float
    recall_latency: float
    order_match_ratio: float
    mean_rt: float
    std_rt: float
    min_rt: float
    reaction_drift: float
    miss_count: float
    stroop_error_rate: float
    stroop_rt: float
    tap_interval_std: float

class DiseaseRiskLevels(BaseModel):
    alzheimers: str
    dementia: str
    parkinsons: str

# ── Response (V4) ──────────────────────────────────────────────────────────────

class AnalyzeResponse(BaseModel):
    # Domain scores (0–100, higher = healthier)
    speech_score: float
    memory_score: float
    reaction_score: float
    executive_score: float
    motor_score: float

    # Disease-specific probabilities (0–1)
    alzheimers_risk: float
    dementia_risk: float
    parkinsons_risk: float
    risk_levels: DiseaseRiskLevels

    # V4 composite + wellness
    composite_risk_score: Optional[float] = None   # 0–100, higher = more risk

    # V4 hybrid + CI
    hybrid_risk: Optional[float] = None
    confidence: Optional[float] = None
    recommend_retest: Optional[bool] = None
    ci_lower: Optional[float] = None
    ci_upper: Optional[float] = None
    ci_label: Optional[str] = None
    logistic_risk_probability: Optional[float] = None
    confidence_interval_label: Optional[str] = None

    # V4 anomaly detection
    anomaly_alert: Optional[str] = None
    anomaly_details: Optional[Dict[str, Any]] = None

    # V4 explainability — risk_drivers (for RiskDriversPanel)
    risk_drivers: Optional[Dict[str, float]] = None

    # V4 feature importance
    feature_importance: Optional[List[Dict]] = None

    # V4 model validation
    model_validation: Optional[Dict[str, Any]] = None

    # Feature transparency
    feature_vector: Optional[FeatureVector] = None
    attention_variability_index: Optional[float] = None

    disclaimer: str = (
        "⚠️ This is a behavioral screening tool only. "
        "It is NOT a medical diagnosis. Always consult a qualified "
        "neurologist or physician for clinical evaluation."
    )


# ── Cognitive Games Schemas (SIH PS 26003) ────────────────────────────────────

class GameCatalogueItem(BaseModel):
    id: str
    title: str
    tagline: str
    description: str
    cognitive_domain: str
    domain_label: str
    icon: str
    accent_color: str
    levels: List[int] = Field(default_factory=lambda: [1, 2, 3])
    instructions: Dict[str, str] = Field(default_factory=dict)


class AdaptiveAdjustment(BaseModel):
    previous_level: int
    new_level: int
    reason: List[str]
    adjustment: str = "maintain"  # "increase" | "decrease" | "maintain"
    metrics_summary: Optional[Dict[str, Any]] = None
    clinical_rationale: Optional[str] = None


class GameRecommendationResponse(BaseModel):
    game_id: str
    recommended_level: int
    previous_level: int
    reason: List[str]
    clinical_rationale: Optional[str] = None


class GameSessionSubmit(BaseModel):
    client_action_id: Optional[str] = Field(default=None, max_length=100)
    game_id: str
    difficulty_level: int = Field(default=1, ge=1, le=3)
    duration_seconds: float = Field(..., ge=0)
    moves_count: int = Field(default=0, ge=0)
    mistakes_count: int = Field(default=0, ge=0)
    score: Optional[float] = Field(default=None, ge=0, le=100)
    completed: bool = True
    accuracy: Optional[float] = Field(default=None, ge=0.0, le=1.0)
    response_time: Optional[float] = Field(default=None, ge=0.0)
    error_rate: Optional[float] = Field(default=None, ge=0.0, le=1.0)
    completion_rate: Optional[float] = Field(default=None, ge=0.0, le=1.0)
    language: str = "en"
    telemetry: Optional[Dict[str, Any]] = None


class GameSessionResponse(BaseModel):
    session_id: str
    game_id: str
    game_title: str
    cognitive_domain: str
    difficulty_level: int
    score: float
    stars: int
    stars_label: str
    feedback_message: str
    performance_level: str
    duration_seconds: float
    moves_count: int
    mistakes_count: int
    timestamp: str
    adaptive_difficulty: Optional[AdaptiveAdjustment] = None


class GameStatsSummary(BaseModel):
    total_games_played: int
    total_stars_earned: int
    current_streak_days: int
    domain_scores: Dict[str, float]
    recent_sessions: List[Dict[str, Any]] = Field(default_factory=list)


# ── Rhythm & Recall Models (Music-Based Engagement) ───────────────────────────

class SongItem(BaseModel):
    id: str
    title: str
    era: str  # e.g., "1950s", "1960s", "1970s", "Folk Classic"
    region_or_language: str  # e.g., "Hindi", "Bengali", "English", "Spanish", "Assamese"
    audio_url: str  # local static or synthesized asset path
    bpm: int  # Beats per Minute for rhythm timing
    beat_timestamps: List[float]  # Array of exact beat offsets in seconds for tap scoring
    distractor_titles: List[str]  # 3 alternate choices for multiple-choice mode
    artist: Optional[str] = None
    cultural_notes: Optional[str] = None


class RhythmRecallSubmission(BaseModel):
    patient_id: str
    game_id: Literal["rhythm_and_recall"] = "rhythm_and_recall"
    mode: Literal["rhythm_tap", "song_recognition", "free_sing"]
    song_id: str
    rhythm_accuracy: float = Field(..., ge=0.0, le=100.0)  # Pure engagement metric
    song_recognition_accuracy: Optional[bool] = None
    sing_along_duration_sec: Optional[float] = None
    mood_pre_session: Optional[int] = Field(default=None, ge=1, le=5)
    mood_post_session: Optional[int] = Field(default=None, ge=1, le=5)
    agitation_level_observed: Optional[int] = Field(default=None, ge=1, le=5)
    completed_at: Optional[datetime] = None
    client_action_id: Optional[str] = None


class RhythmRecallSession(BaseModel):
    session_id: str
    patient_id: str
    game_id: str = "rhythm_and_recall"
    mode: str
    song_id: str
    song_title: str
    rhythm_accuracy: float
    song_recognition_accuracy: Optional[bool] = None
    sing_along_duration_sec: Optional[float] = None
    mood_pre_session: Optional[int] = None
    mood_post_session: Optional[int] = None
    mood_shift: Optional[int] = None  # post - pre: positive means mood improved
    agitation_level_observed: Optional[int] = None
    score: float
    stars: int
    stars_label: str
    feedback_message: str
    performance_level: str
    completed_at: str


class RhythmRecallRecommendationResponse(BaseModel):
    recommended: bool
    is_sundowning_window: bool
    reason: str
    clinical_rationale: str
    suggested_mode: str
    calming_prompt: str
    recommended_songs: List[SongItem] = Field(default_factory=list)

