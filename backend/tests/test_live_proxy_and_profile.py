"""
test_live_proxy_and_profile.py — Live Proxy & Doctor Profile Test Suite
========================================================================
Validates:
1. Doctor clinic fields in UserProfileUpdate and update_basic_profile.
2. Firebase onboarding with clinic fields.
3. Profile updates with hospital, specialization, etc.
4. Live Vite proxy round-trip requests without connection drops.
"""
import unittest
import urllib.request
import json
from fastapi.testclient import TestClient
from main import app
from core.storage import users_store, sessions_store
from services import auth_service

class TestDoctorProfileAndProxy(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)
        self.original_users = users_store.read()
        self.original_sessions = sessions_store.read()

    def tearDown(self):
        users_store.write(self.original_users)
        sessions_store.write(self.original_sessions)

    def test_doctor_profile_clinic_fields_update(self):
        """Verify UserProfileUpdate accepts doctor clinic fields."""
        # Create a test doctor
        user = auth_service.create_user(
            full_name="Dr. Test Specialist",
            email="dr.specialist.test@example.com",
            role="doctor",
            password="DoctorSecurePass#123",
        )
        token = auth_service.create_session(user["id"])

        # Update profile with clinic fields
        update_payload = {
            "hospital": "Metro Neuro Center",
            "location": "New Delhi, India",
            "consultation_mode": "Hybrid (In-person & Teleconsult)",
            "bio": "Specialist in neurodegenerative cognitive rehabilitation.",
            "years_experience": 12,
            "specialization": "Cognitive Neurologist",
            "license_number": "MCI-NEURO-88912",
            "max_patients": 40,
        }

        res = self.client.put(
            "/api/auth/profile",
            headers={"Authorization": f"Bearer {token}"},
            json=update_payload,
        )
        self.assertEqual(res.status_code, 200)
        updated_user = res.json()
        self.assertEqual(updated_user["hospital"], "Metro Neuro Center")
        self.assertEqual(updated_user["location"], "New Delhi, India")
        self.assertEqual(updated_user["specialization"], "Cognitive Neurologist")
        self.assertEqual(updated_user["license_number"], "MCI-NEURO-88912")
        self.assertEqual(updated_user["years_experience"], 12)

    def test_firebase_onboarding_links_doctor_clinic_fields(self):
        """Verify create_or_link_firebase_profile sets clinic fields."""
        doc = auth_service.create_or_link_firebase_profile(
            firebase_uid="test-fb-doctor-uid-9999",
            email="fb.doctor.test@example.com",
            role="doctor",
            full_name="Dr. Firebase Specialist",
            hospital="Apollo Health City",
            specialization="Neuropsychiatrist",
            license_number="AP-NEURO-552",
        )
        self.assertEqual(doc["role"], "doctor")
        self.assertEqual(doc["hospital"], "Apollo Health City")
        self.assertEqual(doc["specialization"], "Neuropsychiatrist")
        self.assertEqual(doc["license_number"], "AP-NEURO-552")

    def test_live_vite_proxy_round_trip(self):
        """Verify live Vite dev server forwards /api/health to FastAPI without ECONNREFUSED."""
        try:
            req = urllib.request.Request("http://127.0.0.1:5173/api/health")
            with urllib.request.urlopen(req, timeout=3) as response:
                self.assertEqual(response.status, 200)
                body = json.loads(response.read().decode("utf-8"))
                self.assertEqual(body.get("status"), "ok")
                self.assertEqual(body.get("service"), "NeuroAid API")
        except urllib.error.URLError as e:
            self.fail(f"Vite proxy failed to connect: {e}")
