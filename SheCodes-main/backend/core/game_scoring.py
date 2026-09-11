"""
game_scoring.py — Cognitive Game Engine Scoring & Domain Tagging
===============================================================
Module for calculating game scores, star ratings (1-3),
cognitive domain tagging, and dementia-appropriate feedback.
Part of NeuroAid SIH PS 26003.
"""
from __future__ import annotations

import math
from typing import Any, Dict, Tuple

# ── Cognitive Domains ─────────────────────────────────────────────────────────

DOMAINS = {
    "VISUOSPATIAL_MEMORY": {
        "id": "visuospatial_memory",
        "label": "Visuospatial & Memory",
        "description": "Retention of spatial layouts and visual pair matching.",
        "icon": "🃏",
        "color": "#34d399",
    },
    "WORKING_MEMORY": {
        "id": "working_memory",
        "label": "Working Memory & Concentration",
        "description": "Short-term storage and manipulation of ordered sequences.",
        "icon": "🔢",
        "color": "#60a5fa",
    },
    "SEMANTIC_MEMORY": {
        "id": "semantic_memory",
        "label": "Visual & Semantic Recognition",
        "description": "Visual object identification and associative semantic retrieval.",
        "icon": "🔍",
        "color": "#f59e0b",
    },
    "EXECUTIVE_REASONING": {
        "id": "executive_reasoning",
        "label": "Executive Function & Patterns",
        "description": "Inductive logic, pattern discovery, and cognitive flexibility.",
        "icon": "🧩",
        "color": "#a78bfa",
    },
    "PROCEDURAL_ORIENTATION": {
        "id": "procedural_orientation",
        "label": "Daily Routine & Orientation",
        "description": "Chronological sequencing of everyday activities of daily living (ADL).",
        "icon": "🌅",
        "color": "#fb923c",
    },
    "MUSICAL_EMOTIONAL_MEMORY": {
        "id": "musical_emotional_memory",
        "label": "Procedural & Emotional Musical Memory",
        "description": "Procedural rhythm tracking and nostalgic melodic recall spared in Alzheimer's.",
        "icon": "🎵",
        "color": "#ec4899",
    },
}

# ── Game Catalog Metadata ─────────────────────────────────────────────────────

GAMES_CATALOGUE = {
    "memory_match": {
        "id": "memory_match",
        "title": "Memory Match",
        "tagline": "Match pairs of culturally familiar items",
        "description": "Test and train your visual memory by finding matching pairs of everyday and North Eastern cultural items.",
        "cognitive_domain": "VISUOSPATIAL_MEMORY",
        "domain_label": DOMAINS["VISUOSPATIAL_MEMORY"]["label"],
        "icon": "🃏",
        "accent_color": "#34d399",
        "levels": [1, 2, 3],
        "instructions": {
            "en": "Tap on a card to flip it over, then tap another card to find its match. Remember where each item was!",
            "as": "এখন কাৰ্ড লুটিয়াই আন এখন কাৰ্ডৰ লগত মেলাওক। ক'ত কি বস্তু আছিল মনত ৰাখক!",
        },
    },
    "sequence_recall": {
        "id": "sequence_recall",
        "title": "Sequence Recall",
        "tagline": "Remember and repeat the sequence in order",
        "description": "Strengthen attention and working memory by watching items illuminate and repeating the exact sequence.",
        "cognitive_domain": "WORKING_MEMORY",
        "domain_label": DOMAINS["WORKING_MEMORY"]["label"],
        "icon": "🔢",
        "accent_color": "#60a5fa",
        "levels": [1, 2, 3],
        "instructions": {
            "en": "Watch the items light up one after another, then tap them in the exact same order.",
            "as": "বস্তুবোৰ এটা এটাকৈ জ্বলা দেখা পাব, তাৰ পিছত সেই একে ক্ৰমতেই স্পৰ্শ কৰক।",
        },
    },
    "object_recognition": {
        "id": "object_recognition",
        "title": "Object Recognition",
        "tagline": "Identify everyday and cultural items from visual cues",
        "description": "Stimulate semantic memory by recognizing everyday household objects and traditional North Eastern symbols.",
        "cognitive_domain": "SEMANTIC_MEMORY",
        "domain_label": DOMAINS["SEMANTIC_MEMORY"]["label"],
        "icon": "🔍",
        "accent_color": "#f59e0b",
        "levels": [1, 2, 3],
        "instructions": {
            "en": "Look carefully at the picture and choose the correct name from the options below.",
            "as": "ছবিখন ভালদৰে চাওক আৰু তলত দিয়া বিকল্পসমূহৰ পৰা সঠিক নামটো বাছক।",
        },
    },
    "pattern_completion": {
        "id": "pattern_completion",
        "title": "Pattern Completion",
        "tagline": "Find the missing piece that completes the pattern",
        "description": "Engage fluid reasoning and pattern analysis to deduce which item completes the sequence.",
        "cognitive_domain": "EXECUTIVE_REASONING",
        "domain_label": DOMAINS["EXECUTIVE_REASONING"]["label"],
        "icon": "🧩",
        "accent_color": "#a78bfa",
        "levels": [1, 2, 3],
        "instructions": {
            "en": "Observe the sequence pattern and pick the piece that belongs in the question mark spot.",
            "as": "ধাৰাবাহিক ক্ৰমটো লক্ষ্য কৰক আৰু প্ৰশ্নবোধক চিনৰ ঠাইত কি বহিব বাছক।",
        },
    },
    "daily_routine": {
        "id": "daily_routine",
        "title": "Daily Routine Recall",
        "tagline": "Order daily activities from morning to night",
        "description": "Practice procedural sequencing and time orientation by arranging daily living activities in chronological order.",
        "cognitive_domain": "PROCEDURAL_ORIENTATION",
        "domain_label": DOMAINS["PROCEDURAL_ORIENTATION"]["label"],
        "icon": "🌅",
        "accent_color": "#fb923c",
        "levels": [1, 2, 3],
        "instructions": {
            "en": "Put the activities in the order you do them throughout the day, starting from what comes first in the morning.",
            "as": "পুৱাৰ পৰা ৰাতিলৈকে আপুনি কৰা কামবোৰ সঠিক ক্ৰমত সজাওক।",
        },
    },
    "rhythm_and_recall": {
        "id": "rhythm_and_recall",
        "title": "Rhythm & Recall",
        "tagline": "Procedural musical rhythm & nostalgic melody recall",
        "description": "Calming, low-frustration music session designed for procedural rhythm engagement, emotional comfort, and evening agitation reduction.",
        "cognitive_domain": "MUSICAL_EMOTIONAL_MEMORY",
        "domain_label": DOMAINS["MUSICAL_EMOTIONAL_MEMORY"]["label"],
        "icon": "🎵",
        "accent_color": "#ec4899",
        "levels": [1, 2, 3],
        "instructions": {
            "en": "Listen to familiar comforting tunes, tap along with the heartbeat of the music, or sing along to soothe the evening.",
            "as": "পৰিচিত সুৰ শুনক, সংগীতৰ তালে তালে হাত চাপৰি বজাওক বা গান গাই মন শান্ত কৰক।",
        },
    },
}


