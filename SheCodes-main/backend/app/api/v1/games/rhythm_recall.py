"""
rhythm_recall.py — Rhythm & Recall Music-Based Engagement API
============================================================
Targets procedural and emotional musical memory preserved in Alzheimer's disease
and related dementias (caudal anterior cingulate cortex and ventral pre-SMA).
Provides low-frustration, mood-stabilizing evening sundowning engagement.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Header, Query

from core.game_scoring import calculate_game_score
from core.storage import (
    game_sessions_store,
    rhythm_sessions_store,
    rhythm_songs_store,
    users_store,
)
from models.schemas import (
    RhythmRecallRecommendationResponse,
    RhythmRecallSession,
    RhythmRecallSubmission,
    SongItem,
)
from services import auth_service

router = APIRouter(tags=["rhythm_recall"])


def _optional_user(authorization: Optional[str]) -> Optional[Dict[str, Any]]:
    if not authorization:
        return None
    try:
        token = auth_service.extract_bearer_token(authorization)
        return auth_service.get_user_from_token(token)
    except Exception:
        return None


# ── Seed songs fallback ────────────────────────────────────────────────────────
DEFAULT_SEED_SONGS: List[Dict[str, Any]] = [
    {
        "id": "song-001",
        "title": "Pyar Hua Iqrar Hua",
        "artist": "Manna Dey & Lata Mangeshkar (Shree 420)",
        "era": "1950s",
        "region_or_language": "Hindi",
        "audio_url": "/audio/pyar_hua.mp3",
        "bpm": 76,
        "beat_timestamps": [
            0.79, 1.58, 2.37, 3.16, 3.95, 4.74, 5.53, 6.32, 7.11, 7.90, 8.68, 9.47, 10.26, 11.05, 11.84, 12.63, 13.42, 14.21, 15.00
        ],
        "distractor_titles": ["Mera Joota Hai Japani", "Awaara Hoon", "Yeh Raat Bheegi Bheegi"],
        "cultural_notes": "Iconic umbrella rain ballad that evokes cherished nostalgic memories of classic Indian cinema."
    },
    {
        "id": "song-002",
        "title": "Kora Kagaz Tha Yeh Man Mera",
        "artist": "Kishore Kumar & Lata Mangeshkar (Aradhana)",
        "era": "1960s",
        "region_or_language": "Hindi",
        "audio_url": "/audio/kora_kagaz.mp3",
        "bpm": 82,
        "beat_timestamps": [
            0.73, 1.46, 2.20, 2.93, 3.66, 4.39, 5.12, 5.85, 6.59, 7.32, 8.05, 8.78, 9.51, 10.24, 10.98, 11.71, 12.44, 13.17, 13.90
        ],
        "distractor_titles": ["Roop Tera Mastana", "Mere Sapno Ki Rani", "Chura Liya Hai Tumne"],
        "cultural_notes": "Gentle acoustic guitar and flute intro, familiar melody known across generations."
    },
    {
        "id": "song-003",
        "title": "Yeh Dosti Hum Nahi Todenge",
        "artist": "Kishore Kumar & Manna Dey (Sholay)",
        "era": "1970s",
        "region_or_language": "Hindi",
        "audio_url": "/audio/yeh_dosti.mp3",
        "bpm": 108,
        "beat_timestamps": [
            0.56, 1.11, 1.67, 2.22, 2.78, 3.33, 3.89, 4.44, 5.00, 5.56, 6.11, 6.67, 7.22, 7.78, 8.33, 8.89, 9.44, 10.00, 10.56
        ],
        "distractor_titles": ["Dum Maro Dum", "Mehbooba Mehbooba", "Jai Ho"],
        "cultural_notes": "Uplifting harmonica anthem celebrating lifelong friendship and joyful camaraderie."
    },
    {
        "id": "song-004",
        "title": "Buku Hom Hom Kore",
        "artist": "Dr. Bhupen Hazarika",
        "era": "Folk Classic",
        "region_or_language": "Assamese",
        "audio_url": "/audio/buku_hom_hom.mp3",
        "bpm": 68,
        "beat_timestamps": [
            0.88, 1.76, 2.65, 3.53, 4.41, 5.29, 6.18, 7.06, 7.94, 8.82, 9.71, 10.59, 11.47, 12.35, 13.24, 14.12, 15.00, 15.88, 16.76
        ],
        "distractor_titles": ["Bistirno Parore", "Manuhe Manuhor Babe", "Dil Hoom Hoom Kare"],
        "cultural_notes": "Heartfelt North Eastern classic with deeply comforting baritone melody that triggers procedural memory."
    },
    {
        "id": "song-006",
        "title": "Ami Chini Go Chini Tomare",
        "artist": "Rabindranath Tagore (Rabindrasangeet)",
        "era": "Folk Classic",
        "region_or_language": "Bengali",
        "audio_url": "/audio/ami_chini.mp3",
        "bpm": 72,
        "beat_timestamps": [
            0.83, 1.67, 2.50, 3.33, 4.17, 5.00, 5.83, 6.67, 7.50, 8.33, 9.17, 10.00, 10.83, 11.67, 12.50, 13.33, 14.17, 15.00, 15.83
        ],
        "distractor_titles": ["Purano Sei Diner Kotha", "Mayabonobiharini Horini", "Ekla Cholo Re"],
        "cultural_notes": "Gentle waltz rhythm with serene poetry, recognized across Bengali communities."
    },
    {
        "id": "song-008",
        "title": "What a Wonderful World",
        "artist": "Louis Armstrong",
        "era": "1960s",
        "region_or_language": "English",
        "audio_url": "/audio/wonderful_world.mp3",
        "bpm": 76,
        "beat_timestamps": [
            0.79, 1.58, 2.37, 3.16, 3.95, 4.74, 5.53, 6.32, 7.11, 7.90, 8.68, 9.47, 10.26, 11.05, 11.84, 12.63, 13.42, 14.21, 15.00
        ],
        "distractor_titles": ["Fly Me to the Moon", "Unforgettable", "Moon River"],
        "cultural_notes": "Slow, comforting orchestral jazz with optimistic lyrics proven to soothe evening agitation."
    },
    {
        "id": "song-009",
        "title": "Fly Me to the Moon",
        "artist": "Frank Sinatra",
        "era": "1950s",
        "region_or_language": "English",
        "audio_url": "/audio/fly_me_to_the_moon.mp3",
        "bpm": 120,
        "beat_timestamps": [
            0.50, 1.00, 1.50, 2.00, 2.50, 3.00, 3.50, 4.00, 4.50, 5.00, 5.50, 6.00, 6.50, 7.00, 7.50, 8.00, 8.50, 9.00, 9.50, 10.00
        ],
        "distractor_titles": ["Come Fly With Me", "The Way You Look Tonight", "I've Got You Under My Skin"],
        "cultural_notes": "Upbeat swing classic with crystal clear 4/4 syncopated rhythm ideal for finger tapping."
    },
    {
        "id": "song-011",
        "title": "Cielito Lindo",
        "artist": "Traditional Mexican Folk",
        "era": "Folk Classic",
        "region_or_language": "Spanish",
        "audio_url": "/audio/cielito_lindo.mp3",
        "bpm": 100,
        "beat_timestamps": [
            0.60, 1.20, 1.80, 2.40, 3.00, 3.60, 4.20, 4.80, 5.40, 6.00, 6.60, 7.20, 7.80, 8.40, 9.00, 9.60, 10.20, 10.80, 11.40, 12.00
        ],
        "distractor_titles": ["La Bamba", "Guantanamera", "Besame Mucho"],
        "cultural_notes": "Celebratory 'Ay, ay, ay, ay' refrain designed for spontaneous hum-along and vocal resonance."
    },
]


def _get_all_songs() -> List[Dict[str, Any]]:
    stored = rhythm_songs_store.read()
    if not stored or len(stored) == 0:
        rhythm_songs_store.write(DEFAULT_SEED_SONGS)
        return DEFAULT_SEED_SONGS
    return stored


# ── GET /songs ────────────────────────────────────────────────────────────────
@router.get("/songs", response_model=List[SongItem])
def get_songs(
    era: Optional[str] = Query(default=None, description="Filter by era, e.g. '1950s', '1960s', 'Folk Classic'"),
    region_or_language: Optional[str] = Query(default=None, description="Filter by language or region"),
    patient_id: Optional[str] = Query(default=None, description="Patient ID for preferences"),
) -> List[SongItem]:
    """Fetch available songs filtered by patient's preferred era and region/language set in caregiver settings."""
    songs = _get_all_songs()

    # Check user/patient caregiver preferences if era / language not explicitly passed
    if patient_id and (not era or not region_or_language):
        users = users_store.read()
        p = users.get(patient_id)
        if p and isinstance(p, dict):
            settings = p.get("caregiver_settings", {})
            if not era and "music_era" in settings:
                era = settings["music_era"]
            if not region_or_language and "music_language" in settings:
                region_or_language = settings["music_language"]

    filtered = songs
    if era and era.strip().lower() != "all":
        e_norm = era.strip().lower()
        filtered = [s for s in filtered if s.get("era", "").lower() == e_norm or e_norm in s.get("era", "").lower()]

    if region_or_language and region_or_language.strip().lower() != "all":
        r_norm = region_or_language.strip().lower()
        filtered = [s for s in filtered if s.get("region_or_language", "").lower() == r_norm or r_norm in s.get("region_or_language", "").lower()]

    # If filter yielded no results, fallback to all songs to avoid empty states
    if not filtered:
        filtered = songs

    return [SongItem(**s) for s in filtered]


