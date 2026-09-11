"""
test_adaptive_difficulty.py — Unit and Integration Tests for AdaptiveDifficultyEngine
======================================================================================
Tests deterministic difficulty adjustments, bounds, fatigue mitigation,
explainability schema compliance, and API integration.
"""
import os
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi.testclient import TestClient
from core.adaptive_difficulty import AdaptiveDifficultyEngine
from core.storage import game_sessions_store
from main import app


class TestAdaptiveDifficultyEngine(unittest.TestCase):

    def setUp(self):
        self.client = TestClient(app)
        self._temp_dir = tempfile.TemporaryDirectory()
        self._orig_game_sessions_path = game_sessions_store.path
        temp_file = Path(self._temp_dir.name) / "test_game_sessions.json"
        temp_file.write_text("[]", encoding="utf-8")
        game_sessions_store.path = temp_file

    def tearDown(self):
        if hasattr(self, "_orig_game_sessions_path"):
            game_sessions_store.path = self._orig_game_sessions_path
        if hasattr(self, "_temp_dir"):
            self._temp_dir.cleanup()

    def test_promotion_level_1_to_2(self):
        result = AdaptiveDifficultyEngine.evaluate_adjustment(
            game_id="memory_match",
            previous_level=1,
            accuracy=0.92,
            response_time=1.8,
            error_rate=0.08,
            completion_rate=1.0,
            duration_seconds=24.0,
            moves_count=12,
            mistakes_count=1,
        )
        self.assertEqual(result["previous_level"], 1)
        self.assertEqual(result["new_level"], 2)
        self.assertEqual(result["adjustment"], "increase")
        self.assertIn("accuracy above target", result["reason"])
        self.assertIn("stable response time", result["reason"])

    def test_promotion_level_2_to_3(self):
        result = AdaptiveDifficultyEngine.evaluate_adjustment(
            game_id="sequence_recall",
            previous_level=2,
            accuracy=0.95,
            response_time=1.5,
            error_rate=0.05,
            completion_rate=1.0,
            duration_seconds=30.0,
            moves_count=15,
            mistakes_count=0,
        )
        self.assertEqual(result["previous_level"], 2)
        self.assertEqual(result["new_level"], 3)
        self.assertEqual(result["adjustment"], "increase")
        self.assertIn("accuracy above target", result["reason"])

    def test_promotion_level_3_to_4(self):
        result = AdaptiveDifficultyEngine.evaluate_adjustment(
            game_id="object_recognition",
            previous_level=3,
            accuracy=0.96,
            response_time=1.2,
            error_rate=0.04,
            completion_rate=1.0,
        )
        self.assertEqual(result["previous_level"], 3)
        self.assertEqual(result["new_level"], 4)
        self.assertEqual(result["adjustment"], "increase")
        self.assertIn("accuracy above target", result["reason"])

    def test_promotion_level_5_clamped(self):
        # Level 5 cannot promote past 5
        result = AdaptiveDifficultyEngine.evaluate_adjustment(
            game_id="object_recognition",
            previous_level=5,
            accuracy=0.96,
            response_time=1.0,
            error_rate=0.04,
            completion_rate=1.0,
        )
        self.assertEqual(result["previous_level"], 5)
        self.assertEqual(result["new_level"], 5)
        self.assertEqual(result["adjustment"], "maintain")
        self.assertIn("mastery maintained at highest level", result["reason"])

    def test_demotion_level_3_to_2(self):
        result = AdaptiveDifficultyEngine.evaluate_adjustment(
            game_id="pattern_completion",
            previous_level=3,
            accuracy=0.45,
            response_time=4.5,
            error_rate=0.55,
            completion_rate=0.6,
        )
        self.assertEqual(result["previous_level"], 3)
        self.assertEqual(result["new_level"], 2)
        self.assertEqual(result["adjustment"], "decrease")
        self.assertIn("accuracy below comfort threshold", result["reason"])

    def test_demotion_level_2_to_1(self):
        result = AdaptiveDifficultyEngine.evaluate_adjustment(
            game_id="daily_routine",
            previous_level=2,
            accuracy=0.50,
            response_time=3.8,
            error_rate=0.50,
            completion_rate=0.8,
        )
        self.assertEqual(result["previous_level"], 2)
        self.assertEqual(result["new_level"], 1)
        self.assertEqual(result["adjustment"], "decrease")

    def test_demotion_level_1_clamped(self):
        # Level 1 cannot drop below 1
        result = AdaptiveDifficultyEngine.evaluate_adjustment(
            game_id="memory_match",
            previous_level=1,
            accuracy=0.40,
            response_time=4.8,
            error_rate=0.60,
            completion_rate=0.5,
        )
        self.assertEqual(result["previous_level"], 1)
        self.assertEqual(result["new_level"], 1)
        self.assertEqual(result["adjustment"], "maintain")
        self.assertIn("reinforcing foundational level", result["reason"])

    def test_fatigue_prevents_promotion(self):
        # High accuracy, but telemetry demonstrates high latency drift (fatigue)
        result = AdaptiveDifficultyEngine.evaluate_adjustment(
            game_id="memory_match",
            previous_level=2,
            accuracy=0.88,
            response_time=2.2,
            error_rate=0.12,
            completion_rate=1.0,
            telemetry={"latency_drift": 0.45, "action_latencies": [1.0, 1.2, 2.5, 2.8]},
        )
        self.assertEqual(result["previous_level"], 2)
        self.assertEqual(result["new_level"], 2)
        self.assertEqual(result["adjustment"], "maintain")
        self.assertIn("accuracy strong but fatigue detected", result["reason"])

    def test_explainability_structure(self):
        result = AdaptiveDifficultyEngine.evaluate_adjustment(
            game_id="sequence_recall",
            previous_level=2,
            accuracy=0.90,
            response_time=1.6,
            error_rate=0.10,
            completion_rate=1.0,
        )
        self.assertIn("previous_level", result)
        self.assertIn("new_level", result)
        self.assertIn("reason", result)
        self.assertIsInstance(result["reason"], list)
        self.assertIn("metrics_summary", result)
        self.assertIn("clinical_rationale", result)

    def test_api_submit_session_with_adaptive_difficulty(self):
        payload = {
            "game_id": "memory_match",
            "difficulty_level": 2,
            "duration_seconds": 22.5,
            "moves_count": 8,
            "mistakes_count": 0,
            "completed": True,
            "accuracy": 0.95,
            "response_time": 1.4,
            "error_rate": 0.05,
            "completion_rate": 1.0,
        }
        res = self.client.post("/api/games/session", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("adaptive_difficulty", data)
        adaptive = data["adaptive_difficulty"]
        self.assertEqual(adaptive["previous_level"], 2)
        self.assertEqual(adaptive["new_level"], 3)
        self.assertEqual(adaptive["adjustment"], "increase")
        self.assertIn("accuracy above target", adaptive["reason"])
        self.assertIn("stable response time", adaptive["reason"])

    def test_api_recommended_level_endpoint(self):
        res = self.client.get("/api/games/memory_match/recommended-level")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("recommended_level", data)
        self.assertIn("previous_level", data)
        self.assertIn("reason", data)
        self.assertIsInstance(data["reason"], list)


if __name__ == "__main__":
    unittest.main()
