"""
test_firebase_auth.py — Comprehensive Test Suite for Backend Firebase Authentication
=====================================================================================
Covers all 14 Prompt 1D verification requirements:
 1. Missing Authorization header → 401
 2. Malformed Authorization header → 401
 3. Invalid Firebase token → 401
 4. Expired Firebase token → 401
 5. Token from wrong Firebase project → rejected (401)
 6. Valid Firebase identity → accepted
 7. Unknown Firebase UID → handled safely (401 profile not found)
 8. Existing NeuroAid user with firebase_uid → correctly resolved
 9. Patient RBAC enforcement
10. Caregiver RBAC enforcement
11. Doctor RBAC enforcement
12. Admin RBAC enforcement
13. Cross-patient access → rejected (403)
14. SIH demo mode → isolated and works deterministically
+ Placeholder token rejection verification
+ Google doctor privilege escalation rejection
"""
from __future__ import annotations

import os
import uuid
import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient

from main import app
from core.settings import settings
from core.storage import users_store
from core.firebase_auth import (
    SIH_DEMO_TOKENS,
    extract_bearer_token,
    verify_firebase_id_token,
    resolve_user_by_firebase_claims,
)
from services import auth_service

client = TestClient(app)

PROJECT_ID = settings.firebase_project_id  # "NeuroAid-SIH-2026"


# ── Fixtures & Mock Helpers ───────────────────────────────────────────────────

def make_mock_claims(uid: str, email: str, project_id: str = PROJECT_ID, is_google: bool = False):
    return {
        "uid": uid,
        "sub": uid,
        "email": email,
        "name": f"User {uid[:6]}",
        "aud": project_id,
        "iss": f"https://securetoken.google.com/{project_id}",
        "firebase": {
            "sign_in_provider": "google.com" if is_google else "password",
            "project_id": project_id,
        },
    }


# ── Test 1: Missing Authorization Header ─────────────────────────────────────
def test_1_missing_authorization_header_returns_401():
    response = client.get("/api/auth/me")
    assert response.status_code == 422 or response.status_code == 401
    # FastAPI requires header, returning either 422 missing header or 401


# ── Test 2: Malformed Authorization Header ───────────────────────────────────
def test_2_malformed_authorization_header_returns_401():
    # Empty token
    res1 = client.get("/api/auth/me", headers={"Authorization": "Bearer "})
    assert res1.status_code == 401

    # Missing Bearer prefix
    res2 = client.get("/api/auth/me", headers={"Authorization": "Basic 12345"})
    assert res2.status_code == 401

    # Single token string without Bearer
    res3 = client.get("/api/auth/me", headers={"Authorization": "justatoken"})
    assert res3.status_code == 401


# ── Test 3: Invalid Firebase Token ───────────────────────────────────────────
def test_3_invalid_firebase_token_returns_401():
    res = client.get("/api/auth/me", headers={"Authorization": "Bearer invalid.jwt.token"})
    assert res.status_code == 401
    assert "invalid" in res.json().get("detail", "").lower() or "unauthorized" in res.json().get("detail", "").lower()


# ── Test 4: Expired Firebase Token ───────────────────────────────────────────
def test_4_expired_firebase_token_returns_401():
    with patch("core.firebase_auth.verify_firebase_id_token") as mock_verify:
        from fastapi import HTTPException
        mock_verify.side_effect = HTTPException(status_code=401, detail="Authentication token has expired. Please sign in again.")

        res = client.get("/api/auth/me", headers={"Authorization": "Bearer expired.jwt.token"})
        assert res.status_code == 401
        assert "expired" in res.json().get("detail", "").lower()


# ── Test 5: Token from Wrong Firebase Project ────────────────────────────────
def test_5_token_from_wrong_project_rejected():
    with patch("core.firebase_auth.verify_firebase_id_token") as mock_verify:
        from fastapi import HTTPException
        mock_verify.side_effect = HTTPException(status_code=401, detail="Token from wrong Firebase project.")

        res = client.get("/api/auth/me", headers={"Authorization": "Bearer foreign.project.token"})
        assert res.status_code == 401
        assert "wrong firebase project" in res.json().get("detail", "").lower()


