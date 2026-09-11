"""
core/firebase_auth.py — Real Firebase Authentication Verification Layer
========================================================================
Verifies Firebase ID tokens issued for the real project: neuroaid-sih-2026.
Extracts verified Firebase identity, maps firebase_uid to internal NeuroAid
users, enforces RBAC, and securely isolates deterministic SIH demo mode.
"""
from __future__ import annotations

import logging
import os
from typing import Any, Dict, Optional

from fastapi import Header, HTTPException
import firebase_admin
from firebase_admin import auth as fb_admin_auth, credentials
from google.auth.exceptions import DefaultCredentialsError
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token as google_id_token

from core.settings import settings
from core.storage import users_store
from utils.logger import log_error, log_info

logger = logging.getLogger(__name__)

# ── Isolated SIH Deterministic Demo Tokens ────────────────────────────────────
# Isolated bypass strictly reserved for the 3 deterministic judges demo personas.
SIH_DEMO_TOKENS: Dict[str, str] = {
    "sih_demo_patient_token_deterministic_2026": "sih-demo-patient-001",
    "sih_demo_doctor_token_deterministic_2026": "sih-demo-doctor-001",
    "sih_demo_caregiver_token_deterministic_2026": "sih-demo-caregiver-001",
}

_firebase_app: Optional[firebase_admin.App] = None
_has_admin_credentials: bool = False


def init_firebase_admin() -> Optional[firebase_admin.App]:
    """
    Initialize Firebase Admin SDK exactly once.
    Checks for service-account credentials path or Application Default Credentials (ADC).
    Falls back gracefully to public-key JWT verification for neuroaid-sih-2026 if local credentials
    are not yet configured.
    """
    global _firebase_app, _has_admin_credentials
    if _firebase_app is not None:
        return _firebase_app

    if firebase_admin._apps:
        _firebase_app = firebase_admin.get_app()
        _has_admin_credentials = True
        return _firebase_app

    project_id = settings.firebase_project_id
    cred_path = settings.firebase_credentials_path

    # 1. Explicit Service Account Certificate
    if cred_path and os.path.isfile(cred_path):
        try:
            cred = credentials.Certificate(cred_path)
            _firebase_app = firebase_admin.initialize_app(cred, options={"projectId": project_id})
            _has_admin_credentials = True
            log_info(f"Firebase Admin initialized with service account for project: {project_id}")
            return _firebase_app
        except Exception as exc:
            log_error(f"Failed to load Firebase credentials from {cred_path}: {exc}")

    # 2. Application Default Credentials (ADC)
    try:
        cred = credentials.ApplicationDefault()
        _firebase_app = firebase_admin.initialize_app(cred, options={"projectId": project_id})
        _has_admin_credentials = True
        log_info(f"Firebase Admin initialized with ADC for project: {project_id}")
        return _firebase_app
    except Exception:
        pass

    # 3. Initialize with project options (public cert verification fallback)
    try:
        _firebase_app = firebase_admin.initialize_app(options={"projectId": project_id})
        log_info(f"Firebase Admin initialized with project options: {project_id}")
    except Exception as exc:
        log_error(f"Failed to initialize Firebase Admin app: {exc}")

    return _firebase_app


# Initialize on module import
init_firebase_admin()


