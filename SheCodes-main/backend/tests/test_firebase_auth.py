"""
test_firebase_auth.py — Comprehensive Test Suite for Backend Firebase Authentication
=====================================================================================
Covers all Firebase project ID and authentication verification requirements:
 1. Authoritative Firebase project ID is neuroaid-sih-2026
 2. Missing Authorization header → 401/422
 3. Malformed Authorization header → 401
 4. Malformed JWT structure (not 3-part) → 401
 5. Invalid / unverified Firebase token → 401
 6. Expired Firebase token → 401
 7. Token from wrong Firebase project → rejected (401)
 8. Token with wrong audience → rejected (401)
 9. Token with wrong issuer → rejected (401)
10. Token with project display name "NeuroAid-SIH-2026" instead of project ID → rejected (401)
11. Valid Firebase identity for neuroaid-sih-2026 → accepted (200)
12. Unknown Firebase UID → handled safely (401 profile not found)
13. Existing NeuroAid user with firebase_uid → correctly resolved
14. Patient RBAC enforcement
15. Caregiver RBAC enforcement
16. Doctor RBAC enforcement
17. Admin RBAC enforcement
18. Cross-patient access → rejected (403)
19. SIH demo mode → isolated and works deterministically (patient, doctor, caregiver)
20. Placeholder password rejection verification
21. Google doctor privilege escalation rejection
22. Direct unit validation of require_admin, require_patient, require_caregiver
"""
from __future__ import annotations

import os
import uuid
import pytest
from unittest.mock import patch, MagicMock
from fastapi import HTTPException
from fastapi.testclient import TestClient

from main import app
from core.settings import settings
from core.storage import users_store
from core.firebase_auth import (
    SIH_DEMO_TOKENS,
    extract_bearer_token,
    verify_firebase_id_token,
    _validate_claims_project,
    resolve_user_by_firebase_claims,
    require_admin,
    require_patient,
    require_caregiver,
    require_doctor,
    require_care_team,
)
from services import auth_service

client = TestClient(app)

PROJECT_ID = settings.firebase_project_id  # authoritative: "neuroaid-sih-2026"


# ── Fixtures & Mock Helpers ───────────────────────────────────────────────────

def make_mock_claims(
    uid: str,
    email: str,
    project_id: str = PROJECT_ID,
    is_google: bool = False,
    aud: str | None = None,
    iss: str | None = None,
):
    target_aud = aud if aud is not None else project_id
    target_iss = iss if iss is not None else f"https://securetoken.google.com/{project_id}"
    return {
        "uid": uid,
        "sub": uid,
        "email": email,
        "name": f"User {uid[:6]}",
        "aud": target_aud,
        "iss": target_iss,
        "firebase": {
            "sign_in_provider": "google.com" if is_google else "password",
            "project_id": project_id,
        },
    }


# ── Test 0: Verify Authoritative Project ID ──────────────────────────────────
def test_authoritative_project_id_is_neuroaid_sih_2026():
    assert settings.firebase_project_id == "neuroaid-sih-2026"
    assert PROJECT_ID == "neuroaid-sih-2026"


# ── Test 1: Missing Authorization Header ─────────────────────────────────────
def test_1_missing_authorization_header_returns_401_or_422():
    response = client.get("/api/auth/me")
    assert response.status_code in (401, 422)


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


# ── Test 3: Malformed JWT Structure (not 3 parts) ────────────────────────────
def test_3_malformed_jwt_structure_rejected():
    with pytest.raises(HTTPException) as exc_info:
        verify_firebase_id_token("not-a-valid-jwt")
    assert exc_info.value.status_code == 401
    assert "malformed" in exc_info.value.detail.lower()

    with pytest.raises(HTTPException) as exc_info2:
        verify_firebase_id_token("header.payload")  # only 2 parts
    assert exc_info2.value.status_code == 401
    assert "malformed" in exc_info2.value.detail.lower()

    with pytest.raises(HTTPException) as exc_info3:
        verify_firebase_id_token("")  # empty
    assert exc_info3.value.status_code == 401


# ── Test 4: Invalid Firebase Token ───────────────────────────────────────────
def test_4_invalid_firebase_token_returns_401():
    res = client.get("/api/auth/me", headers={"Authorization": "Bearer invalid.fake.token"})
    assert res.status_code == 401
    assert "invalid" in res.json().get("detail", "").lower() or "unauthorized" in res.json().get("detail", "").lower()


# ── Test 5: Expired Firebase Token ───────────────────────────────────────────
def test_5_expired_firebase_token_returns_401():
    with patch("core.firebase_auth.verify_firebase_id_token") as mock_verify:
        mock_verify.side_effect = HTTPException(status_code=401, detail="Authentication token has expired. Please sign in again.")

        res = client.get("/api/auth/me", headers={"Authorization": "Bearer expired.jwt.token"})
        assert res.status_code == 401
        assert "expired" in res.json().get("detail", "").lower()


