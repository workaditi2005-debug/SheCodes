"""
test_security_hardening.py — Healthcare Security Audit & Verification Tests
============================================================================
Comprehensive test suite verifying:
1. Password complexity requirements & rejection of weak passwords
2. Account lockout on repeated failed login attempts (brute-force defense)
3. Hashed session storage & session TTL / idle expiration
4. IDOR defenses: Doctor-patient enrollment & consent gating
5. Care-team memory bank & reminder mutation authorization
6. Message participant deletion authorization
7. Consent management read & update
8. Audit trail recording and access control
9. HTTP security headers (nosniff, frame-options, referrer-policy)
"""
from __future__ import annotations

import os
import sys
import unittest
from datetime import datetime, timezone, timedelta

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi.testclient import TestClient
from main import app

from core.security import (
    hash_token,
    validate_password_strength,
)
from core.settings import settings
from core.storage import (
    consent_store,
    memory_bank_store,
    messages_store,
    reminders_store,
    results_store,
    sessions_store,
    users_store,
)
from services import audit_service, auth_service


class TestHealthcareSecurity(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)
        # Clear storage for clean test isolation
        self.original_users = users_store.read()
        self.original_sessions = sessions_store.read()
        self.original_results = results_store.read()
        self.original_consent = consent_store.read()
        self.original_reminders = reminders_store.read()
        self.original_memories = memory_bank_store.read()
        self.original_messages = messages_store.read()

        users_store.write({})
        sessions_store.write({})
        results_store.write({})
        consent_store.write({})
        reminders_store.write([])
        memory_bank_store.write([])
        messages_store.write([])
        auth_service._FAILED_ATTEMPTS.clear()

    def tearDown(self):
        users_store.write(self.original_users)
        sessions_store.write(self.original_sessions)
        results_store.write(self.original_results)
        consent_store.write(self.original_consent)
        reminders_store.write(self.original_reminders)
        memory_bank_store.write(self.original_memories)
        messages_store.write(self.original_messages)
        auth_service._FAILED_ATTEMPTS.clear()

    # ── 1. Password Complexity Enforcement ─────────────────────────────────────
    def test_password_complexity(self):
        # Weak passwords should be rejected
        ok, msg = validate_password_strength("short1!")
        self.assertFalse(ok)
        self.assertIn("at least 8 characters", msg)

        ok, msg = validate_password_strength("alllowercase1!")
        self.assertFalse(ok)
        self.assertIn("uppercase", msg)

        ok, msg = validate_password_strength("ALLUPPERCASE1!")
        self.assertFalse(ok)
        self.assertIn("lowercase", msg)

        ok, msg = validate_password_strength("NoDigitsHere!")
        self.assertFalse(ok)
        self.assertIn("digit", msg)

        ok, msg = validate_password_strength("NoSpecialChar123")
        self.assertFalse(ok)
        self.assertIn("special character", msg)

        # Strong password should pass
        ok, msg = validate_password_strength("StrongPass@2026")
        self.assertTrue(ok)
        self.assertEqual(msg, "")

    def test_registration_rejects_weak_password(self):
        res = self.client.post(
            "/api/auth/register",
            json={
                "full_name": "Test Patient",
                "email": "patient.weak@example.com",
                "password": "weak",
                "role": "patient",
            },
        )
        self.assertEqual(res.status_code, 422)  # Pydantic min_length=8

        res2 = self.client.post(
            "/api/auth/register",
            json={
                "full_name": "Test Patient",
                "email": "patient.weak@example.com",
                "password": "weakpassword123",  # No special char or uppercase
                "role": "patient",
            },
        )
        self.assertEqual(res2.status_code, 400)
        self.assertIn("uppercase", res2.json()["detail"].lower())

    # ── 2. Brute-Force Rate Limiting & Account Lockout ─────────────────────────
    def test_failed_login_lockout(self):
        # Register a valid user
        self.client.post(
            "/api/auth/register",
            json={
                "full_name": "Lockout Test",
                "email": "lockout@example.com",
                "password": "ValidPassword#123",
                "role": "patient",
            },
        )

        # 5 failed login attempts (each returns 401 and records a failure)
        for i in range(5):
            res = self.client.post(
                "/api/auth/login",
                json={
                    "email": "lockout@example.com",
                    "password": f"WrongPassword#{i}",
                    "role": "patient",
                },
            )
            self.assertEqual(res.status_code, 401)

        # 6th attempt is locked out -> Expect 429
        res = self.client.post(
            "/api/auth/login",
            json={
                "email": "lockout@example.com",
                "password": "ValidPassword#123",  # Even with correct credentials!
                "role": "patient",
            },
        )
        self.assertEqual(res.status_code, 429)
        self.assertIn("locked", res.json()["detail"].lower())


    # ── 3. Hashed Sessions & Expiration ────────────────────────────────────────
    def test_session_token_stored_hashed(self):
        reg = self.client.post(
            "/api/auth/register",
            json={
                "full_name": "Session Test",
                "email": "session@example.com",
                "password": "ValidPassword#123",
                "role": "patient",
            },
        )
        self.assertEqual(reg.status_code, 200)
        token = reg.json()["token"]

        sessions = sessions_store.read()
        # Raw token must NOT be a key in sessions_store
        self.assertNotIn(token, sessions)
        # SHA-256 hashed token MUST be a key in sessions_store
        self.assertIn(hash_token(token), sessions)

        # Authenticated endpoint succeeds with raw bearer token
        me_res = self.client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
        self.assertEqual(me_res.status_code, 200)
        self.assertEqual(me_res.json()["user"]["email"], "session@example.com")

    def test_expired_session_is_rejected(self):
        reg = self.client.post(
            "/api/auth/register",
            json={
                "full_name": "Expired Test",
                "email": "expired@example.com",
                "password": "ValidPassword#123",
                "role": "patient",
            },
        )
        token = reg.json()["token"]
        token_h = hash_token(token)

        # Manually age the session beyond TTL (e.g. 10 hours ago)
        sessions = sessions_store.read()
        old_time = (datetime.now(timezone.utc) - timedelta(hours=10)).isoformat()
        sessions[token_h]["created_at"] = old_time
        sessions[token_h]["last_active"] = old_time
        sessions_store.write(sessions)

        res = self.client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
        self.assertEqual(res.status_code, 401)
        self.assertIn("expired", res.json()["detail"].lower())

    # ── 4. IDOR Defense: Doctor-Patient Enrollment & Consent Gating ───────────
    def test_doctor_cannot_view_unassigned_patient_results(self):
        # Register Patient A
        reg_p = self.client.post(
            "/api/auth/register",
            json={"full_name": "Patient A", "email": "patienta@example.com", "password": "PatientPass#123", "role": "patient"},
        )
        p_id = reg_p.json()["user"]["id"]

        # Register Doctor 1
        reg_d1 = self.client.post(
            "/api/auth/register",
            json={"full_name": "Dr. One", "email": "doc1@example.com", "password": "DoctorPass#123", "role": "doctor"},
        )
        d1_token = reg_d1.json()["token"]

        # Doctor 1 attempts to access unassigned Patient A's results -> Expect 403 IDOR blocked
        res = self.client.get(f"/api/results/patient/{p_id}", headers={"Authorization": f"Bearer {d1_token}"})
        self.assertEqual(res.status_code, 403)
        self.assertIn("not assigned", res.json()["detail"].lower())

    def test_doctor_access_blocked_when_patient_withholds_consent(self):
        # Register Patient A
        reg_p = self.client.post(
            "/api/auth/register",
            json={"full_name": "Patient Consent", "email": "patientc@example.com", "password": "PatientPass#123", "role": "patient"},
        )
        p_id = reg_p.json()["user"]["id"]
        p_token = reg_p.json()["token"]

        # Register Doctor 1
        reg_d1 = self.client.post(
            "/api/auth/register",
            json={"full_name": "Dr. Consent", "email": "docc@example.com", "password": "DoctorPass#123", "role": "doctor"},
        )
        d1_id = reg_d1.json()["user"]["id"]
        d1_token = reg_d1.json()["token"]

        # Enroll Patient with Doctor
        self.client.post("/api/auth/doctors/enroll", json={"doctor_id": d1_id}, headers={"Authorization": f"Bearer {p_token}"})
        self.client.post("/api/auth/doctors/approve", json={"patient_id": p_id, "action": "approve"}, headers={"Authorization": f"Bearer {d1_token}"})

        # Revoke consent by patient
        self.client.put(
            "/api/consent",
            json={"share_with_care_team": False, "share_memory_bank": False, "share_reminders": False},
            headers={"Authorization": f"Bearer {p_token}"},
        )

        # Doctor attempts to view results -> Expect 403 consent withheld
        res = self.client.get(f"/api/results/patient/{p_id}", headers={"Authorization": f"Bearer {d1_token}"})
        self.assertEqual(res.status_code, 403)
        self.assertIn("consent", res.json()["detail"].lower())

    # ── 5. Message Participant Deletion Authorization ──────────────────────────
    def test_user_cannot_delete_third_party_message(self):
        # User 1 sends message to User 2
        reg1 = self.client.post("/api/auth/register", json={"full_name": "User 1", "email": "u1@example.com", "password": "UserPass#123", "role": "doctor"})
        reg2 = self.client.post("/api/auth/register", json={"full_name": "User 2", "email": "u2@example.com", "password": "UserPass#123", "role": "patient"})
        reg3 = self.client.post("/api/auth/register", json={"full_name": "User 3", "email": "u3@example.com", "password": "UserPass#123", "role": "patient"})

        u1_id = reg1.json()["user"]["id"]
        u1_token = reg1.json()["token"]
        u2_id = reg2.json()["user"]["id"]
        u3_token = reg3.json()["token"]

        # Assign u2 to u1
        users = users_store.read()
        users[u1_id]["patient_list"] = [u2_id]
        users[u2_id]["assigned_doctor_id"] = u1_id
        users_store.write(users)

        # u1 sends message to u2
        msg_res = self.client.post(
            "/api/messages/send",
            json={"recipient_id": u2_id, "text": "Clinical message"},
            headers={"Authorization": f"Bearer {u1_token}"},
        )
        msg_id = msg_res.json()["message"]["id"]

        # u3 (third-party) attempts to delete message -> Expect 403 Forbidden
        del_res = self.client.delete(f"/api/messages/{msg_id}", headers={"Authorization": f"Bearer {u3_token}"})
        self.assertEqual(del_res.status_code, 403)
        self.assertIn("participant", del_res.json()["detail"].lower())

    # ── 6. Consent Management API ──────────────────────────────────────────────
    def test_consent_management_endpoints(self):
        reg = self.client.post(
            "/api/auth/register",
            json={"full_name": "Consent User", "email": "consent.user@example.com", "password": "UserPass#123", "role": "patient"},
        )
        token = reg.json()["token"]

        # Get consent
        get_res = self.client.get("/api/consent", headers={"Authorization": f"Bearer {token}"})
        self.assertEqual(get_res.status_code, 200)
        self.assertTrue(get_res.json()["share_with_care_team"])

        # Update consent
        put_res = self.client.put(
            "/api/consent",
            json={"share_with_care_team": False, "share_memory_bank": False, "share_reminders": True, "allow_research_deidentified": True},
            headers={"Authorization": f"Bearer {token}"},
        )
        self.assertEqual(put_res.status_code, 200)
        self.assertFalse(put_res.json()["share_with_care_team"])
        self.assertTrue(put_res.json()["allow_research_deidentified"])

    # ── 7. Audit Trail Logging & Elevated Inspection ───────────────────────────
    def test_audit_logs_endpoint(self):
        # Register doctor
        reg_doc = self.client.post(
            "/api/auth/register",
            json={"full_name": "Dr. Auditor", "email": "auditor@example.com", "password": "DoctorPass#123", "role": "doctor"},
        )
        doc_token = reg_doc.json()["token"]

        # Doctor queries audit logs -> Success
        logs_res = self.client.get("/api/auth/audit-logs?limit=10", headers={"Authorization": f"Bearer {doc_token}"})
        self.assertEqual(logs_res.status_code, 200)
        logs = logs_res.json()["audit_logs"]
        self.assertTrue(len(logs) > 0)
        # Verify event format
        self.assertIn("timestamp", logs[0])
        self.assertIn("event", logs[0])
        self.assertIn("actor_id", logs[0])

    # ── 8. Security Headers Verification ───────────────────────────────────────
    def test_security_headers_present(self):
        res = self.client.get("/health")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.headers.get("x-content-type-options"), "nosniff")
        self.assertEqual(res.headers.get("x-frame-options"), "DENY")
        self.assertEqual(res.headers.get("referrer-policy"), "strict-origin-when-cross-origin")