# ── Scoring Engine ────────────────────────────────────────────────────────────

def calculate_game_score(
    game_id: str,
    difficulty_level: int,
    duration_seconds: float,
    moves_count: int,
    mistakes_count: int,
    client_score: float | None = None,
    completed: bool = True,
) -> Tuple[float, int, str, str]:
    """
    Computes a balanced, dementia-appropriate score (0-100),
    star rating (1 to 3 stars), performance level, and encouraging feedback message.

    Returns:
        (score, stars, performance_level, feedback_message)
    """
    if not completed:
        return 40.0, 1, "Practice", "Good effort! Taking time to engage your mind is what matters most."

    # Baseline calculation based on mistakes and efficiency
    # Level difficulty multiplier: level 1 = 1.0, level 2 = 1.1, level 3 = 1.2
    level_multiplier = 1.0 + (difficulty_level - 1) * 0.1

    if client_score is not None and 0 <= client_score <= 100:
        raw_score = client_score
    else:
        # Heuristic scoring based on game specifics
        if game_id == "memory_match":
            # Pairs: level 1 = 3 pairs (min 6 moves), level 2 = 4 pairs (min 8 moves), level 3 = 6 pairs (min 12 moves)
            target_moves = {1: 6, 2: 8, 3: 12}.get(difficulty_level, 8)
            excess_moves = max(0, moves_count - target_moves)
            efficiency = max(0.4, 1.0 - (excess_moves * 0.05))
            mistake_penalty = min(30.0, mistakes_count * 5.0)
            raw_score = (efficiency * 100.0) - mistake_penalty
        elif game_id in {"sequence_recall", "pattern_completion", "daily_routine", "object_recognition"}:
            base = 100.0
            mistake_penalty = mistakes_count * 12.0
            # Mild time penalty if hesitation > 60s
            time_penalty = max(0.0, (duration_seconds - 45.0) * 0.25)
            raw_score = base - mistake_penalty - time_penalty
        elif game_id == "rhythm_and_recall":
            # Pure engagement metric: never penalize. Base 85+, enhanced by accuracy
            engagement_boost = (moves_count > 0 or mistakes_count == 0)
            raw_score = 88.0 + (10.0 if engagement_boost else 0.0)
        else:
            raw_score = 80.0

    # Ensure score stays in [40, 100] for completed sessions (encouraging baseline for elderly)
    score = round(max(40.0, min(100.0, raw_score)), 1)

    # Calculate Stars
    if score >= 82.0:
        stars = 3
        perf_level = "Excellent"
        feedback = "Outstanding! Your cognitive focus and memory were sharp today!"
    elif score >= 62.0:
        stars = 2
        perf_level = "Great Effort"
        feedback = "Very well done! Consistent practice keeps neural pathways active."
    else:
        stars = 1
        perf_level = "Good Practice"
        feedback = "Nice effort! Brain stimulation exercises get easier with regular play."

    return score, stars, perf_level, feedback


def get_game_domain(game_id: str) -> Dict[str, Any]:
    """Returns cognitive domain info for a given game ID."""
    meta = GAMES_CATALOGUE.get(game_id, {})
    domain_key = meta.get("cognitive_domain", "VISUOSPATIAL_MEMORY")
    return DOMAINS.get(domain_key, DOMAINS["VISUOSPATIAL_MEMORY"])
