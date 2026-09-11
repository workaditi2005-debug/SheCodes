"""
auth_service.py — NeuroAid Authentication, Session Management, and RBAC
========================================================================
Handles user registration, login, hashed sessions, brute-force rate-limiting,
and doctor-patient care relationships.
Screening output is never a clinical diagnosis.
"""
from __future__ import annotations

import re
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import HTTPException

from core.rbac import Permission, Role, has_permission
from core import firebase_auth
from core.security import (
    create_session_token,
    dummy_verify_password,
    hash_password,
    hash_token,
    validate_password_strength,
    verify_password,
)
from core.settings import settings
from core.storage import results_store, sessions_store, users_store
from services.audit_service import record

EMAIL_RE = re.compile(r"^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$")
CLINICAL_FIELDS = [
    "age",
    "phone",
    "gender",
    "handedness",
    "education",
    "occupation",
    "medicalHistory",
    "currentMeds",
    "priorHeadInjury",
    "exerciseFreq",
    "smokingStatus",
    "alcoholUse",
    "sleepHours",
    "sleepQuality",
    "depressionHistory",
    "anxietyHistory",
    "familyHistory",
    "familyHistoryDetails",
    "existingDiagnosis",
    "cognitiveComplaints",
    "baselineTestDate",
]

# In-memory failed login attempts tracker: email -> list of attempt datetimes
_FAILED_ATTEMPTS: Dict[str, List[datetime]] = {}


def utcnow_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def _parse_iso(dt_str: Optional[str]) -> Optional[datetime]:
    if not dt_str:
        return None
    try:
        return datetime.fromisoformat(dt_str)
    except (ValueError, TypeError):
        return None


def safe_user(user: Dict[str, Any], include_private: bool = True) -> Dict[str, Any]:
    """Sanitize user dict to prevent credential or internal queue leakage."""
    excluded = {"password_hash"}
    if not include_private:
        excluded.update({"pending_requests", "patient_list"})
    return {key: value for key, value in user.items() if key not in excluded}


def get_users() -> Dict[str, Dict[str, Any]]:
    return users_store.read()


def get_sessions() -> Dict[str, Dict[str, Any]]:
    return sessions_store.read()


def _check_rate_limit(email: str) -> None:
    now = datetime.now(timezone.utc)
    attempts = _FAILED_ATTEMPTS.get(email, [])
    cutoff = now.timestamp() - settings.lockout_duration_seconds
    valid_attempts = [t for t in attempts if t.timestamp() > cutoff]
    _FAILED_ATTEMPTS[email] = valid_attempts

    if len(valid_attempts) >= settings.max_login_attempts:
        record(
            event="auth.login.locked",
            actor_id=email,
            outcome="locked",
            metadata={"attempts_count": len(valid_attempts)},
        )
        raise HTTPException(
            status_code=429,
            detail=(
                f"Account temporarily locked due to repeated failed login attempts. "
                f"Please wait {max(1, settings.lockout_duration_seconds // 60)} minutes."
            ),
        )


def _record_failed_attempt(email: str) -> None:
    now = datetime.now(timezone.utc)
    _FAILED_ATTEMPTS.setdefault(email, []).append(now)


def _clear_failed_attempts(email: str) -> None:
    _FAILED_ATTEMPTS.pop(email, None)


