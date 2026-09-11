"""
auth_api.py — NeuroAid Authentication and User Management Router
===============================================================
Endpoints for user registration, authentication, sessions, profiles,
doctor-patient enrollment, and security audit log retrieval.
Screening output is never a clinical diagnosis.
"""
from __future__ import annotations

from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Header, Query
from pydantic import BaseModel, Field

from services import audit_service, auth_service


router = APIRouter(prefix="/auth", tags=["auth"])


class RegisterRequest(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=100)
    email: str = Field(..., min_length=5, max_length=150)
    password: str = Field(..., min_length=8, max_length=128)
    role: str = Field(default="patient")
    age: Optional[int] = Field(default=None, ge=1, le=120)
    gender: Optional[str] = Field(default=None, max_length=50)
    phone: Optional[str] = Field(default=None, max_length=30)
    license_number: Optional[str] = Field(default=None, max_length=50)
    specialization: Optional[str] = Field(default=None, max_length=100)
    hospital: Optional[str] = Field(default=None, max_length=150)
    location: Optional[str] = Field(default=None, max_length=150)
    years_experience: Optional[int] = Field(default=None, ge=0, le=70)
    consultation_mode: Optional[str] = Field(default=None, max_length=50)
    bio: Optional[str] = Field(default=None, max_length=500)
    max_patients: Optional[int] = Field(default=10, ge=1, le=500)


class FirebaseOnboardRequest(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=100)
    role: str = Field(default="patient")
    age: Optional[int] = Field(default=None, ge=1, le=120)
    gender: Optional[str] = Field(default=None, max_length=50)
    phone: Optional[str] = Field(default=None, max_length=30)
    license_number: Optional[str] = Field(default=None, max_length=50)
    specialization: Optional[str] = Field(default=None, max_length=100)
    hospital: Optional[str] = Field(default=None, max_length=150)
    location: Optional[str] = Field(default=None, max_length=150)
    years_experience: Optional[int] = Field(default=None, ge=0, le=70)
    consultation_mode: Optional[str] = Field(default=None, max_length=50)
    bio: Optional[str] = Field(default=None, max_length=500)
    max_patients: Optional[int] = Field(default=10, ge=1, le=500)


class LoginRequest(BaseModel):
    email: str = Field(..., min_length=5, max_length=150)
    password: str = Field(..., min_length=1, max_length=128)
    role: str = Field(default="patient")


class AuthResponse(BaseModel):
    message: str
    token: str
    user: Dict[str, Any]


class UserProfileUpdate(BaseModel):
    full_name: Optional[str] = Field(default=None, min_length=2, max_length=100)
    age: Optional[int] = Field(default=None, ge=1, le=120)
    gender: Optional[str] = Field(default=None, max_length=50)
    phone: Optional[str] = Field(default=None, max_length=30)
    license_number: Optional[str] = Field(default=None, max_length=50)
    specialization: Optional[str] = Field(default=None, max_length=100)
    hospital: Optional[str] = Field(default=None, max_length=150)
    location: Optional[str] = Field(default=None, max_length=150)
    years_experience: Optional[int] = Field(default=None, ge=0, le=70)
    consultation_mode: Optional[str] = Field(default=None, max_length=50)
    bio: Optional[str] = Field(default=None, max_length=500)
    max_patients: Optional[int] = Field(default=None, ge=1, le=500)


class ExtendedProfileUpdate(BaseModel):
    education: Optional[str] = Field(default=None, max_length=100)
    occupation: Optional[str] = Field(default=None, max_length=100)
    handedness: Optional[str] = Field(default=None, max_length=20)
    medicalHistory: Optional[List[str]] = None
    currentMeds: Optional[List[str]] = None
    priorHeadInjury: Optional[bool] = None
    exerciseFreq: Optional[str] = Field(default=None, max_length=50)
    smokingStatus: Optional[str] = Field(default=None, max_length=50)
    alcoholUse: Optional[str] = Field(default=None, max_length=50)
    sleepHours: Optional[float] = Field(default=None, ge=0.0, le=24.0)
    sleepQuality: Optional[str] = Field(default=None, max_length=50)
    depressionHistory: Optional[bool] = None
    anxietyHistory: Optional[bool] = None
    familyHistory: Optional[bool] = None
    familyHistoryDetails: Optional[str] = Field(default=None, max_length=500)
    existingDiagnosis: Optional[str] = Field(default=None, max_length=200)
    cognitiveComplaints: Optional[List[str]] = None
    baselineTestDate: Optional[str] = Field(default=None, max_length=50)