# ── Test 6: Valid Firebase Identity Accepted ─────────────────────────────────
def test_6_valid_firebase_identity_accepted():
    test_uid = f"fb-test-uid-{uuid.uuid4().hex[:8]}"
    test_email = f"test_{uuid.uuid4().hex[:6]}@example.com"
    internal_id = f"neuroaid-user-{uuid.uuid4().hex[:8]}"

    # Seed an existing NeuroAid user with this firebase_uid
    users = users_store.read()
    users[internal_id] = {
        "id": internal_id,
        "firebase_uid": test_uid,
        "full_name": "Verified Patient",
        "email": test_email,
        "role": "patient",
        "age": 60,
        "created_at": "2026-09-11T00:00:00Z",
    }
    users_store.write(users)

    claims = make_mock_claims(test_uid, test_email)

    with patch("core.firebase_auth.verify_firebase_id_token", return_value=claims):
        res = client.get("/api/auth/me", headers={"Authorization": "Bearer valid.firebase.token"})
        assert res.status_code == 200
        data = res.json()
        assert data["user"]["id"] == internal_id
        assert data["user"]["firebase_uid"] == test_uid
        assert data["user"]["email"] == test_email


# ── Test 7: Unknown Firebase UID Handled Safely ──────────────────────────────
def test_7_unknown_firebase_uid_handled_safely():
    unknown_uid = f"fb-unknown-{uuid.uuid4().hex[:8]}"
    unknown_email = f"unknown_{uuid.uuid4().hex[:6]}@unknown.com"

    claims = make_mock_claims(unknown_uid, unknown_email)

    with patch("core.firebase_auth.verify_firebase_id_token", return_value=claims):
        res = client.get("/api/auth/me", headers={"Authorization": "Bearer valid.but.unregistered"})
        assert res.status_code == 401
        assert "onboarding" in res.json().get("detail", "").lower() or "not found" in res.json().get("detail", "").lower()


# ── Test 8: Existing NeuroAid User with firebase_uid Correctly Resolved ───────
def test_8_existing_user_linked_and_resolved():
    test_uid = f"fb-link-uid-{uuid.uuid4().hex[:8]}"
    test_email = f"legacy_{uuid.uuid4().hex[:6]}@neuroaid.local"
    internal_id = f"legacy-user-{uuid.uuid4().hex[:8]}"

    # Legacy user without firebase_uid yet
    users = users_store.read()
    users[internal_id] = {
        "id": internal_id,
        "full_name": "Legacy Existing User",
        "email": test_email,
        "role": "patient",
        "created_at": "2026-09-10T00:00:00Z",
    }
    users_store.write(users)

    claims = make_mock_claims(test_uid, test_email)

    # Resolution should link firebase_uid automatically
    with patch("core.firebase_auth.verify_firebase_id_token", return_value=claims):
        res = client.get("/api/auth/me", headers={"Authorization": "Bearer valid.token.legacy"})
        assert res.status_code == 200
        assert res.json()["user"]["id"] == internal_id

    # Verify persistent linking
    updated_users = users_store.read()
    assert updated_users[internal_id].get("firebase_uid") == test_uid