def get_user_from_token(token: str) -> Optional[Dict[str, Any]]:
    """
    Resolve user from authentication token:
    1. Isolated SIH deterministic demo mode bypass.
    2. Real Firebase ID token cryptographic verification & mapping.
    3. Legacy session token validation (temporary backward compatibility).
    """
    if not token:
        return None

    # 1. Isolated SIH deterministic demo mode
    if token in firebase_auth.SIH_DEMO_TOKENS:
        return get_users().get(firebase_auth.SIH_DEMO_TOKENS[token])

    # 2. Check if token is a Firebase ID token (JWT format with 3 segments)
    if token.count(".") == 2:
        try:
            claims = firebase_auth.verify_firebase_id_token(token)
            return firebase_auth.resolve_user_by_firebase_claims(claims)
        except Exception:
            return None

    # 3. Legacy session token validation (temporary backward compatibility)
    sessions = get_sessions()
    token_h = hash_token(token)
    session = sessions.get(token_h) or sessions.get(token)
    matched_key = token_h if token_h in sessions else (token if token in sessions else None)

    if not session or not matched_key:
        return None

    now = datetime.now(timezone.utc)

    # 3a. Enforce absolute session TTL
    created_at = _parse_iso(session.get("created_at"))
    if created_at and (now - created_at).total_seconds() > settings.session_ttl_seconds:
        del sessions[matched_key]
        sessions_store.write(sessions)
        return None

    # 3b. Enforce idle inactivity timeout
    last_active = _parse_iso(session.get("last_active") or session.get("created_at"))
    if last_active and (now - last_active).total_seconds() > settings.session_idle_timeout_seconds:
        del sessions[matched_key]
        sessions_store.write(sessions)
        return None

    # 3c. Slide last_active timestamp
    session["last_active"] = utcnow_iso()
    sessions[matched_key] = session
    sessions_store.write(sessions)

    return get_users().get(session["user_id"])


extract_bearer_token = firebase_auth.extract_bearer_token