# ── POST /submit ──────────────────────────────────────────────────────────────
@router.post("/submit", response_model=RhythmRecallSession)
def submit_rhythm_session(
    payload: RhythmRecallSubmission,
    authorization: Optional[str] = Header(default=None),
) -> RhythmRecallSession:
    """
    Record session telemetry and update the patient's daily engagement log without punitive severity scoring.
    Treats rhythm accuracy as purely an engagement metric, NOT a cognitive decline penalty.
    """
    current_user = _optional_user(authorization)
    patient_id = payload.patient_id or (current_user["id"] if current_user else "guest_user")

    # Deduplication check for retried browser requests
    if payload.client_action_id:
        prior_sessions = rhythm_sessions_store.read()
        prior = next((s for s in prior_sessions if s.get("client_action_id") == payload.client_action_id), None)
        if prior:
            return RhythmRecallSession(**prior)

    # Find song title
    all_songs = _get_all_songs()
    song = next((s for s in all_songs if s["id"] == payload.song_id), None)
    song_title = song["title"] if song else "Melodic Rhythm Track"

    # Non-punitive scoring calculation
    # Pure engagement: Base 85+, boosted slightly by accuracy, never falling below 80 for participation
    accuracy = float(payload.rhythm_accuracy)
    engagement_score = round(max(80.0, min(100.0, 85.0 + (accuracy * 0.15))), 1)

    if engagement_score >= 92.0:
        stars = 3
        stars_label = "3/3 Stars"
        perf_level = "Excellent Sway"
        feedback = "Outstanding rhythm! Music sparks joyful memories and neural connections."
    elif engagement_score >= 82.0:
        stars = 3
        stars_label = "3/3 Stars"
        perf_level = "Lovely Harmony"
        feedback = "Beautiful melody! Engaging with music brings peaceful comfort."
    else:
        stars = 2
        stars_label = "2/3 Stars"
        perf_level = "Gentle Sway"
        feedback = "Wonderful effort! Listening and swaying to familiar music soothes the mind."

    # Mood shift calculation (post - pre: positive means mood improved / agitation decreased)
    mood_shift = None
    if payload.mood_pre_session is not None and payload.mood_post_session is not None:
        mood_shift = int(payload.mood_post_session) - int(payload.mood_pre_session)

    session_id = str(uuid.uuid4())
    completed_at_str = (payload.completed_at or datetime.now(timezone.utc)).isoformat()

    session_data = {
        "session_id": session_id,
        "patient_id": patient_id,
        "game_id": "rhythm_and_recall",
        "mode": payload.mode,
        "song_id": payload.song_id,
        "song_title": song_title,
        "rhythm_accuracy": round(payload.rhythm_accuracy, 1),
        "song_recognition_accuracy": payload.song_recognition_accuracy,
        "sing_along_duration_sec": payload.sing_along_duration_sec,
        "mood_pre_session": payload.mood_pre_session,
        "mood_post_session": payload.mood_post_session,
        "mood_shift": mood_shift,
        "agitation_level_observed": payload.agitation_level_observed,
        "score": engagement_score,
        "stars": stars,
        "stars_label": stars_label,
        "feedback_message": feedback,
        "performance_level": perf_level,
        "completed_at": completed_at_str,
        "client_action_id": payload.client_action_id,
    }

    # 1. Store in dedicated rhythm sessions store
    rhythm_sessions_store.update(lambda sessions: [session_data, *(sessions or [])])

    # 2. Update global game sessions store (so Caregiver Analytics / Game Stats include this)
    global_session = {
        "session_id": session_id,
        "user_id": patient_id,
        "game_id": "rhythm_and_recall",
        "game_title": "Rhythm & Recall",
        "cognitive_domain": "MUSICAL_EMOTIONAL_MEMORY",
        "domain_label": "Procedural & Emotional Musical Memory",
        "difficulty_level": 1,
        "score": engagement_score,
        "stars": stars,
        "stars_label": stars_label,
        "performance_level": perf_level,
        "feedback_message": feedback,
        "duration_seconds": payload.sing_along_duration_sec or 30.0,
        "moves_count": int(accuracy),
        "mistakes_count": 0,  # Zero failure / non-punitive
        "completed": True,
        "language": "en",
        "telemetry": {
            "mode": payload.mode,
            "song_id": payload.song_id,
            "song_title": song_title,
            "rhythm_accuracy": payload.rhythm_accuracy,
            "mood_pre": payload.mood_pre_session,
            "mood_post": payload.mood_post_session,
            "mood_shift": mood_shift,
            "agitation_level": payload.agitation_level_observed,
        },
        "timestamp": completed_at_str,
        "client_action_id": payload.client_action_id,
    }
    game_sessions_store.update(lambda sessions: [global_session, *(sessions or [])])

    return RhythmRecallSession(**session_data)