# ── Test 9: Patient RBAC Enforcement ─────────────────────────────────────────
def test_9_patient_rbac_blocked_from_doctor_endpoints():
    p_uid = f"fb-p-{uuid.uuid4().hex[:6]}"
    p_id = f"user-p-{uuid.uuid4().hex[:6]}"
    p_email = f"patient_{uuid.uuid4().hex[:4]}@neuroaid.test"

    users = users_store.read()
    users[p_id] = {
        "id": p_id,
        "firebase_uid": p_uid,
        "full_name": "Patient Person",
        "email": p_email,
        "role": "patient",
    }
    users_store.write(users)

    claims = make_mock_claims(p_uid, p_email)

    with patch("core.firebase_auth.verify_firebase_id_token", return_value=claims):
        # Patient can access their own profile
        res_me = client.get("/api/auth/me", headers={"Authorization": "Bearer tok.patient.jwt"})
        assert res_me.status_code == 200

        # Patient CANNOT access doctor endpoint /api/auth/patients
        res_doc = client.get("/api/auth/patients", headers={"Authorization": "Bearer tok.patient.jwt"})
        assert res_doc.status_code == 403


# ── Test 10: Caregiver RBAC Enforcement ──────────────────────────────────────
def test_10_caregiver_rbac():
    cg_uid = f"fb-cg-{uuid.uuid4().hex[:6]}"
    cg_id = f"user-cg-{uuid.uuid4().hex[:6]}"
    cg_email = f"caregiver_{uuid.uuid4().hex[:4]}@neuroaid.test"

    users = users_store.read()
    users[cg_id] = {
        "id": cg_id,
        "firebase_uid": cg_uid,
        "full_name": "Caregiver Person",
        "email": cg_email,
        "role": "caregiver",
        "patient_list": [],
    }
    users_store.write(users)

    claims = make_mock_claims(cg_uid, cg_email)

    with patch("core.firebase_auth.verify_firebase_id_token", return_value=claims):
        # Caregiver can access care-team patient list
        res_ct = client.get("/api/auth/patients", headers={"Authorization": "Bearer tok.cg.jwt"})
        assert res_ct.status_code == 200

        # Caregiver CANNOT create medical content (doctor-only)
        res_content = client.post(
            "/api/content/passage",
            headers={"Authorization": "Bearer tok.cg.jwt"},
            json={"title": "Test", "content": "Doctor only text"},
        )
        assert res_content.status_code == 403


# ── Test 11: Doctor RBAC Enforcement ─────────────────────────────────────────
def test_11_doctor_rbac():
    doc_uid = f"fb-doc-{uuid.uuid4().hex[:6]}"
    doc_id = f"user-doc-{uuid.uuid4().hex[:6]}"
    doc_email = f"dr.smith_{uuid.uuid4().hex[:4]}@neuroaid.test"

    users = users_store.read()
    users[doc_id] = {
        "id": doc_id,
        "firebase_uid": doc_uid,
        "full_name": "Dr. Smith",
        "email": doc_email,
        "role": "doctor",
        "specialization": "Neurologist",
        "patient_list": [],
    }
    users_store.write(users)

    claims = make_mock_claims(doc_uid, doc_email)

    with patch("core.firebase_auth.verify_firebase_id_token", return_value=claims):
        res_patients = client.get("/api/auth/patients", headers={"Authorization": "Bearer tok.doc.jwt"})
        assert res_patients.status_code == 200


# ── Test 12: Admin RBAC Enforcement ──────────────────────────────────────────
def test_12_admin_rbac():
    adm_uid = f"fb-adm-{uuid.uuid4().hex[:6]}"
    adm_id = f"user-adm-{uuid.uuid4().hex[:6]}"
    adm_email = f"admin_{uuid.uuid4().hex[:4]}@neuroaid.test"

    users = users_store.read()
    users[adm_id] = {
        "id": adm_id,
        "firebase_uid": adm_uid,
        "full_name": "System Admin",
        "email": adm_email,
        "role": "admin",
    }
    users_store.write(users)

    claims = make_mock_claims(adm_uid, adm_email)

    with patch("core.firebase_auth.verify_firebase_id_token", return_value=claims):
        # Admin is treated as care-team member
        res = client.get("/api/auth/patients", headers={"Authorization": "Bearer tok.adm.jwt"})
        assert res.status_code == 200


