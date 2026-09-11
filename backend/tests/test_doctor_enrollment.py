"""
test_doctor_enrollment.py — Doctor Pending Enrollment & Approval Test Suite
============================================================================
Comprehensive tests verifying:
1. Unauthenticated request to /api/auth/doctors/pending-requests returns 401
2. Non-doctor (patient/caregiver) accessing pending-requests returns 403
3. Doctor successfully retrieves pending enrollment requests
4. Patient enrolls with doctor by internal UUID or firebase_uid
5. Isolation: Unrelated doctor cannot view another doctor's pending requests
6. Doctor approves patient -> patient added to patient_list & assigned_doctor_id set
7. Doctor rejects patient -> request removed, patient not enrolled
8. Resilience: Malformed or legacy records without patient_id or status do not crash
9. Patient /api/auth/doctors/my-doctor reflects pending and approved state accurately
"""
from __future__ import annotations

import os
import sys
import unittest
import uuid

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi.testclient import TestClient
from main import app

from core.storage import (
    users_store,
    sessions_store,
    consent_store,
    results_store,
    reminders_store,
    memory_bank_store,
    messages_store,
)
from services import auth_service


class TestDoctorEnrollmentPipeline(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)
        # Backup and clear storage
        self.original_users = users_store.read()
        self.original_sessions = sessions_store.read()
        self.original_consent = consent_store.read()

        users_store.write({})
        sessions_store.write({})
        consent_store.write({})

    def tearDown(self):
        # Restore storage
        users_store.write(self.original_users)
        sessions_store.write(self.original_sessions)
        consent_store.write(self.original_consent)

    def _register_doctor(self, name="Dr. Alice Smith", email="alice.doc@example.com"):
        res = self.client.post(
            "/api/auth/register",
            json={
                "full_name": name,
                "email": email,
                "password": "DoctorSecurePass#123",
                "role": "doctor",
                "specialization": "Neurologist",
                "hospital": "City General Hospital",
            },
        )
        self.assertEqual(res.status_code, 200)
        return res.json()["token"], res.json()["user"]

    def _register_patient(self, name="Bob Patient", email="bob.patient@example.com"):
        res = self.client.post(
            "/api/auth/register",
            json={
                "full_name": name,
                "email": email,
                "password": "PatientSecurePass#123",
                "role": "patient",
                "age": 68,
                "gender": "male",
            },
        )
        self.assertEqual(res.status_code, 200)
        return res.json()["token"], res.json()["user"]

    # ── 1. Authentication & RBAC ──────────────────────────────────────────────
    def test_unauthenticated_pending_requests_returns_401(self):
        res = self.client.get("/api/auth/doctors/pending-requests")
        self.assertEqual(res.status_code, 401)

    def test_patient_accessing_pending_requests_returns_403(self):
        p_token, _ = self._register_patient()
        res = self.client.get(
            "/api/auth/doctors/pending-requests",
            headers={"Authorization": f"Bearer {p_token}"},
        )
        self.assertEqual(res.status_code, 403)
        self.assertIn("doctor", res.json()["detail"].lower())

    # ── 2. Retrieval of Pending Requests ──────────────────────────────────────
    def test_doctor_retrieves_empty_pending_requests(self):
        d_token, _ = self._register_doctor()
        res = self.client.get(
            "/api/auth/doctors/pending-requests",
            headers={"Authorization": f"Bearer {d_token}"},
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("pending_requests", data)
        self.assertEqual(data["pending_requests"], [])

    def test_patient_enrollment_appears_in_doctor_pending_requests(self):
        d_token, doctor = self._register_doctor()
        p_token, patient = self._register_patient()

        # Patient enrolls with Doctor
        enroll_res = self.client.post(
            "/api/auth/doctors/enroll",
            json={"doctor_id": doctor["id"]},
            headers={"Authorization": f"Bearer {p_token}"},
        )
        self.assertEqual(enroll_res.status_code, 200)
        self.assertEqual(enroll_res.json()["status"], "pending")

        # Doctor checks pending requests
        pending_res = self.client.get(
            "/api/auth/doctors/pending-requests",
            headers={"Authorization": f"Bearer {d_token}"},
        )
        self.assertEqual(pending_res.status_code, 200)
        requests = pending_res.json()["pending_requests"]
        self.assertEqual(len(requests), 1)
        self.assertEqual(requests[0]["patient_id"], patient["id"])
        self.assertEqual(requests[0]["patient_name"], patient["full_name"])
        self.assertEqual(requests[0]["patient_email"], patient["email"])

    def test_enrollment_lookup_by_firebase_uid(self):
        d_token, doctor = self._register_doctor()
        p_token, patient = self._register_patient()

        # Simulate doctor having a firebase_uid
        users = users_store.read()
        fb_uid = f"fb-doc-{uuid.uuid4().hex[:8]}"
        users[doctor["id"]]["firebase_uid"] = fb_uid
        users_store.write(users)

        # Patient enrolls using doctor's firebase_uid
        enroll_res = self.client.post(
            "/api/auth/doctors/enroll",
            json={"doctor_id": fb_uid},
            headers={"Authorization": f"Bearer {p_token}"},
        )
        self.assertEqual(enroll_res.status_code, 200)
        self.assertEqual(enroll_res.json()["status"], "pending")

        # Doctor checks pending requests
        pending_res = self.client.get(
            "/api/auth/doctors/pending-requests",
            headers={"Authorization": f"Bearer {d_token}"},
        )
        self.assertEqual(pending_res.status_code, 200)
        requests = pending_res.json()["pending_requests"]
        self.assertEqual(len(requests), 1)
        self.assertEqual(requests[0]["patient_id"], patient["id"])

    def test_isolation_between_doctors(self):
        d1_token, doc1 = self._register_doctor("Dr. Alpha", "alpha@example.com")
        d2_token, doc2 = self._register_doctor("Dr. Beta", "beta@example.com")
        p_token, _ = self._register_patient()

        # Patient enrolls with Doc1 only
        self.client.post(
            "/api/auth/doctors/enroll",
            json={"doctor_id": doc1["id"]},
            headers={"Authorization": f"Bearer {p_token}"},
        )

        # Doc 1 has 1 pending request
        res1 = self.client.get(
            "/api/auth/doctors/pending-requests",
            headers={"Authorization": f"Bearer {d1_token}"},
        )
        self.assertEqual(len(res1.json()["pending_requests"]), 1)

        # Doc 2 has 0 pending requests (complete isolation)
        res2 = self.client.get(
            "/api/auth/doctors/pending-requests",
            headers={"Authorization": f"Bearer {d2_token}"},
        )
        self.assertEqual(len(res2.json()["pending_requests"]), 0)

    # ── 3. Doctor Approval & Rejection Flow ───────────────────────────────────
    def test_doctor_approves_patient_enrollment(self):
        d_token, doctor = self._register_doctor()
        p_token, patient = self._register_patient()

        self.client.post(
            "/api/auth/doctors/enroll",
            json={"doctor_id": doctor["id"]},
            headers={"Authorization": f"Bearer {p_token}"},
        )

        # Doctor approves patient
        appr_res = self.client.post(
            "/api/auth/doctors/approve",
            json={"patient_id": patient["id"], "action": "approve"},
            headers={"Authorization": f"Bearer {d_token}"},
        )
        self.assertEqual(appr_res.status_code, 200)
        self.assertIn("approved", appr_res.json()["message"].lower())

        # Pending requests list is now empty
        pending_res = self.client.get(
            "/api/auth/doctors/pending-requests",
            headers={"Authorization": f"Bearer {d_token}"},
        )
        self.assertEqual(pending_res.json()["pending_requests"], [])

        # Patient is in doctor's patient list
        patients_res = self.client.get(
            "/api/auth/patients",
            headers={"Authorization": f"Bearer {d_token}"},
        )
        self.assertEqual(patients_res.status_code, 200)
        patient_ids = [p["id"] for p in patients_res.json()["patients"]]
        self.assertIn(patient["id"], patient_ids)

        # Patient's my-doctor payload shows assigned doctor
        my_doc_res = self.client.get(
            "/api/auth/doctors/my-doctor",
            headers={"Authorization": f"Bearer {p_token}"},
        )
        self.assertEqual(my_doc_res.status_code, 200)
        self.assertIsNotNone(my_doc_res.json()["doctor"])
        self.assertEqual(my_doc_res.json()["doctor"]["id"], doctor["id"])
        self.assertIsNone(my_doc_res.json()["pending_doctor"])

    def test_doctor_rejects_patient_enrollment(self):
        d_token, doctor = self._register_doctor()
        p_token, patient = self._register_patient()

        self.client.post(
            "/api/auth/doctors/enroll",
            json={"doctor_id": doctor["id"]},
            headers={"Authorization": f"Bearer {p_token}"},
        )

        # Doctor rejects patient
        rej_res = self.client.post(
            "/api/auth/doctors/approve",
            json={"patient_id": patient["id"], "action": "reject"},
            headers={"Authorization": f"Bearer {d_token}"},
        )
        self.assertEqual(rej_res.status_code, 200)
        self.assertIn("rejected", rej_res.json()["message"].lower())

        # Pending requests list is empty
        pending_res = self.client.get(
            "/api/auth/doctors/pending-requests",
            headers={"Authorization": f"Bearer {d_token}"},
        )
        self.assertEqual(pending_res.json()["pending_requests"], [])

        # Patient is NOT in doctor's patient list
        patients_res = self.client.get(
            "/api/auth/patients",
            headers={"Authorization": f"Bearer {d_token}"},
        )
        patient_ids = [p["id"] for p in patients_res.json()["patients"]]
        self.assertNotIn(patient["id"], patient_ids)

    # ── 4. Robustness to Malformed / Legacy Data ─────────────────────────────
    def test_resilience_to_malformed_legacy_records(self):
        d_token, doctor = self._register_doctor()

        # Inject malformed records into doctor's pending_requests
        users = users_store.read()
        users[doctor["id"]]["pending_requests"] = [
            "raw-string-instead-of-dict",
            {"missing_patient_id": True},
            {"patient_id": "non-existent-user-id", "status": "pending"},
            {"patient_id": None},
        ]
        users_store.write(users)

        # Ensure GET /api/auth/doctors/pending-requests handles gracefully without 500
        res = self.client.get(
            "/api/auth/doctors/pending-requests",
            headers={"Authorization": f"Bearer {d_token}"},
        )
        self.assertEqual(res.status_code, 200)
        # Non-existent user id fallback still provides a safe representation
        data = res.json()
        self.assertIsInstance(data["pending_requests"], list)


if __name__ == "__main__":
    unittest.main()
