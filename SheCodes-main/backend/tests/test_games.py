"""
test_games.py — Automated Unit and API Tests for Cognitive Games Engine
"""
import os
import sys
import unittest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi.testclient import TestClient
from main import app
from core.game_scoring import calculate_game_score, GAMES_CATALOGUE, DOMAINS


class TestGameScoringEngine(unittest.TestCase):
    def test_game_catalogue_completeness(self):
        expected_games = {
            "memory_match",
            "sequence_recall",
            "object_recognition",
            "pattern_completion",
            "daily_routine",
            "rhythm_and_recall",
        }
        self.assertEqual(set(GAMES_CATALOGUE.keys()), expected_games)
        for game_id, data in GAMES_CATALOGUE.items():
            self.assertIn("title", data)
            self.assertIn("cognitive_domain", data)
            self.assertIn(data["cognitive_domain"], DOMAINS)
            self.assertIn("levels", data)
            self.assertEqual(data["levels"], [1, 2, 3])

    def test_score_calculation_perfect_run(self):
        score, stars, perf, feedback = calculate_game_score(
            game_id="memory_match",
            difficulty_level=1,
            duration_seconds=20.0,
            moves_count=6,
            mistakes_count=0,
            completed=True,
        )
        self.assertGreaterEqual(score, 85.0)
        self.assertEqual(stars, 3)
        self.assertEqual(perf, "Excellent")

    def test_score_calculation_with_mistakes(self):
        score, stars, perf, feedback = calculate_game_score(
            game_id="sequence_recall",
            difficulty_level=2,
            duration_seconds=50.0,
            moves_count=6,
            mistakes_count=2,
            completed=True,
        )
        self.assertGreaterEqual(score, 60.0)
        self.assertIn(stars, [2, 3])

    def test_score_calculation_incomplete(self):
        score, stars, perf, feedback = calculate_game_score(
            game_id="pattern_completion",
            difficulty_level=1,
            duration_seconds=10.0,
            moves_count=1,
            mistakes_count=1,
            completed=False,
        )
        self.assertEqual(score, 40.0)
        self.assertEqual(stars, 1)


class TestGamesAPI(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    def test_get_games_catalogue(self):
        response = self.client.get("/api/games")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(len(data), 6)
        ids = [g["id"] for g in data]
        self.assertIn("memory_match", ids)
        self.assertIn("sequence_recall", ids)
        self.assertIn("object_recognition", ids)
        self.assertIn("pattern_completion", ids)
        self.assertIn("daily_routine", ids)
        self.assertIn("rhythm_and_recall", ids)

    def test_get_game_config(self):
        for game_id in ["memory_match", "sequence_recall", "object_recognition", "pattern_completion", "daily_routine"]:
            response = self.client.get(f"/api/games/{game_id}/config")
            self.assertEqual(response.status_code, 200)
            config = response.json()
            self.assertIn("game", config)
            self.assertIn("cognitive_domain", config)
            self.assertIn("level_presets", config)

    def test_submit_game_session(self):
        payload = {
            "game_id": "memory_match",
            "difficulty_level": 1,
            "duration_seconds": 25.5,
            "moves_count": 8,
            "mistakes_count": 1,
            "score": 90.0,
            "completed": True,
            "language": "en",
            "telemetry": {"pair_found_times": [5.2, 12.1, 24.0]},
        }
        response = self.client.post("/api/games/session", json=payload)
        self.assertEqual(response.status_code, 200)
        res = response.json()
        self.assertIn("session_id", res)
        self.assertEqual(res["game_id"], "memory_match")
        self.assertGreaterEqual(res["score"], 40.0)
        self.assertIn(res["stars"], [1, 2, 3])
        self.assertIn("feedback_message", res)

    def test_get_game_history_and_stats(self):
        # Submit a session first
        self.client.post("/api/games/session", json={
            "game_id": "daily_routine",
            "difficulty_level": 1,
            "duration_seconds": 30.0,
            "moves_count": 3,
            "mistakes_count": 0,
            "completed": True,
        })

        history_res = self.client.get("/api/games/history")
        self.assertEqual(history_res.status_code, 200)
        history_data = history_res.json()
        self.assertIn("sessions", history_data)
        self.assertGreater(len(history_data["sessions"]), 0)

        stats_res = self.client.get("/api/games/stats")
        self.assertEqual(stats_res.status_code, 200)
        stats_data = stats_res.json()
        self.assertIn("total_games_played", stats_data)
        self.assertIn("total_stars_earned", stats_data)
        self.assertIn("domain_scores", stats_data)


if __name__ == "__main__":
    unittest.main()