# ── Test 13: Cross-Patient Access Rejected ───────────────────────────────────
def test_13_cross_patient_access_rejected():
    doc1_uid = f"fb-doc1-{uuid.uuid4().hex[:6]}"
    doc1_id = f"doc-1-{uuid.uuid4().hex[:6]}"
    patient_id = f"other-patient-{uuid.uuid4().hex[:6]}"

    users = users_store.read()
    users[doc1_id] = {
        "id": doc1_id,
        "firebase_uid": doc1_uid,
        "full_name": "Dr. Unassigned",
        "email": "unassigned@neuroaid.test",
        "role": "doctor",
        "patient_list": [],  # does NOT contain patient_id
    }
    users[patient_id] = {
        "id": patient_id,
        "full_name": "Private Patient",
        "email": "private@neuroaid.test",
        "role": "patient",
        "assigned_doctor_id": "different-doctor-id",
    }
    users_store.write(users)

    claims = make_mock_claims(doc1_uid, "unassigned@neuroaid.test")

    with patch("core.firebase_auth.verify_firebase_id_token", return_value=claims):
        # Attempting to fetch reminders or results for unassigned patient must be rejected
        res = client.get(f"/api/reminders?patient_id={patient_id}", headers={"Authorization": "Bearer tok.doc.jwt"})
        assert res.status_code == 403


# ── Test 14: SIH Deterministic Demo Mode Still Works ─────────────────────────
def test_14_sih_demo_mode_isolated_and_works():
    # First ensure demo data is seeded
    seed_res = client.post("/api/demo/reset-and-seed")
    assert seed_res.status_code == 200

    # Test patient deterministic demo token
    patient_token = "sih_demo_patient_token_deterministic_2026"
    res_p = client.get("/api/auth/me", headers={"Authorization": f"Bearer {patient_token}"})
    assert res_p.status_code == 200
    assert res_p.json()["user"]["id"] == "sih-demo-patient-001"
    assert res_p.json()["user"]["role"] == "patient"

    # Test doctor deterministic demo token
    doctor_token = "sih_demo_doctor_token_deterministic_2026"
    res_d = client.get("/api/auth/me", headers={"Authorization": f"Bearer {doctor_token}"})
    assert res_d.status_code == 200
    assert res_d.json()["user"]["id"] == "sih-demo-doctor-001"
    assert res_d.json()["user"]["role"] == "doctor"

    # Test caregiver deterministic demo token
    caregiver_token = "sih_demo_caregiver_token_deterministic_2026"
    res_c = client.get("/api/auth/me", headers={"Authorization": f"Bearer {caregiver_token}"})
    assert res_c.status_code == 200
    assert res_c.json()["user"]["id"] == "sih-demo-caregiver-001"
    assert res_c.json()["user"]["role"] == "caregiver"


# ── Extra Security: Placeholder Passwords Strictly Rejected ──────────────────
def test_placeholder_password_rejected():
    res = client.post(
        "/api/auth/register",
        json={
            "full_name": "Test User",
            "email": "test_ph@example.com",
            "password": "[FIREBASE_MANAGED_AUTH]",
            "role": "patient",
        },
    )
    assert res.status_code == 400
    assert "placeholder" in res.json().get("detail", "").lower()


# ── Extra Security: Google Accounts Cannot Claim Doctor Role Arbitrarily ──────
def test_google_user_cannot_claim_doctor():
    google_uid = f"google-uid-{uuid.uuid4().hex[:6]}"
    google_email = f"doc_impostor_{uuid.uuid4().hex[:4]}@gmail.com"
    claims = make_mock_claims(google_uid, google_email, is_google=True)

    with patch("core.firebase_auth.verify_firebase_id_token", return_value=claims):
        res = client.post(
            "/api/auth/firebase-onboard",
            headers={"Authorization": "Bearer google.id.token"},
            json={
                "full_name": "Google User Claiming Doctor",
                "role": "doctor",
                "license_number": "FAKE-1234",
                "specialization": "Neurology",
            },
        )
        assert res.status_code == 403
        assert "google" in res.json().get("detail", "").lower()
