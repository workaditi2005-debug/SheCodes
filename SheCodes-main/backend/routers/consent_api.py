"""
consent_api.py — Healthcare Consent Management API
===================================================
Granular consent tracking for patient data sharing, care team collaboration,
and de-identified research usage. Enforces patient autonomy over health records.
Screening output is never a clinical diagnosis.
"""
from __future__ import annotations

from typing import Any, Dict, Optional
from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel, Field

from core.storage import consent_store
from services import auth_service
from services.audit_service import record, utcnow_iso

router = APIRouter(prefix="/consent", tags=["consent"])


class ConsentUpdate(BaseModel):
    share_with_care_team: bool = Field(default=True, description="Share cognitive screening results with enrolled doctor/caregiver")
    share_memory_bank: bool = Field(default=True, description="Share loved ones and personal memory items with care team")
    share_reminders: bool = Field(default=True, description="Share routine and medicine schedule with care team")
    allow_research_deidentified: bool = Field(default=False, description="Contribute anonymized telemetry for cognitive research")


DEFAULT_CONSENT: Dict[str, Any] = {
    "share_with_care_team": True,
    "share_memory_bank": True,
    "share_reminders": True,
    "allow_research_deidentified": False,
}


def get_patient_consent_record(patient_id: str) -> Dict[str, Any]:
    """Retrieve current consent settings for a patient."""
    all_consents = consent_store.read()
    if not isinstance(all_consents, dict):
        all_consents = {}
    return all_consents.get(patient_id, dict(DEFAULT_CONSENT))


def check_patient_consent(patient_id: str, consent_type: str = "share_with_care_team") -> bool:
    """
    Verify whether patient has actively granted a specific consent.
    Defaults to True for care team collaboration unless explicitly disabled.
    """
    record_data = get_patient_consent_record(patient_id)
    return bool(record_data.get(consent_type, True))


@router.get("", response_model=Dict[str, Any])
def get_my_consent(authorization: str = Header(...)) -> Dict[str, Any]:
    """Retrieve current user's active consent preferences."""
    user = auth_service.require_user(authorization)
    consent = get_patient_consent_record(user["id"])
    record(
        event="consent.read",
        actor_id=user["id"],
        actor_role=user.get("role"),
        subject_id=user["id"],
        outcome="success",
    )
    return consent


@router.put("", response_model=Dict[str, Any])
def update_my_consent(body: ConsentUpdate, authorization: str = Header(...)) -> Dict[str, Any]:
    """Update patient consent preferences and log security audit event."""
    user = auth_service.require_user(authorization)
    data = consent_store.read()
    if not isinstance(data, dict):
        data = {}

    updated = {
        **body.model_dump(),
        "updated_at": utcnow_iso(),
        "policy_version": "2026-v2",
    }
    data[user["id"]] = updated
    consent_store.write(data)

    record(
        event="consent.updated",
        actor_id=user["id"],
        actor_role=user.get("role"),
        subject_id=user["id"],
        outcome="success",
        metadata=body.model_dump(),
    )
    return updated


@router.get("/patient/{patient_id}", response_model=Dict[str, Any])
def get_patient_consent_status(patient_id: str, authorization: str = Header(...)) -> Dict[str, Any]:
    """Clinician / Care team checks patient consent status."""
    care_member = auth_service.require_care_team(authorization)
    # Check enrollment
    if not auth_service.verify_doctor_patient_relationship(care_member["id"], patient_id):
        record(
            event="consent.check_denied",
            actor_id=care_member["id"],
            actor_role=care_member.get("role"),
            subject_id=patient_id,
            outcome="forbidden",
        )
        raise HTTPException(status_code=403, detail="Patient is not enrolled with your care team.")

    return get_patient_consent_record(patient_id)
