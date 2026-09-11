"""
adaptive_difficulty.py — Adaptive Difficulty Engine for Cognitive Games
========================================================================
Implements deterministic, explainable, and elderly-friendly difficulty
adjustment based on multi-dimensional session telemetry:
- Accuracy
- Response Time (decision latency)
- Error Rate
- Completion Rate
- Recent History (trend and moving averages)
- Fatigue / Session Quality (latency drift and late error clustering)
- Previous Difficulty Level (1 to 3 bounds)

Part of NeuroAid SIH PS 26003.
"""
from __future__ import annotations

import math
import statistics
from typing import Any, Dict, List, Optional, Tuple

from core.progress_tracker import compute_trend


# ── Level Benchmarks & Therapeutic Target Parameters ──────────────────────────

BENCHMARKS = {
    # Configured benchmark response times per level (in seconds)
    "response_time_benchmarks": {
        1: 3.5,  # Level 1: Gentle pacing (Easy)
        2: 2.8,  # Level 2: Standard pacing (Medium)
        3: 2.2,  # Level 3: Hard pacing
        4: 1.8,  # Level 4: Pro pacing
        5: 1.4,  # Level 5: Advance pacing
    },
    # Accuracy thresholds
    "accuracy_promotion_threshold": 0.85,
    "accuracy_demotion_threshold": 0.60,
    # Error rate thresholds
    "error_rate_promotion_threshold": 0.15,
    "error_rate_demotion_threshold": 0.35,
    # Completion rate threshold
    "completion_promotion_threshold": 0.90,
    "completion_demotion_threshold": 0.70,
    # Fatigue drift threshold: second-half latency > 30% slower than first-half
    "latency_drift_fatigue_threshold": 0.30,
}


