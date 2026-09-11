"""
test_phase3_memory_reminders.py — Automated Unit & API Tests for Phase 3
========================================================================
Tests Personal Memory Bank, Daily Routine Assistant, Reminder Engine,
Hydration tracking, Game Pack generation, and Caregiver access.
"""
import os
import sys
import unittest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi.testclient import TestClient
from main import app
from services import memory_bank_service, reminder_service


class TestPhase3MemoryAndReminders(unittest.TestCase):

    def setUp(self):
        self.client = TestClient(app)
        self.test_user_id = "test_patient_p3"

    def test_memory_bank_crud(self):
        # 1. Get memories (seeds default if empty)
        items = memory_bank_service.get_memories(self.test_user_id)
        self.assertGreaterEqual(len(items), 1)

        # 2. Add custom memory
        from models.memory_schemas import MemoryItemCreate, MemoryItemUpdate
        new_mem = memory_bank_service.add_memory(
            self.test_user_id,
            MemoryItemCreate(
                category="person",
                name="Uncle Biren",
                relationship_or_context="Elder brother from Tezpur",
                image_emoji="👴",
                notes="Always brings fresh Assam tea leaves.",
            ),
        )
        self.assertEqual(new_mem["name"], "Uncle Biren")
        self.assertEqual(new_mem["category"], "person")

        # 3. Update memory
        updated = memory_bank_service.update_memory(
            new_mem["id"],
            self.test_user_id,
            MemoryItemUpdate(notes="Loves drinking afternoon black tea."),
        )
        self.assertIsNotNone(updated)
        self.assertIn("black tea", updated["notes"])

        # 4. Delete memory
        deleted = memory_bank_service.delete_memory(new_mem["id"], self.test_user_id)
        self.assertTrue(deleted)

    def test_game_pack_generation(self):
        pack = memory_bank_service.build_game_pack(self.test_user_id)
        self.assertIn("has_personal_items", pack)
        self.assertIn("match_pairs", pack)
        self.assertIn("recognition_questions", pack)
        self.assertIn("routine_sequence", pack)
        self.assertTrue(pack["has_personal_items"])
        self.assertGreaterEqual(len(pack["match_pairs"]), 2)

    def test_reminders_all_categories(self):
        # Seed reminders
        rems = reminder_service.get_reminders(self.test_user_id)
        self.assertGreaterEqual(len(rems), 4)

        categories = {r["category"] for r in rems}
        self.assertIn("medicine", categories)
        self.assertIn("hydration", categories)
        self.assertIn("daily_activity", categories)
        self.assertIn("appointment", categories)

    def test_reminder_completion_and_adherence(self):
        rems = reminder_service.get_reminders(self.test_user_id)
        target = rems[0]
        completed = reminder_service.complete_reminder(target["id"], self.test_user_id)
        self.assertIsNotNone(completed)
        self.assertEqual(completed["status"], "completed")

        summary = reminder_service.get_daily_routine_summary(self.test_user_id)
        self.assertGreaterEqual(summary["completed_reminders"], 1)
        self.assertGreater(summary["adherence_percentage"], 0.0)

    def test_hydration_tracking(self):
        log_res = reminder_service.log_hydration(self.test_user_id, glasses_added=2)
        self.assertGreaterEqual(log_res["total_glasses_today"], 2)
        self.assertEqual(log_res["target_glasses"], 8)

    def test_daily_routine_summary_ethical_framing(self):
        summary = reminder_service.get_daily_routine_summary(self.test_user_id)
        self.assertIn("adherence_percentage", summary)
        self.assertIn("hydration_glasses_logged", summary)
        self.assertIn("pending_medicines_count", summary)
        self.assertIn("streak_days", summary)
        # Ensure no disease probability fields are leaked
        self.assertNotIn("alzheimers_probability", summary)
        self.assertNotIn("dementia_risk", summary)
        self.assertNotIn("risk_level", summary)


if __name__ == "__main__":
    unittest.main()