# ── GET /recommendation ───────────────────────────────────────────────────────
@router.get("/recommendation", response_model=RhythmRecallRecommendationResponse)
def get_recommendation(
    patient_id: Optional[str] = Query(default="guest_user"),
    force_evening: bool = Query(default=False, description="Simulate evening hours for testing / demo"),
) -> RhythmRecallRecommendationResponse:
    """
    Evening schedule trigger if the patient shows high sundowning risk/agitation flags.
    Targeted for 4:00 PM to 7:30 PM (16:00 - 19:30).
    """
    now = datetime.now()
    hour = now.hour
    minute = now.minute

    # Sundowning window: 4:00 PM (16:00) to 7:30 PM (19:30) or simulated
    in_time_window = (16 <= hour < 19) or (hour == 19 and minute <= 30)
    is_sundowning_window = in_time_window or force_evening

    # Check patient recent history for agitation flags
    recent_rhythm = [s for s in rhythm_sessions_store.read() if s.get("patient_id") == patient_id]
    agitation_flag = False
    if recent_rhythm:
        latest = recent_rhythm[0]
        agitation = latest.get("agitation_level_observed") or 0
        pre_mood = latest.get("mood_pre_session") or 3
        if agitation >= 3 or pre_mood <= 2:
            agitation_flag = True

    recommended = is_sundowning_window or agitation_flag

    if agitation_flag:
        reason = "Recent agitation / mood restlessness observed. Familiar melodic engagement recommended to ease tension."
        suggested_mode = "free_sing"
        calming_prompt = "Singing and humming familiar melodies stimulates the vagus nerve and activates emotional memory, gently easing agitation."
    elif is_sundowning_window:
        reason = "Evening sundowning window (4:00 PM - 7:30 PM) active. Rhythm & Recall soothes evening restlessness."
        suggested_mode = "rhythm_tap"
        calming_prompt = "Nostalgic melodies and gentle rhythm tapping stimulate preserved anterior cingulate circuits, helping ground evening calmness."
    else:
        reason = "Available anytime for joyful procedural rhythm training and emotional comfort."
        suggested_mode = "song_recognition"
        calming_prompt = "A quick 5-minute melodic recall session boosts working engagement and sparks nostalgic joy."

    # Top recommended songs
    all_songs = _get_all_songs()
    calming_candidates = [
        s for s in all_songs
        if s.get("bpm", 80) <= 85 or s.get("era") == "Folk Classic"
    ]
    top_songs = calming_candidates[:4] if calming_candidates else all_songs[:4]

    return RhythmRecallRecommendationResponse(
        recommended=recommended,
        is_sundowning_window=is_sundowning_window,
        reason=reason,
        clinical_rationale=(
            "Musical procedural memory is preserved in the caudal anterior cingulate cortex and ventral pre-SMA "
            "even into advanced Alzheimer's disease. Rhythmic auditory stimulation reduces evening cortisol spikes, "
            "offering a scientifically grounded, non-pharmacological intervention for sundowning."
        ),
        suggested_mode=suggested_mode,
        calming_prompt=calming_prompt,
        recommended_songs=[SongItem(**s) for s in top_songs],
    )