class AdaptiveDifficultyEngine:
    """
    Deterministic adaptive difficulty engine with clinical explainability.
    Preserves patient dignity and emotional well-being by avoiding abrupt
    difficulty spikes or demoralizing drops.
    """

    @classmethod
    def compute_fatigue_and_quality(
        cls,
        response_time: float,
        duration_seconds: float,
        moves_count: int,
        mistakes_count: int,
        telemetry: Optional[Dict[str, Any]] = None,
        previous_level: int = 1,
    ) -> Tuple[bool, float, Dict[str, Any]]:
        """
        Detect cognitive fatigue and assess overall session quality.

        Returns:
            (fatigue_detected: bool, session_quality: float, fatigue_details: dict)
        """
        telemetry = telemetry or {}
        action_latencies: List[float] = telemetry.get("action_latencies") or []
        latency_drift: float = float(telemetry.get("latency_drift", 0.0))
        late_errors_ratio: float = float(telemetry.get("late_errors_ratio", 0.0))

        # If action latencies are provided, calculate exact latency drift
        if action_latencies and len(action_latencies) >= 4:
            mid = len(action_latencies) // 2
            first_half = action_latencies[:mid]
            second_half = action_latencies[mid:]
            mean_first = statistics.mean(first_half) if first_half else 1.0
            mean_second = statistics.mean(second_half) if second_half else 1.0
            if mean_first > 0:
                latency_drift = (mean_second - mean_first) / mean_first

        # Detect fatigue based on drift, duration, and error clustering
        benchmark_rt = BENCHMARKS["response_time_benchmarks"].get(previous_level, 3.0)
        is_slow = response_time > (benchmark_rt * 1.6)
        high_drift = latency_drift > BENCHMARKS["latency_drift_fatigue_threshold"]
        late_struggle = late_errors_ratio > 0.60 and mistakes_count >= 3

        fatigue_detected = high_drift or (is_slow and mistakes_count > 2) or late_struggle

        # Session quality index (0.0 to 1.0)
        error_penalty = min(0.4, (mistakes_count / max(1, moves_count)) * 0.8)
        drift_penalty = min(0.3, max(0.0, latency_drift) * 0.5)
        slowness_penalty = min(0.3, max(0.0, (response_time - benchmark_rt) / benchmark_rt) * 0.2)

        session_quality = round(max(0.2, min(1.0, 1.0 - error_penalty - drift_penalty - slowness_penalty)), 3)

        fatigue_details = {
            "fatigue_detected": fatigue_detected,
            "latency_drift": round(latency_drift, 3),
            "session_quality": session_quality,
            "late_struggle": late_struggle,
        }

        return fatigue_detected, session_quality, fatigue_details

    @classmethod
    def evaluate_adjustment(
        cls,
        game_id: str,
        previous_level: int,
        accuracy: float,
        response_time: float,
        error_rate: float,
        completion_rate: float = 1.0,
        recent_history: Optional[List[Dict[str, Any]]] = None,
        duration_seconds: float = 0.0,
        moves_count: int = 0,
        mistakes_count: int = 0,
        telemetry: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Deterministically evaluates difficulty adjustment with rich explainability.

        Rules:
        - Strict bounds: Level must remain in [1, 3]
        - Max step size: ±1 level per evaluation to avoid disorientation
        - Promotion: High accuracy, low errors, prompt response time, good session quality
        - Demotion: Low accuracy, excessive errors, poor completion, or fatigue + struggle
        - Maintenance: Therapeutic comfort zone (60-84%), conflicting signals, or bounds

        Returns structured dict matching user specification:
        {
            "previous_level": 2,
            "new_level": 3,
            "reason": ["accuracy above target", "stable response time"],
            "adjustment": "increase" | "decrease" | "maintain",
            "metrics_summary": {...},
            "clinical_rationale": "..."
        }
        """
        # Clamp previous level to [1, 5]
        prev_level = max(1, min(5, int(previous_level)))

        # Normalize metrics to valid numeric bounds
        acc = max(0.0, min(1.0, float(accuracy)))
        err = max(0.0, min(1.0, float(error_rate)))
        comp = max(0.0, min(1.0, float(completion_rate)))
        rt = max(0.1, float(response_time))

        # Evaluate fatigue and session quality
        fatigue_detected, session_quality, fatigue_details = cls.compute_fatigue_and_quality(
            response_time=rt,
            duration_seconds=duration_seconds,
            moves_count=moves_count,
            mistakes_count=mistakes_count,
            telemetry=telemetry,
            previous_level=prev_level,
        )

        # Longitudinal trend from recent history
        past_scores: List[float] = []
        if recent_history:
            for s in recent_history[-5:]:
                sc = s.get("score")
                if sc is not None:
                    past_scores.append(float(sc))

        trend = compute_trend(past_scores) if len(past_scores) >= 2 else "insufficient_data"
        benchmark_rt = BENCHMARKS["response_time_benchmarks"].get(prev_level, 3.0)

        # ── Decision Tree ─────────────────────────────────────────────────────
        reasons: List[str] = []
        adjustment: str = "maintain"
        new_level = prev_level

        # 1. Check for Promotion
        can_promote = (
            prev_level < 5
            and comp >= BENCHMARKS["completion_promotion_threshold"]
            and acc >= BENCHMARKS["accuracy_promotion_threshold"]
            and err <= BENCHMARKS["error_rate_promotion_threshold"]
            and rt <= (benchmark_rt * 1.25)
            and not fatigue_detected
            and trend != "declining"
        )

        # 2. Check for Demotion
        can_demote = (
            prev_level > 1
            and (
                comp < BENCHMARKS["completion_demotion_threshold"]
                or acc < BENCHMARKS["accuracy_demotion_threshold"]
                or err >= BENCHMARKS["error_rate_demotion_threshold"]
                or (fatigue_detected and acc < 0.70)
                or (trend == "declining" and acc < 0.65)
            )
        )

        if can_promote:
            new_level = prev_level + 1
            adjustment = "increase"
            reasons.append("accuracy above target")
            if rt <= benchmark_rt:
                reasons.append("stable response time")
            else:
                reasons.append("acceptable decision latency")
            if comp >= 0.98:
                reasons.append("high completion consistency")
            if trend == "improving":
                reasons.append("improving longitudinal performance")

            rationale = (
                f"Demonstrated strong mastery with {round(acc * 100)}% accuracy and "
                f"low error rate ({round(err * 100)}%). Ready for level {new_level} stimulation."
            )

        elif can_demote:
            new_level = prev_level - 1
            adjustment = "decrease"
            if acc < BENCHMARKS["accuracy_demotion_threshold"]:
                reasons.append("accuracy below comfort threshold")
            if err >= BENCHMARKS["error_rate_demotion_threshold"]:
                reasons.append("elevated error rate")
            if rt > benchmark_rt * 1.3:
                reasons.append("prolonged response latency")
            if comp < BENCHMARKS["completion_demotion_threshold"]:
                reasons.append("incomplete session")
            if fatigue_detected:
                reasons.append("cognitive fatigue detected")
            if trend == "declining":
                reasons.append("declining recent trend")

            rationale = (
                f"Reduced difficulty to Level {new_level} to avoid frustration, reinforce "
                f"confidence, and promote neuroplastic reinforcement at a comfortable pace."
            )

        else:
            # Maintain current level
            new_level = prev_level
            adjustment = "maintain"

            if prev_level == 5 and acc >= BENCHMARKS["accuracy_promotion_threshold"]:
                reasons.append("mastery maintained at highest level")
                reasons.append("stable response time")
                rationale = "Outstanding performance sustained at highest challenge level."
            elif prev_level == 1 and acc < BENCHMARKS["accuracy_demotion_threshold"]:
                reasons.append("reinforcing foundational level")
                reasons.append("supportive practice pacing")
                rationale = "Retaining Level 1 to provide supportive and accessible practice."
            elif fatigue_detected and acc >= 0.75:
                reasons.append("accuracy strong but fatigue detected")
                reasons.append("maintaining level to avoid cognitive strain")
                rationale = "Good accuracy noted, but pacing slowed towards the end. Retaining current level to avoid strain."
            else:
                reasons.append("performance in optimal therapeutic zone")
                reasons.append("stable response time")
                rationale = f"Steady progress at Level {prev_level}. Continuing consolidation of skills."

        metrics_summary = {
            "accuracy": round(acc, 3),
            "response_time": round(rt, 2),
            "benchmark_response_time": benchmark_rt,
            "error_rate": round(err, 3),
            "completion_rate": round(comp, 2),
            "fatigue_detected": fatigue_detected,
            "session_quality": session_quality,
            "latency_drift": fatigue_details["latency_drift"],
            "recent_trend": trend,
            "past_sessions_count": len(past_scores),
        }

        return {
            "previous_level": prev_level,
            "new_level": new_level,
            "reason": reasons,
            "adjustment": adjustment,
            "metrics_summary": metrics_summary,
            "clinical_rationale": rationale,
        }