# ── Test 6: Token from Wrong Firebase Project ────────────────────────────────
def test_6_token_from_wrong_project_rejected():
    # Direct claims validator check
    wrong_project_claims = make_mock_claims(
        uid="u-wrong-proj",
        email="wrong@example.com",
        project_id="foreign-project-1234",
    )
    with pytest.raises(HTTPException) as exc_info:
        _validate_claims_project(wrong_project_claims, expected_project="neuroaid-sih-2026")
    assert exc_info.value.status_code == 401

    # API endpoint check with mock
    with patch("core.firebase_auth.verify_firebase_id_token") as mock_verify:
        mock_verify.side_effect = HTTPException(status_code=401, detail="Token not issued for this Firebase project.")

        res = client.get("/api/auth/me", headers={"Authorization": "Bearer foreign.project.token"})
        assert res.status_code == 401
        assert "not issued for this firebase project" in res.json().get("detail", "").lower() or "wrong" in res.json().get("detail", "").lower()


# ── Test 7: Wrong Audience Rejected ──────────────────────────────────────────
def test_7_wrong_audience_rejected():
    wrong_aud_claims = make_mock_claims(
        uid="u-wrong-aud",
        email="aud@example.com",
        project_id="neuroaid-sih-2026",
        aud="malicious-client-id",
    )
    with pytest.raises(HTTPException) as exc_info:
        _validate_claims_project(wrong_aud_claims, expected_project="neuroaid-sih-2026")
    assert exc_info.value.status_code == 401
    assert "audience" in exc_info.value.detail.lower()


# ── Test 8: Wrong Issuer Rejected ────────────────────────────────────────────
def test_8_wrong_issuer_rejected():
    wrong_iss_claims = make_mock_claims(
        uid="u-wrong-iss",
        email="iss@example.com",
        project_id="neuroaid-sih-2026",
        iss="https://accounts.google.com",
    )
    with pytest.raises(HTTPException) as exc_info:
        _validate_claims_project(wrong_iss_claims, expected_project="neuroaid-sih-2026")
    assert exc_info.value.status_code == 401
    assert "issuer" in exc_info.value.detail.lower()


# ── Test 9: Display Name NeuroAid-SIH-2026 Rejected as Audience/Project ID ────
def test_9_project_display_name_rejected_as_audience():
    # If a token has aud="NeuroAid-SIH-2026" (the display name) instead of "neuroaid-sih-2026",
    # it must be strictly rejected.
    display_name_claims = {
        "uid": "u-display-name",
        "sub": "u-display-name",
        "email": "display@example.com",
        "aud": "NeuroAid-SIH-2026",
        "iss": "https://securetoken.google.com/NeuroAid-SIH-2026",
        "firebase": {"project_id": "NeuroAid-SIH-2026"},
    }
    with pytest.raises(HTTPException) as exc_info:
        _validate_claims_project(display_name_claims, expected_project="neuroaid-sih-2026")
    assert exc_info.value.status_code == 401


# ── Test 10: Valid Firebase Claims for neuroaid-sih-2026 Accepted ────────────
def test_10_valid_claims_for_neuroaid_sih_2026_accepted():
    valid_claims = make_mock_claims(
        uid="u-valid-sih",
        email="valid@neuroaid.internal",
        project_id="neuroaid-sih-2026",
    )
    # Should not raise any exception
    _validate_claims_project(valid_claims, expected_project="neuroaid-sih-2026")


# ── Test 11: Valid Firebase Identity Accepted on /api/auth/me ────────────────
def test_11_valid_firebase_identity_accepted():
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

    claims = make_mock_claims(test_uid, test_email, project_id="neuroaid-sih-2026")

    with patch("core.firebase_auth.verify_firebase_id_token", return_value=claims):
        res = client.get("/api/auth/me", headers={"Authorization": "Bearer valid.firebase.token"})
        assert res.status_code == 200
        data = res.json()
        assert data["user"]["id"] == internal_id
        assert data["user"]["firebase_uid"] == test_uid
        assert data["user"]["email"] == test_email


# ── Test 12: Unknown Firebase UID Handled Safely ─────────────────────────────
def test_12_unknown_firebase_uid_handled_safely():
    unknown_uid = f"fb-unknown-{uuid.uuid4().hex[:8]}"
    unknown_email = f"unknown_{uuid.uuid4().hex[:6]}@unknown.com"

    claims = make_mock_claims(unknown_uid, unknown_email, project_id="neuroaid-sih-2026")

    with patch("core.firebase_auth.verify_firebase_id_token", return_value=claims):
        res = client.get("/api/auth/me", headers={"Authorization": "Bearer valid.but.unregistered"})
        assert res.status_code == 401
        assert "onboarding" in res.json().get("detail", "").lower() or "not found" in res.json().get("detail", "").lower()


