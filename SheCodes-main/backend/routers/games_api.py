"""
games_api.py — Cognitive Games REST API
=======================================
API endpoints for listing cognitive games, level configurations,
game session submission, scoring, and longitudinal stats.
SIH PS 26003.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Header, HTTPException

from core.adaptive_difficulty import AdaptiveDifficultyEngine
from core.game_scoring import (
    DOMAINS,
    GAMES_CATALOGUE,
    calculate_game_score,
    get_game_domain,
)
from core.storage import game_sessions_store
from models.schemas import (
    AdaptiveAdjustment,
    GameCatalogueItem,
    GameRecommendationResponse,
    GameSessionResponse,
    GameSessionSubmit,
    GameStatsSummary,
)
from services import auth_service

router = APIRouter(prefix="/games", tags=["games"])


def _optional_user(authorization: Optional[str]) -> Optional[Dict[str, Any]]:
    if not authorization:
        return None
    token = auth_service.extract_bearer_token(authorization)
    return auth_service.get_user_from_token(token)


@router.get("", response_model=List[GameCatalogueItem])
def list_games() -> List[GameCatalogueItem]:
    """Retrieve catalogue of available cognitive training games."""
    return [GameCatalogueItem(**game) for game in GAMES_CATALOGUE.values()]


@router.get("/{game_id}/config")
def get_game_config(game_id: str) -> Dict[str, Any]:
    """Retrieve level configuration and domain metadata for a game."""
    if game_id not in GAMES_CATALOGUE:
        raise HTTPException(status_code=404, detail=f"Game '{game_id}' not found.")

    game_info = GAMES_CATALOGUE[game_id]
    domain_info = get_game_domain(game_id)

    # Standard level presets
    level_presets = {
        "memory_match": {
            1: {"pairs": 3, "grid_cols": 3, "name": "Easy (3 pairs)"},
            2: {"pairs": 4, "grid_cols": 4, "name": "Medium (4 pairs)"},
            3: {"pairs": 6, "grid_cols": 4, "name": "Challenging (6 pairs)"},
        },
        "sequence_recall": {
            1: {"length": 3, "display_ms": 1100, "name": "Gentle (3 items)"},
            2: {"length": 4, "display_ms": 900, "name": "Medium (4 items)"},
            3: {"length": 5, "display_ms": 800, "name": "Advanced (5 items)"},
        },
        "object_recognition": {
            1: {"options_count": 2, "rounds": 3, "name": "Easy (2 choices)"},
            2: {"options_count": 3, "rounds": 4, "name": "Medium (3 choices)"},
            3: {"options_count": 4, "rounds": 5, "name": "Advanced (4 choices)"},
        },
        "pattern_completion": {
            1: {"options_count": 2, "rounds": 3, "name": "Simple Pattern"},
            2: {"options_count": 3, "rounds": 4, "name": "Medium Pattern"},
            3: {"options_count": 4, "rounds": 5, "name": "Complex Pattern"},
        },
        "daily_routine": {
            1: {"card_count": 3, "name": "Morning Routine (3 steps)"},
            2: {"card_count": 4, "name": "Daily Flow (4 steps)"},
            3: {"card_count": 5, "name": "Full Day (5 steps)"},
        },
    }

    return {
        "game": game_info,
        "cognitive_domain": domain_info,
        "level_presets": level_presets.get(game_id, {}),
    }


@router.post("/session", response_model=GameSessionResponse)
def submit_game_session(
    payload: GameSessionSubmit,
    authorization: Optional[str] = Header(default=None),
) -> GameSessionResponse:
    """Submit a completed game session telemetry record and calculate score with adaptive adjustment."""
    if payload.game_id not in GAMES_CATALOGUE:
        raise HTTPException(status_code=404, detail=f"Game '{payload.game_id}' not found.")

    game_meta = GAMES_CATALOGUE[payload.game_id]
    current_user = _optional_user(authorization)
    user_id = current_user["id"] if current_user else "guest_user"

    # A retried browser request must never create a second game session.
    if payload.client_action_id:
        sessions = game_sessions_store.read()
        prior = next((s for s in sessions if s.get("user_id") == user_id and s.get("client_action_id") == payload.client_action_id), None)
        if prior:
            return GameSessionResponse(
                session_id=prior["session_id"], game_id=prior["game_id"], game_title=prior["game_title"],
                cognitive_domain=prior["domain_label"], difficulty_level=prior["difficulty_level"], score=prior["score"],
                stars=prior["stars"], stars_label=prior["stars_label"], feedback_message=prior["feedback_message"],
                performance_level=prior["performance_level"], duration_seconds=prior["duration_seconds"],
                moves_count=prior["moves_count"], mistakes_count=prior["mistakes_count"], timestamp=prior["timestamp"],
                adaptive_difficulty=AdaptiveAdjustment(**prior["adaptive_difficulty"]),
            )

    score, stars, perf_level, feedback = calculate_game_score(
        game_id=payload.game_id,
        difficulty_level=payload.difficulty_level,
        duration_seconds=payload.duration_seconds,
        moves_count=payload.moves_count,
        mistakes_count=payload.mistakes_count,
        client_score=payload.score,
        completed=payload.completed,
    )

    # Read user's past sessions for this game for longitudinal context
    sessions = game_sessions_store.read()
    if not isinstance(sessions, list):
        sessions = []
    user_sessions = [s for s in sessions if s.get("user_id") == user_id and s.get("game_id") == payload.game_id]

    # Compute or extract adaptive telemetry metrics
    telemetry = payload.telemetry or {}
    total_actions = max(1, payload.moves_count)

    accuracy = payload.accuracy
    if accuracy is None:
        correct_actions = max(0, total_actions - payload.mistakes_count)
        accuracy = min(1.0, max(0.0, correct_actions / total_actions))

    error_rate = payload.error_rate
    if error_rate is None:
        error_rate = min(1.0, max(0.0, payload.mistakes_count / total_actions))

    response_time = payload.response_time
    if response_time is None or response_time <= 0:
        response_time = max(0.5, payload.duration_seconds / total_actions)

    completion_rate = payload.completion_rate
    if completion_rate is None:
        completion_rate = 1.0 if payload.completed else 0.5

    # Run deterministic AdaptiveDifficultyEngine
    adaptive_result = AdaptiveDifficultyEngine.evaluate_adjustment(
        game_id=payload.game_id,
        previous_level=payload.difficulty_level,
        accuracy=accuracy,
        response_time=response_time,
        error_rate=error_rate,
        completion_rate=completion_rate,
        recent_history=user_sessions,
        duration_seconds=payload.duration_seconds,
        moves_count=payload.moves_count,
        mistakes_count=payload.mistakes_count,
        telemetry=telemetry,
    )

    session_id = str(uuid.uuid4())
    timestamp = auth_service.utcnow_iso()

    record = {
        "session_id": session_id,
        "client_action_id": payload.client_action_id,
        "user_id": user_id,
        "game_id": payload.game_id,
        "game_title": game_meta["title"],
        "cognitive_domain": game_meta["cognitive_domain"],
        "domain_label": game_meta["domain_label"],
        "difficulty_level": payload.difficulty_level,
        "score": score,
        "stars": stars,
        "stars_label": f"{stars}/3 Stars",
        "performance_level": perf_level,
        "feedback_message": feedback,
        "duration_seconds": payload.duration_seconds,
        "moves_count": payload.moves_count,
        "mistakes_count": payload.mistakes_count,
        "completed": payload.completed,
        "language": payload.language,
        "telemetry": telemetry,
        "adaptive_difficulty": adaptive_result,
        "timestamp": timestamp,
    }

    # Atomically write to persistence store
    sessions.append(record)
    # Keep last 500 game sessions system-wide
    game_sessions_store.write(sessions[-500:])

    return GameSessionResponse(
        session_id=session_id,
        game_id=payload.game_id,
        game_title=game_meta["title"],
        cognitive_domain=game_meta["domain_label"],
        difficulty_level=payload.difficulty_level,
        score=score,
        stars=stars,
        stars_label=f"{stars}/3 Stars",
        feedback_message=feedback,
        performance_level=perf_level,
        duration_seconds=payload.duration_seconds,
        moves_count=payload.moves_count,
        mistakes_count=payload.mistakes_count,
        timestamp=timestamp,
        adaptive_difficulty=AdaptiveAdjustment(**adaptive_result),
    )


@router.get("/{game_id}/recommended-level", response_model=GameRecommendationResponse)
def get_recommended_level(
    game_id: str,
    authorization: Optional[str] = Header(default=None),
) -> GameRecommendationResponse:
    """Retrieve recommended difficulty level and explainability rationale for a game."""
    if game_id not in GAMES_CATALOGUE:
        raise HTTPException(status_code=404, detail=f"Game '{game_id}' not found.")

    current_user = _optional_user(authorization)
    user_id = current_user["id"] if current_user else "guest_user"

    sessions = game_sessions_store.read()
    if not isinstance(sessions, list):
        sessions = []

    user_sessions = [s for s in sessions if s.get("user_id") == user_id and s.get("game_id") == game_id]

    if not user_sessions:
        return GameRecommendationResponse(
            game_id=game_id,
            recommended_level=1,
            previous_level=1,
            reason=["initial baseline level", "gentle introduction"],
            clinical_rationale="Starting with Level 1 to establish baseline cognitive pacing.",
        )

    # Use the most recent session's adaptive adjustment
    last_session = user_sessions[-1]
    last_adaptive = last_session.get("adaptive_difficulty")
    if last_adaptive and isinstance(last_adaptive, dict):
        rec_level = last_adaptive.get("new_level", 1)
        prev_level = last_adaptive.get("previous_level", 1)
        reason = last_adaptive.get("reason", ["stable performance"])
        rationale = last_adaptive.get("clinical_rationale")
        return GameRecommendationResponse(
            game_id=game_id,
            recommended_level=rec_level,
            previous_level=prev_level,
            reason=reason,
            clinical_rationale=rationale,
        )

    # Fallback to level of last session
    prev_level = last_session.get("difficulty_level", 1)
    return GameRecommendationResponse(
        game_id=game_id,
        recommended_level=prev_level,
        previous_level=prev_level,
        reason=["consistent baseline level"],
        clinical_rationale="Maintaining previous session level.",
    )


@router.get("/history")
def get_game_history(
    authorization: Optional[str] = Header(default=None),
) -> Dict[str, Any]:
    """Retrieve history of played games for current user."""
    current_user = _optional_user(authorization)
    user_id = current_user["id"] if current_user else "guest_user"

    sessions = game_sessions_store.read()
    if not isinstance(sessions, list):
        sessions = []

    user_sessions = [s for s in sessions if s.get("user_id") == user_id]
    user_sessions.reverse()  # Newest first

    return {"sessions": user_sessions}


@router.get("/stats", response_model=GameStatsSummary)
def get_game_stats(
    authorization: Optional[str] = Header(default=None),
) -> GameStatsSummary:
    """Retrieve aggregated stats, total stars, streaks, and per-domain score averages."""
    current_user = _optional_user(authorization)
    user_id = current_user["id"] if current_user else "guest_user"

    sessions = game_sessions_store.read()
    if not isinstance(sessions, list):
        sessions = []

    user_sessions = [s for s in sessions if s.get("user_id") == user_id]

    total_games = len(user_sessions)
    total_stars = sum(s.get("stars", 0) for s in user_sessions)

    # Domain score averages
    domain_scores_map: Dict[str, List[float]] = {}
    for d_key, d_val in DOMAINS.items():
        domain_scores_map[d_val["label"]] = []

    distinct_dates = set()
    for s in user_sessions:
        ts = s.get("timestamp", "")
        if ts:
            distinct_dates.add(ts[:10])
        dom = s.get("domain_label")
        if dom and dom in domain_scores_map:
            domain_scores_map[dom].append(s.get("score", 70.0))

    avg_domain_scores = {
        dom: round(sum(scores) / len(scores), 1) if scores else 75.0
        for dom, scores in domain_scores_map.items()
    }

    # Streak calculation
    streak_days = len(distinct_dates)

    recent = user_sessions[-5:]
    recent.reverse()

    return GameStatsSummary(
        total_games_played=total_games,
        total_stars_earned=total_stars,
        current_streak_days=streak_days,
        domain_scores=avg_domain_scores,
        recent_sessions=recent,
    )