def extract_bearer_token(authorization: Optional[str]) -> str:
    """
    Extract and validate Bearer token from the Authorization header.
    Rejects missing, empty, or malformed headers.
    """
    if not authorization or not authorization.strip():
        raise HTTPException(
            status_code=401,
            detail="Authorization header missing or empty.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    parts = authorization.strip().split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(
            status_code=401,
            detail="Malformed Authorization header. Expected format: 'Bearer <token>'.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = parts[1].strip()
    if not token:
        raise HTTPException(
            status_code=401,
            detail="Bearer token cannot be blank.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return token


def verify_firebase_id_token(token: str) -> Dict[str, Any]:
    """
    Verify a Firebase ID token issued for the real project: neuroaid-sih-2026.
    Validates signature, expiration, issuer, and project audience.
    Rejects invalid, expired, foreign-project, or malformed tokens.
    """
    if not token or not isinstance(token, str) or not token.strip():
        raise HTTPException(status_code=401, detail="Invalid authentication token format.")

    segments = token.strip().split(".")
    if len(segments) != 3:
        raise HTTPException(status_code=401, detail="Malformed authentication token: expected a 3-part JWT.")

    expected_project = settings.firebase_project_id.strip()

    # Attempt 1: Official Firebase Admin SDK
    if _has_admin_credentials and _firebase_app is not None:
        try:
            claims = fb_admin_auth.verify_id_token(token, app=_firebase_app, check_revoked=False)
            _validate_claims_project(claims, expected_project)
            if "uid" not in claims:
                claims["uid"] = claims.get("user_id") or claims.get("sub")
            return claims
        except fb_admin_auth.ExpiredIdTokenError:
            raise HTTPException(status_code=401, detail="Authentication token has expired. Please sign in again.")
        except fb_admin_auth.InvalidIdTokenError:
            raise HTTPException(status_code=401, detail="Invalid authentication token.")
        except DefaultCredentialsError:
            # Fallback to public-key Google cert verification
            pass
        except Exception as exc:
            log_error(f"Firebase Admin token verification error: {exc.__class__.__name__}")
            raise HTTPException(status_code=401, detail="Authentication token verification failed.")

    # Attempt 2: Cryptographic verification using Google public certificates & google-auth
    try:
        req = google_requests.Request()
        claims = google_id_token.verify_firebase_token(
            token,
            request=req,
            audience=expected_project,
        )
        if not claims:
            raise HTTPException(status_code=401, detail="Invalid or expired authentication token.")

        _validate_claims_project(claims, expected_project)
        if "uid" not in claims:
            claims["uid"] = claims.get("user_id") or claims.get("sub")
        return claims
    except ValueError as exc:
        err_msg = str(exc).lower()
        if "expired" in err_msg:
            raise HTTPException(status_code=401, detail="Authentication token has expired. Please sign in again.")
        if "audience" in err_msg or "project" in err_msg:
            raise HTTPException(status_code=401, detail=f"Token not issued for this Firebase project. Expected '{expected_project}'.")
        if "issuer" in err_msg:
            raise HTTPException(status_code=401, detail=f"Token from wrong issuer. Expected 'https://securetoken.google.com/{expected_project}'.")
        raise HTTPException(status_code=401, detail="Invalid authentication token.")
    except Exception as exc:
        log_error(f"Public token verification error: {exc.__class__.__name__}")
        raise HTTPException(status_code=401, detail="Authentication failed. Invalid token.")


def _validate_claims_project(claims: Dict[str, Any], expected_project: str) -> None:
    """Ensure token belongs strictly to the real project neuroaid-sih-2026."""
    expected_issuer = f"https://securetoken.google.com/{expected_project}"
    iss = claims.get("iss")
    if iss != expected_issuer:
        raise HTTPException(
            status_code=401,
            detail=f"Token from wrong issuer. Expected '{expected_issuer}', got '{iss}'.",
        )

    aud = claims.get("aud")
    if aud != expected_project:
        raise HTTPException(
            status_code=401,
            detail=f"Token not issued for this Firebase project audience. Expected '{expected_project}', got '{aud}'.",
        )

    firebase_meta = claims.get("firebase")
    if isinstance(firebase_meta, dict):
        project_id = firebase_meta.get("project_id")
        if project_id and project_id != expected_project:
            raise HTTPException(
                status_code=401,
                detail=f"Token from wrong Firebase project. Expected '{expected_project}', got '{project_id}'.",
            )


def resolve_user_by_firebase_claims(claims: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    Map verified Firebase identity to internal NeuroAid application user.
    Uses firebase_uid as the primary unique mapping.
    Links existing pre-migration records matching verified email.
    """
    uid = claims.get("uid") or claims.get("sub")
    if not uid:
        return None

    email = claims.get("email", "").strip().lower()
    users = users_store.read()

    # 1. Match by unique firebase_uid
    for user_id, user in users.items():
        if user.get("firebase_uid") == uid:
            return user

    # 2. Link existing legacy account with verified email if not yet linked
    if email:
        for user_id, user in users.items():
            if user.get("email", "").strip().lower() == email:
                # Link firebase_uid permanently
                user["firebase_uid"] = uid
                users[user_id] = user
                users_store.write(users)
                log_info(f"Linked legacy NeuroAid user {user_id} ({email}) to Firebase UID {uid}")
                return user

    return None


def get_current_firebase_user(authorization: Optional[str] = Header(None)) -> Dict[str, Any]:
    """
    FastAPI dependency: Verifies Firebase ID token (or isolated SIH demo token)
    and returns verified identity claims.
    """
    token = extract_bearer_token(authorization)

    # Isolated SIH Deterministic Demo Bypass
    if token in SIH_DEMO_TOKENS:
        demo_user_id = SIH_DEMO_TOKENS[token]
        users = users_store.read()
        demo_user = users.get(demo_user_id)
        if demo_user:
            return {
                "uid": f"sih-demo-uid-{demo_user_id}",
                "email": demo_user["email"],
                "name": demo_user.get("full_name"),
                "is_demo": True,
                "user_id": demo_user_id,
            }

    # Real users MUST pass cryptographic Firebase ID token verification
    claims = verify_firebase_id_token(token)
    claims["is_demo"] = False
    return claims


def get_current_user(authorization: Optional[str] = Header(None)) -> Dict[str, Any]:
    """
    Application-level FastAPI dependency:
    Verifies Firebase token, resolves internal NeuroAid user via firebase_uid,
    and returns the authorized user record.
    """
    token = extract_bearer_token(authorization)

    # Isolated SIH Demo bypass
    if token in SIH_DEMO_TOKENS:
        demo_user_id = SIH_DEMO_TOKENS[token]
        users = users_store.read()
        demo_user = users.get(demo_user_id)
        if demo_user:
            return demo_user
        raise HTTPException(status_code=401, detail="Demo user record not found. Please re-seed demo.")

    # Real user verification
    claims = verify_firebase_id_token(token)
    user = resolve_user_by_firebase_claims(claims)

    if not user:
        raise HTTPException(
            status_code=401,
            detail="NeuroAid profile not found for this account. Please complete profile onboarding.",
        )

    return user


def require_user(authorization: Optional[str] = Header(None)) -> Dict[str, Any]:
    """Compatibility requirement function for existing router endpoints."""
    return get_current_user(authorization)


def require_doctor(authorization: Optional[str] = Header(None)) -> Dict[str, Any]:
    """Ensure authenticated caller holds verified 'doctor' role in NeuroAid."""
    user = get_current_user(authorization)
    if user.get("role") != "doctor":
        raise HTTPException(status_code=403, detail="Doctor privileges required.")
    return user


def require_care_team(authorization: Optional[str] = Header(None)) -> Dict[str, Any]:
    """Ensure authenticated caller holds care-team membership (doctor, caregiver, admin)."""
    user = get_current_user(authorization)
    if user.get("role") not in {"doctor", "caregiver", "admin"}:
        raise HTTPException(status_code=403, detail="Care-team access required.")
    return user


def require_admin(authorization: Optional[str] = Header(None)) -> Dict[str, Any]:
    """Ensure authenticated caller holds verified 'admin' role in NeuroAid."""
    user = get_current_user(authorization)
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin privileges required.")
    return user


def require_patient(authorization: Optional[str] = Header(None)) -> Dict[str, Any]:
    """Ensure authenticated caller holds verified 'patient' role in NeuroAid."""
    user = get_current_user(authorization)
    if user.get("role") != "patient":
        raise HTTPException(status_code=403, detail="Patient privileges required.")
    return user


def require_caregiver(authorization: Optional[str] = Header(None)) -> Dict[str, Any]:
    """Ensure authenticated caller holds verified 'caregiver' role in NeuroAid."""
    user = get_current_user(authorization)
    if user.get("role") != "caregiver":
        raise HTTPException(status_code=403, detail="Caregiver privileges required.")
    return user