def require_user(authorization: str) -> Dict[str, Any]:
    token = extract_bearer_token(authorization)

    # 1. Isolated SIH deterministic demo mode
    if token in firebase_auth.SIH_DEMO_TOKENS:
        demo_user = get_users().get(firebase_auth.SIH_DEMO_TOKENS[token])
        if demo_user:
            return demo_user
        raise HTTPException(status_code=401, detail="Demo user record not found. Please re-seed demo.")

    # 2. Real Firebase ID token (JWT format with 3 segments)
    if token.count(".") == 2:
        claims = firebase_auth.verify_firebase_id_token(token)
        user = firebase_auth.resolve_user_by_firebase_claims(claims)
        if not user:
            raise HTTPException(
                status_code=401,
                detail="NeuroAid profile not found for this account. Please complete profile onboarding.",
            )
        return user

    # 3. Legacy session tokens (migration fallback)
    user = get_user_from_token(token)
    if not user:
        raise HTTPException(
            status_code=401,
            detail="Unauthorized: Invalid or expired authentication credentials.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


def require_doctor(authorization: str) -> Dict[str, Any]:
    user = require_user(authorization)
    if user.get("role") != "doctor":
        record(
            event="auth.forbidden",
            actor_id=user["id"],
            actor_role=user.get("role"),
            outcome="forbidden",
            metadata={"required_role": "doctor"},
        )
        raise HTTPException(status_code=403, detail="Doctors only.")
    return user


def require_care_team(authorization: str) -> Dict[str, Any]:
    user = require_user(authorization)
    if user.get("role") not in {"doctor", "caregiver", "admin"}:
        record(
            event="auth.forbidden",
            actor_id=user["id"],
            actor_role=user.get("role"),
            outcome="forbidden",
            metadata={"required_role": "care_team"},
        )
        raise HTTPException(status_code=403, detail="Care-team access required.")
    return user


def register_user(payload: Any) -> Dict[str, Any]:
    email = payload.email.strip().lower()
    role = payload.role.strip().lower()

    if not EMAIL_RE.match(email):
        raise HTTPException(status_code=400, detail="Please enter a valid email address.")
    if role not in {"patient", "doctor", "caregiver"}:
        raise HTTPException(status_code=400, detail="Role must be 'patient', 'caregiver', or 'doctor'.")

    # Reject placeholder passwords explicitly (Section 8 requirement)
    if "[FIREBASE" in getattr(payload, "password", "").upper():
        raise HTTPException(
            status_code=400,
            detail="Placeholder credentials rejected. Use authenticated Firebase onboarding via /api/auth/firebase-onboard.",
        )

    # Enforce password strength
    valid_pwd, pwd_msg = validate_password_strength(payload.password)
    if not valid_pwd:
        raise HTTPException(status_code=400, detail=pwd_msg)

    users = get_users()
    for user in users.values():
        if user["email"].lower() == email and user.get("role", "patient") == role:
            raise HTTPException(status_code=400, detail="Email already registered for this role.")

    user_id = str(uuid.uuid4())
    now = utcnow_iso()
    new_user = {
        "id": user_id,
        "full_name": payload.full_name.strip(),
        "email": email,
        "password_hash": hash_password(payload.password),
        "role": role,
        "age": payload.age,
        "gender": payload.gender,
        "phone": payload.phone,
        "license_number": payload.license_number if role == "doctor" else None,
        "created_at": now,
        "last_login": now,
    }
    if role in {"doctor", "caregiver"}:
        new_user.update(
            {
                "specialization": payload.specialization if role == "doctor" else "Caregiver",
                "hospital": payload.hospital,
                "location": payload.location,
                "years_experience": payload.years_experience,
                "consultation_mode": payload.consultation_mode or "Both",
                "bio": payload.bio,
                "max_patients": payload.max_patients or 10,
                "current_patients": 0,
                "patient_list": [],
                "pending_requests": [],
            }
        )

    users[user_id] = new_user
    users_store.write(users)

    token = create_session_for_user(user_id)
    record(
        event="auth.register",
        actor_id=user_id,
        actor_role=role,
        subject_id=user_id,
        outcome="success",
        metadata={"role": role},
    )
    return {"message": "Registration successful!", "token": token, "user": safe_user(new_user)}


def login_user(payload: Any) -> Dict[str, Any]:
    email = payload.email.strip().lower()
    role = payload.role.strip().lower()

    _check_rate_limit(email)

    users = get_users()
    matched_id = None
    matched_user = None
    for user_id, user in users.items():
        if user["email"].lower() == email:
            matched_id = user_id
            matched_user = user
            break

    # Timing-attack mitigation: compute dummy PBKDF2 if user not found
    if not matched_user:
        dummy_verify_password()
        _record_failed_attempt(email)
        record(
            event="auth.login.failure",
            actor_id=email,
            outcome="failed",
            metadata={"reason": "user_not_found"},
        )
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    valid_password, should_upgrade = verify_password(payload.password, matched_user.get("password_hash", ""))
    if not valid_password:
        _record_failed_attempt(email)
        record(
            event="auth.login.failure",
            actor_id=matched_id,
            actor_role=matched_user.get("role"),
            outcome="failed",
            metadata={"reason": "invalid_password"},
        )
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    if matched_user.get("role", "patient") != role:
        _record_failed_attempt(email)
        if role == "doctor":
            raise HTTPException(status_code=403, detail="This account is registered as a Patient. Please use the Patient panel.")
        raise HTTPException(status_code=403, detail="This account is registered as a Doctor. Please use the Doctor panel.")

    # Successful login: clear failed attempts
    _clear_failed_attempts(email)

    users[matched_id]["last_login"] = utcnow_iso()
    if should_upgrade:
        users[matched_id]["password_hash"] = hash_password(payload.password)
    users_store.write(users)

    token = create_session_for_user(matched_id)
    record(
        event="auth.login.success",
        actor_id=matched_id,
        actor_role=matched_user.get("role"),
        subject_id=matched_id,
        outcome="success",
    )
    return {"message": "Login successful!", "token": token, "user": safe_user(users[matched_id])}


def create_session_for_user(user_id: str) -> str:
    """
    Generate a cryptographically secure random session token,
    and persist only its SHA-256 hash in sessions storage.
    """
    sessions = get_sessions()
    raw_token = create_session_token()
    token_h = hash_token(raw_token)
    now = utcnow_iso()
    sessions[token_h] = {
        "user_id": user_id,
        "created_at": now,
        "last_active": now,
    }
    sessions_store.write(sessions)
    return raw_token


def logout_user(authorization: str) -> Dict[str, str]:
    token = extract_bearer_token(authorization)
    token_h = hash_token(token)
    sessions = get_sessions()

    target_key = token_h if token_h in sessions else (token if token in sessions else None)
    if target_key:
        user_id = sessions[target_key].get("user_id")
        del sessions[target_key]
        sessions_store.write(sessions)
        record(
            event="auth.logout",
            actor_id=user_id,
            outcome="success",
        )
        return {"message": "Logged out successfully."}

    # Firebase ID token or demo token graceful clearance
    user_id = None
    try:
        if token.count(".") == 2:
            claims = firebase_auth.verify_firebase_id_token(token)
            if claims:
                resolved = firebase_auth.resolve_user_by_firebase_claims(claims)
                user_id = resolved["id"] if resolved else (claims.get("uid") or claims.get("sub"))
    except Exception:
        pass

    record(
        event="auth.logout",
        actor_id=user_id or "unknown",
        outcome="success",
    )
    return {"message": "Logged out successfully."}


def verify_doctor_patient_relationship(care_member_id: str, patient_id: str) -> bool:
    """
    Confirm whether care member (doctor or caregiver) has an authorized,
    enrolled care relationship with patient_id.
    """
    users = get_users()
    care_member = users.get(care_member_id)
    if not care_member:
        return False
    if care_member.get("role") == "admin":
        return True
    if patient_id in care_member.get("patient_list", []):
        return True
    patient = users.get(patient_id)
    if patient and (
        patient.get("assigned_doctor_id") == care_member_id
        or patient.get("caregiver_id") == care_member_id
        or patient.get("assigned_caregiver_id") == care_member_id
    ):
        return True
    return False


def update_basic_profile(user_id: str, updates: Dict[str, Any]) -> Dict[str, Any]:
    users = get_users()
    if user_id not in users:
        raise HTTPException(status_code=404, detail="User not found.")

    allowed = {
        "full_name",
        "age",
        "gender",
        "phone",
        "license_number",
        "specialization",
        "hospital",
        "location",
        "years_experience",
        "consultation_mode",
        "bio",
        "max_patients",
    }
    for key, value in updates.items():
        if key in allowed and value is not None:
            users[user_id][key] = value

    users_store.write(users)
    record(
        event="profile.basic_updated",
        actor_id=user_id,
        subject_id=user_id,
        outcome="success",
    )
    return safe_user(users[user_id])


def update_extended_profile(user_id: str, updates: Dict[str, Any]) -> Dict[str, Any]:
    users = get_users()
    if user_id not in users:
        raise HTTPException(status_code=404, detail="User not found.")

    for field in CLINICAL_FIELDS:
        if field in updates:
            users[user_id][field] = updates[field]

    users_store.write(users)
    record(
        event="profile.extended_updated",
        actor_id=user_id,
        subject_id=user_id,
        outcome="success",
    )
    return safe_user(users[user_id])


def list_patients_for_doctor(doctor_id: str) -> List[Dict[str, Any]]:
    users = get_users()
    all_results = results_store.read()
    doctor = users.get(doctor_id, {})
    enrolled_ids = set(doctor.get("patient_list", []))

    patients = []
    for user in users.values():
        if user.get("role") != "patient":
            continue
        if (
            user["id"] in enrolled_ids
            or user.get("assigned_doctor_id") == doctor_id
            or user.get("caregiver_id") == doctor_id
            or user.get("assigned_caregiver_id") == doctor_id
        ):
            patient = safe_user(user, include_private=False)
            history = all_results.get(user["id"], [])
            patient["sessionCount"] = len(history)
            patient["lastResult"] = history[-1] if history else None
            patients.append(patient)

    patients.sort(key=lambda item: item.get("last_login", ""), reverse=True)
    return patients


def list_doctors() -> List[Dict[str, Any]]:
    doctors = []
    for user in get_users().values():
        if user.get("role") == "doctor":
            doctor = safe_user(user, include_private=False)
            doctor["current_patients"] = len(user.get("patient_list", []))
            doctor["max_patients"] = user.get("max_patients", 10)
            doctors.append(doctor)
    return doctors


def find_user_by_identifier(identifier: Optional[str], users: Optional[Dict[str, Any]] = None) -> Optional[Dict[str, Any]]:
    """
    Resolve a user record by internal application UUID ('id'),
    Firebase UID ('firebase_uid'), or email address.
    Ensures identical canonical entity resolution across all portals and roles.
    """
    if not identifier or not isinstance(identifier, str) or not identifier.strip():
        return None
    ident = identifier.strip()
    if users is None:
        users = get_users()

    # 1. Direct primary key match (user["id"])
    if ident in users:
        return users[ident]

    # 2. Match by unique firebase_uid
    for u in users.values():
        if isinstance(u, dict) and u.get("firebase_uid") == ident:
            return u

    # 3. Match by verified email (case-insensitive)
    ident_lower = ident.lower()
    for u in users.values():
        if isinstance(u, dict) and u.get("email", "").strip().lower() == ident_lower:
            return u

    return None


def request_doctor_enrollment(patient_id: str, doctor_id: str) -> Dict[str, Any]:
    users = get_users()
    patient = find_user_by_identifier(patient_id, users)
    doctor = find_user_by_identifier(doctor_id, users)

    if not patient:
        raise HTTPException(status_code=404, detail="Patient profile not found.")
    if not doctor or doctor.get("role") != "doctor":
        raise HTTPException(status_code=404, detail="Doctor not found.")

    canonical_doc_id = doctor["id"]
    canonical_pat_id = patient["id"]

    # Check capacity against approved patients
    approved_count = len(doctor.get("patient_list", []))
    max_p = doctor.get("max_patients", 10)
    if approved_count >= max_p:
        raise HTTPException(status_code=400, detail="This doctor has reached maximum patient capacity.")

    # Check if already enrolled
    if canonical_pat_id in doctor.get("patient_list", []) or patient.get("assigned_doctor_id") == canonical_doc_id:
        raise HTTPException(status_code=400, detail="You are already enrolled with this doctor.")

    # Check if request is already pending (safe against malformed records)
    pending_list = doctor.get("pending_requests", [])
    for request in pending_list:
        if isinstance(request, dict):
            req_pat_id = request.get("patient_id") or request.get("patient_uid")
            if req_pat_id in (canonical_pat_id, patient.get("firebase_uid")):
                raise HTTPException(status_code=400, detail="Your enrollment request is already pending.")

    # Append request with canonical identities and explicit pending status
    request_record = {
        "patient_id": canonical_pat_id,
        "patient_uid": patient.get("firebase_uid"),
        "patient_name": patient.get("full_name") or "Patient",
        "patient_email": patient.get("email") or "",
        "doctor_id": canonical_doc_id,
        "status": "pending",
        "requested_at": utcnow_iso(),
    }
    doctor.setdefault("pending_requests", []).append(request_record)
    patient["pending_doctor_id"] = canonical_doc_id

    # Persist back under canonical primary keys
    users[canonical_doc_id] = doctor
    users[canonical_pat_id] = patient
    users_store.write(users)

    # In-app notification for the doctor
    try:
        from core.storage import messages_store
        msgs = messages_store.read()
        if isinstance(msgs, list):
            msgs.append({
                "id": str(uuid.uuid4()),
                "sender_id": canonical_pat_id,
                "sender_name": patient.get("full_name") or "Patient",
                "sender_role": "patient",
                "recipient_id": canonical_doc_id,
                "text": f"New Patient Connection Request: {patient.get('full_name')} ({patient.get('email', '')}) has requested you as their supervising neurologist.",
                "timestamp": utcnow_iso(),
                "deleted_by": [],
                "type": "enrollment_request",
            })
            messages_store.write(msgs)
    except Exception:
        pass

    record(
        event="care_team.enrollment_requested",
        actor_id=canonical_pat_id,
        subject_id=canonical_doc_id,
        outcome="success",
    )
    return {"status": "pending", "message": "Enrollment request sent. Waiting for doctor approval.", "doctor": safe_user(doctor, include_private=False)}


def respond_to_enrollment_request(doctor_id: str, patient_id: str, action: str) -> Dict[str, str]:
    if action not in ("approve", "reject"):
        raise HTTPException(status_code=400, detail="action must be 'approve' or 'reject'.")

    users = get_users()
    doctor = find_user_by_identifier(doctor_id, users)
    if not doctor or doctor.get("role") != "doctor":
        raise HTTPException(status_code=404, detail="Doctor record not found.")

    patient = find_user_by_identifier(patient_id, users)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found.")

    canonical_doc_id = doctor["id"]
    canonical_pat_id = patient["id"]

    # Filter out the approved/rejected request safely (handles malformed entries)
    existing_requests = doctor.get("pending_requests", [])
    updated_requests = []
    for request in existing_requests:
        if not isinstance(request, dict):
            continue
        req_pat_id = request.get("patient_id") or request.get("patient_uid")
        if req_pat_id not in (canonical_pat_id, patient.get("firebase_uid")):
            updated_requests.append(request)
    doctor["pending_requests"] = updated_requests

    if action == "approve":
        doctor.setdefault("patient_list", [])
        if canonical_pat_id not in doctor["patient_list"]:
            doctor["patient_list"].append(canonical_pat_id)
        doctor["current_patients"] = len(doctor["patient_list"])
        patient["assigned_doctor_id"] = canonical_doc_id
        patient.pop("pending_doctor_id", None)
    elif action == "reject":
        patient.pop("pending_doctor_id", None)

    users[canonical_doc_id] = doctor
    users[canonical_pat_id] = patient
    users_store.write(users)
    verb = "approved" if action == "approve" else "rejected"

    # In-app notification for the patient
    try:
        from core.storage import messages_store
        msgs = messages_store.read()
        if isinstance(msgs, list):
            msgs.append({
                "id": str(uuid.uuid4()),
                "sender_id": canonical_doc_id,
                "sender_name": doctor.get("full_name") or "Doctor",
                "sender_role": "doctor",
                "recipient_id": canonical_pat_id,
                "text": f"Your enrollment request has been {verb} by Dr. {doctor.get('full_name')}.",
                "timestamp": utcnow_iso(),
                "deleted_by": [],
                "type": "enrollment_response",
            })
            messages_store.write(msgs)
    except Exception:
        pass

    record(
        event=f"care_team.enrollment_{action}d",
        actor_id=canonical_doc_id,
        subject_id=canonical_pat_id,
        outcome="success",
        metadata={"action": action},
    )
    return {"message": f"Patient {verb} successfully."}


def get_my_doctor_payload(patient_id: str) -> Dict[str, Any]:
    users = get_users()
    patient = find_user_by_identifier(patient_id, users)
    payload = {"doctor": None, "pending_doctor": None}
    if not patient:
        return payload

    assigned_id = patient.get("assigned_doctor_id")
    pending_id = patient.get("pending_doctor_id")

    if assigned_id:
        doc = find_user_by_identifier(assigned_id, users)
        if doc and doc.get("role") == "doctor":
            d = safe_user(doc, include_private=False)
            d["current_patients"] = len(doc.get("patient_list", []))
            payload["doctor"] = d

    if pending_id:
        p_doc = find_user_by_identifier(pending_id, users)
        if p_doc and p_doc.get("role") == "doctor":
            payload["pending_doctor"] = safe_user(p_doc, include_private=False)

    return payload


def get_pending_requests(doctor_id: str) -> List[Dict[str, Any]]:
    users = get_users()
    doctor = find_user_by_identifier(doctor_id, users)
    if not doctor or doctor.get("role") != "doctor":
        return []

    raw_requests = doctor.get("pending_requests", [])
    valid_requests = []
    canonical_doc_id = doctor["id"]

    for req in raw_requests:
        if not isinstance(req, dict):
            continue
        p_id = req.get("patient_id") or req.get("patient_uid")
        if not p_id:
            continue

        p_user = find_user_by_identifier(p_id, users)
        p_name = req.get("patient_name") or (p_user.get("full_name") if p_user else "Patient")
        p_email = req.get("patient_email") or (p_user.get("email") if p_user else "")
        canonical_p_id = p_user["id"] if p_user else p_id

        valid_requests.append({
            "patient_id": canonical_p_id,
            "patient_uid": p_user.get("firebase_uid") if p_user else req.get("patient_uid"),
            "patient_name": p_name,
            "patient_email": p_email,
            "doctor_id": canonical_doc_id,
            "status": req.get("status", "pending"),
            "requested_at": req.get("requested_at") or utcnow_iso(),
        })

    return valid_requests


def create_or_link_firebase_profile(authorization: str, payload: Any) -> Dict[str, Any]:
    """
    Create or link a NeuroAid profile using verified Firebase ID token credentials.
    Extracts verified UID and email from token.
    Enforces that Google sign-in accounts cannot arbitrarily claim doctor/admin privileges.
    """
    token = firebase_auth.extract_bearer_token(authorization)
    claims = firebase_auth.verify_firebase_id_token(token)

    firebase_uid = claims.get("uid") or claims.get("sub")
    if not firebase_uid:
        raise HTTPException(status_code=401, detail="Invalid Firebase token: Missing UID.")

    email = claims.get("email", "").strip().lower()
    full_name = getattr(payload, "full_name", "").strip() or claims.get("name", "").strip() or (email.split("@")[0] if email else "User")
    role = getattr(payload, "role", "patient").strip().lower()

    if role not in {"patient", "doctor", "caregiver"}:
        raise HTTPException(status_code=400, detail="Role must be 'patient', 'caregiver', or 'doctor'.")

    # Guard: Google users cannot arbitrarily assign doctor/admin privileges
    sign_in_provider = claims.get("firebase", {}).get("sign_in_provider")
    if sign_in_provider == "google.com" and role in {"doctor", "admin"}:
        raise HTTPException(
            status_code=403,
            detail="Google accounts cannot register directly as doctors without clinical credential verification.",
        )

    users = get_users()

    # 1. Check if user already exists with this firebase_uid
    for uid, existing in users.items():
        if existing.get("firebase_uid") == firebase_uid:
            updated = False
            for field in ("hospital", "location", "consultation_mode", "bio", "years_experience", "specialization", "license_number", "phone"):
                val = getattr(payload, field, None)
                if val is not None and str(val).strip():
                    existing[field] = val
                    updated = True
            if updated:
                users[uid] = existing
                users_store.write(users)
            return {"message": "Profile already exists.", "user": safe_user(existing)}

    # 2. Check if user exists by verified email and link
    if email:
        for uid, existing in users.items():
            if existing.get("email", "").strip().lower() == email:
                existing["firebase_uid"] = firebase_uid
                for field in ("hospital", "location", "consultation_mode", "bio", "years_experience", "specialization", "license_number", "phone"):
                    val = getattr(payload, field, None)
                    if val is not None and str(val).strip():
                        existing[field] = val
                users[uid] = existing
                users_store.write(users)
                record(
                    event="auth.firebase_profile_linked",
                    actor_id=uid,
                    actor_role=existing.get("role", "patient"),
                    outcome="success",
                    metadata={"firebase_uid": firebase_uid, "email": email},
                )
                return {"message": "Existing profile linked with Firebase.", "user": safe_user(existing)}

    # Doctor validation
    if role == "doctor":
        if not getattr(payload, "license_number", None) or not str(payload.license_number).strip():
            raise HTTPException(status_code=400, detail="Medical license number is required for doctor accounts.")
        if not getattr(payload, "specialization", None) or not str(payload.specialization).strip():
            raise HTTPException(status_code=400, detail="Specialization is required for doctor accounts.")

    user_id = str(uuid.uuid4())
    now = utcnow_iso()
    new_user = {
        "id": user_id,
        "firebase_uid": firebase_uid,
        "full_name": full_name,
        "email": email,
        "role": role,
        "age": getattr(payload, "age", None),
        "gender": getattr(payload, "gender", None),
        "phone": getattr(payload, "phone", None),
        "license_number": getattr(payload, "license_number", None) if role == "doctor" else None,
        "created_at": now,
        "last_login": now,
    }
    if role in {"doctor", "caregiver"}:
        new_user.update({
            "specialization": getattr(payload, "specialization", None) if role == "doctor" else "Caregiver",
            "hospital": getattr(payload, "hospital", None),
            "location": getattr(payload, "location", None),
            "years_experience": getattr(payload, "years_experience", None),
            "consultation_mode": getattr(payload, "consultation_mode", "Both"),
            "bio": getattr(payload, "bio", None),
            "max_patients": getattr(payload, "max_patients", 10),
            "current_patients": 0,
            "patient_list": [],
            "pending_requests": [],
        })

    users[user_id] = new_user
    users_store.write(users)

    record(
        event="auth.firebase_profile_created",
        actor_id=user_id,
        actor_role=role,
        outcome="success",
        metadata={"firebase_uid": firebase_uid, "email": email},
    )

    return {"message": "Profile created successfully!", "user": safe_user(new_user)}