# ── Test 13: Existing NeuroAid User with firebase_uid Correctly Resolved ──────
def test_13_existing_user_linked_and_resolved():
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

    claims = make_mock_claims(test_uid, test_email, project_id="neuroaid-sih-2026")

    # Resolution should link firebase_uid automatically
    with patch("core.firebase_auth.verify_firebase_id_token", return_value=claims):
        res = client.get("/api/auth/me", headers={"Authorization": "Bearer valid.token.legacy"})
        assert res.status_code == 200
        assert res.json()["user"]["id"] == internal_id

    # Verify persistent linking
    updated_users = users_store.read()
    assert updated_users[internal_id].get("firebase_uid") == test_uid


# ── Test 14: Patient RBAC Enforcement ────────────────────────────────────────
def test_14_patient_rbac_blocked_from_doctor_endpoints():
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

    claims = make_mock_claims(p_uid, p_email, project_id="neuroaid-sih-2026")

    with patch("core.firebase_auth.verify_firebase_id_token", return_value=claims):
        # Patient can access their own profile
        res_me = client.get("/api/auth/me", headers={"Authorization": "Bearer tok.patient.jwt"})
        assert res_me.status_code == 200

        # Patient CANNOT access doctor endpoint /api/auth/patients
        res_doc = client.get("/api/auth/patients", headers={"Authorization": "Bearer tok.patient.jwt"})
        assert res_doc.status_code == 403


# ── Test 15: Caregiver RBAC Enforcement ──────────────────────────────────────
def test_15_caregiver_rbac():
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

    claims = make_mock_claims(cg_uid, cg_email, project_id="neuroaid-sih-2026")

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


# ── Test 16: Doctor RBAC Enforcement ─────────────────────────────────────────
def test_16_doctor_rbac():
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

    claims = make_mock_claims(doc_uid, doc_email, project_id="neuroaid-sih-2026")

    with patch("core.firebase_auth.verify_firebase_id_token", return_value=claims):
        res_patients = client.get("/api/auth/patients", headers={"Authorization": "Bearer tok.doc.jwt"})
        assert res_patients.status_code == 200


# ── Test 17: Admin RBAC Enforcement ──────────────────────────────────────────
def test_17_admin_rbac():
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

    claims = make_mock_claims(adm_uid, adm_email, project_id="neuroaid-sih-2026")

    with patch("core.firebase_auth.verify_firebase_id_token", return_value=claims):
        # Admin is treated as care-team member
        res = client.get("/api/auth/patients", headers={"Authorization": "Bearer tok.adm.jwt"})
        assert res.status_code == 200


# ── Test 18: Cross-Patient Access Rejected ───────────────────────────────────
def test_18_cross_patient_access_rejected():
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

    claims = make_mock_claims(doc1_uid, "unassigned@neuroaid.test", project_id="neuroaid-sih-2026")

    with patch("core.firebase_auth.verify_firebase_id_token", return_value=claims):
        # Attempting to fetch reminders or results for unassigned patient must be rejected
        res = client.get(f"/api/reminders?patient_id={patient_id}", headers={"Authorization": "Bearer tok.doc.jwt"})
        assert res.status_code == 403


# ── Test 19: SIH Deterministic Demo Mode Still Works ─────────────────────────
def test_19_sih_demo_mode_isolated_and_works():
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


# ── Test 20: Direct RBAC Dependencies Unit Verification ──────────────────────
def test_20_direct_rbac_dependencies():
    # Test require_admin, require_patient, require_caregiver, require_doctor
    with patch("core.firebase_auth.get_current_user") as mock_get_user:
        mock_get_user.return_value = {"id": "admin-1", "role": "admin"}
        assert require_admin(authorization="Bearer fake.admin.jwt")["role"] == "admin"
        with pytest.raises(HTTPException) as exc_info:
            require_patient(authorization="Bearer fake.admin.jwt")
        assert exc_info.value.status_code == 403

        mock_get_user.return_value = {"id": "patient-1", "role": "patient"}
        assert require_patient(authorization="Bearer fake.pat.jwt")["role"] == "patient"
        with pytest.raises(HTTPException) as exc_info2:
            require_admin(authorization="Bearer fake.pat.jwt")
        assert exc_info2.value.status_code == 403

        mock_get_user.return_value = {"id": "cg-1", "role": "caregiver"}
        assert require_caregiver(authorization="Bearer fake.cg.jwt")["role"] == "caregiver"
        with pytest.raises(HTTPException) as exc_info3:
            require_doctor(authorization="Bearer fake.cg.jwt")
        assert exc_info3.value.status_code == 403


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
    claims = make_mock_claims(google_uid, google_email, project_id="neuroaid-sih-2026", is_google=True)

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
