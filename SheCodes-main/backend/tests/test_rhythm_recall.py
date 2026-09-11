"""
test_rhythm_recall.py — Automated Unit and API Tests for Rhythm & Recall Engine
==============================================================================
Tests song retrieval, era/language filtering, session telemetry submission,
non-punitive engagement scoring, and evening sundowning recommendation logic.
"""
import os
import sys
import unittest
import uuid

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi.testclient import TestClient
from main import app
from models.schemas import SongItem, RhythmRecallSubmission, RhythmRecallSession


class TestRhythmRecallAPI(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    def test_get_songs_unfiltered(self):
        """Test retrieving all songs across both API route prefixes."""
        for prefix in ["/api/v1/games/rhythm-recall", "/api/games/rhythm-recall"]:
            res = self.client.get(f"{prefix}/songs")
            self.assertEqual(res.status_code, 200)
            songs = res.json()
            self.assertIsInstance(songs, list)
            self.assertGreaterEqual(len(songs), 6)
            # Validate schema of each song
            for s in songs:
                item = SongItem(**s)
                self.assertTrue(item.id)
                self.assertTrue(item.title)
                self.assertGreater(item.bpm, 0)
                self.assertGreater(len(item.beat_timestamps), 0)
                self.assertGreaterEqual(len(item.distractor_titles), 2)

    def test_get_songs_filtered_by_era(self):
        """Test filtering songs by era (1950s, 1960s, Folk Classic)."""
        res = self.client.get("/api/v1/games/rhythm-recall/songs?era=1960s")
        self.assertEqual(res.status_code, 200)
        songs = res.json()
        self.assertGreaterEqual(len(songs), 1)
        for s in songs:
            self.assertIn("1960s", s["era"])

    def test_get_songs_filtered_by_language(self):
        """Test filtering songs by region/language (Assamese, Hindi, Bengali, Spanish, English)."""
        res = self.client.get("/api/v1/games/rhythm-recall/songs?region_or_language=Assamese")
        self.assertEqual(res.status_code, 200)
        songs = res.json()
        self.assertGreaterEqual(len(songs), 1)
        for s in songs:
            self.assertEqual(s["region_or_language"].lower(), "assamese")

    def test_submit_rhythm_session_tap_along(self):
        """Test submitting a rhythm tap session with engagement metrics."""
        action_id = str(uuid.uuid4())
        payload = {
            "patient_id": "test_patient_001",
            "game_id": "rhythm_and_recall",
            "mode": "rhythm_tap",
            "song_id": "song-001",
            "rhythm_accuracy": 92.5,
            "mood_pre_session": 2,
            "mood_post_session": 4,
            "agitation_level_observed": 1,
            "client_action_id": action_id,
        }
        res = self.client.post("/api/v1/games/rhythm-recall/submit", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        session = RhythmRecallSession(**data)
        self.assertEqual(session.patient_id, "test_patient_001")
        self.assertEqual(session.mode, "rhythm_tap")
        self.assertGreaterEqual(session.score, 80.0)  # Non-punitive baseline
        self.assertEqual(session.stars, 3)
        self.assertEqual(session.mood_shift, 2)  # 4 - 2 = +2 improvement
        self.assertIn("joyful", session.feedback_message.lower())

        # Test idempotency / deduplication
        retry_res = self.client.post("/api/v1/games/rhythm-recall/submit", json=payload)
        self.assertEqual(retry_res.status_code, 200)
        self.assertEqual(retry_res.json()["session_id"], session.session_id)

    def test_submit_song_recognition_mode(self):
        """Test submitting a multiple-choice song recognition session."""
        payload = {
            "patient_id": "test_patient_002",
            "game_id": "rhythm_and_recall",
            "mode": "song_recognition",
            "song_id": "song-008",
            "rhythm_accuracy": 100.0,
            "song_recognition_accuracy": True,
            "mood_pre_session": 3,
            "mood_post_session": 5,
        }
        res = self.client.post("/api/games/rhythm-recall/submit", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["song_recognition_accuracy"], True)
        self.assertGreaterEqual(data["score"], 85.0)

    def test_submit_hum_sing_along_mode(self):
        """Test submitting a vocal sing-along non-graded session."""
        payload = {
            "patient_id": "test_patient_003",
            "game_id": "rhythm_and_recall",
            "mode": "free_sing",
            "song_id": "song-004",
            "rhythm_accuracy": 85.0,
            "sing_along_duration_sec": 45.0,
            "agitation_level_observed": 2,
        }
        res = self.client.post("/api/v1/games/rhythm-recall/submit", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["mode"], "free_sing")
        self.assertEqual(data["sing_along_duration_sec"], 45.0)
        # Verify non-punitive scoring: dementia patient is praised
        self.assertGreaterEqual(data["stars"], 2)

    def test_get_recommendation_evening_trigger(self):
        """Test evening sundowning recommendation trigger (simulated or real)."""
        res = self.client.get("/api/v1/games/rhythm-recall/recommendation?force_evening=true")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data["recommended"])
        self.assertTrue(data["is_sundowning_window"])
        self.assertTrue(len(data["recommended_songs"]) > 0)
        self.assertIn("anterior cingulate", data["clinical_rationale"].lower())
        self.assertIn("sundowning", data["reason"].lower())

    def test_non_punitive_zero_accuracy_does_not_fail(self):
        """Verify zero-frustration / zero failure guarantee: low accuracy still receives positive support."""
        payload = {
            "patient_id": "test_patient_004",
            "game_id": "rhythm_and_recall",
            "mode": "rhythm_tap",
            "song_id": "song-002",
            "rhythm_accuracy": 10.0,  # Patient tapped off-beat
        }
        res = self.client.post("/api/v1/games/rhythm-recall/submit", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        # Score never drops below encouraging baseline 80
        self.assertGreaterEqual(data["score"], 80.0)
        self.assertGreaterEqual(data["stars"], 2)
        self.assertNotIn("Wrong", data["feedback_message"])
        self.assertNotIn("Failed", data["feedback_message"])

    def test_offline_batch_sync_rhythm_session(self):
        """Verify that offline-queued rhythm recall sessions sync idempotently via /api/sync/batch."""
        # Create a test patient session token
        reg_res = self.client.post("/api/auth/register", json={
            "full_name": "Offline Sync Patient",
            "email": f"offline_sync_{uuid.uuid4().hex[:6]}@example.com",
            "password": "Password123!",
            "role": "patient",
        })
        self.assertEqual(reg_res.status_code, 200)
        token = reg_res.json()["token"]
        patient_id = reg_res.json()["user"]["id"]

        action_id = f"rhythm_action_{uuid.uuid4().hex[:8]}"
        sync_payload = {
            "actions": [
                {
                    "id": action_id,
                    "type": "RHYTHM_SESSION_SUBMIT",
                    "payload": {
                        "patient_id": patient_id,
                        "game_id": "rhythm_and_recall",
                        "mode": "rhythm_tap",
                        "song_id": "song-001",
                        "rhythm_accuracy": 96.0,
                    },
                    "created_at": "2026-09-11T18:00:00Z"
                }
            ]
        }

        res = self.client.post(
            "/api/sync/batch",
            json=sync_payload,
            headers={"Authorization": f"Bearer {token}"}
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["sync_status"], "success")
        self.assertEqual(len(data["results"]), 1)
        self.assertEqual(data["results"][0]["id"], action_id)
        self.assertEqual(data["results"][0]["status"], "applied")
        self.assertIn("session_id", data["results"][0])


if __name__ == "__main__":
    unittest.main()