@router.post("/firebase-onboard")
def firebase_onboard(
    body: FirebaseOnboardRequest,
    authorization: str = Header(...),
) -> Dict[str, Any]:
    """
    Onboard or link a Firebase authenticated user using their real Firebase ID token.
    Extracts verified UID, verifies project ID, and maps to an internal NeuroAid profile.
    """
    return auth_service.create_or_link_firebase_profile(authorization, body)


@router.post("/register", response_model=AuthResponse)
def register(body: RegisterRequest) -> AuthResponse:
    return AuthResponse(**auth_service.register_user(body))


@router.post("/login", response_model=AuthResponse)
def login(body: LoginRequest) -> AuthResponse:
    return AuthResponse(**auth_service.login_user(body))


@router.post("/logout")
def logout(authorization: str = Header(...)) -> Dict[str, str]:
    return auth_service.logout_user(authorization)


@router.get("/me")
def get_current_user(authorization: Optional[str] = Header(None)) -> Dict[str, Any]:
    return {"user": auth_service.safe_user(auth_service.require_user(authorization))}


@router.get("/patients")
def get_patients(authorization: Optional[str] = Header(None)) -> Dict[str, Any]:
    care_member = auth_service.require_care_team(authorization)
    return {"patients": auth_service.list_patients_for_doctor(care_member["id"])}


@router.put("/me")
def update_profile(body: UserProfileUpdate, authorization: Optional[str] = Header(None)) -> Dict[str, Any]:
    user = auth_service.require_user(authorization)
    updated = auth_service.update_basic_profile(user["id"], body.model_dump(exclude_unset=True))
    return {"message": "Profile updated.", "user": updated}


@router.put("/profile-extended")
def update_profile_extended(body: ExtendedProfileUpdate, authorization: Optional[str] = Header(None)) -> Dict[str, Any]:
    user = auth_service.require_user(authorization)
    updated = auth_service.update_extended_profile(user["id"], body.model_dump(exclude_unset=True))
    return {"message": "Extended profile saved.", "user": updated}


@router.get("/doctors")
def get_doctors(authorization: Optional[str] = Header(None)) -> Dict[str, Any]:
    auth_service.require_user(authorization)
    return {"doctors": auth_service.list_doctors()}


@router.post("/doctors/enroll")
def enroll_with_doctor(body: Dict[str, Any], authorization: Optional[str] = Header(None)) -> Dict[str, Any]:
    user = auth_service.require_user(authorization)
    return auth_service.request_doctor_enrollment(user["id"], body.get("doctor_id", ""))


@router.post("/doctors/approve")
def approve_patient(body: Dict[str, Any], authorization: Optional[str] = Header(None)) -> Dict[str, str]:
    doctor = auth_service.require_doctor(authorization)
    return auth_service.respond_to_enrollment_request(doctor["id"], body.get("patient_id", ""), body.get("action", ""))


@router.get("/doctors/my-doctor")
def get_my_doctor(authorization: Optional[str] = Header(None)) -> Dict[str, Any]:
    user = auth_service.require_user(authorization)
    return auth_service.get_my_doctor_payload(user["id"])


@router.get("/doctors/pending-requests")
def get_pending_requests(authorization: Optional[str] = Header(None)) -> Dict[str, Any]:
    doctor = auth_service.require_doctor(authorization)
    return {"pending_requests": auth_service.get_pending_requests(doctor["id"])}


@router.get("/audit-logs")
def get_audit_logs(
    limit: int = Query(default=50, ge=1, le=500),
    event: Optional[str] = Query(default=None),
    actor: Optional[str] = Query(default=None),
    authorization: Optional[str] = Header(None),
) -> Dict[str, Any]:
    """Retrieve security and PHI access audit trail (Authorized clinician/admin only)."""
    user = auth_service.require_care_team(authorization)
    logs = audit_service.query_logs(user, limit=limit, event_filter=event, actor_filter=actor)
    return {"audit_logs": logs, "total_returned": len(logs)}

