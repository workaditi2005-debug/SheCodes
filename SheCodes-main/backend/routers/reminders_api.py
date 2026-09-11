"""
reminders_api.py — REST API for Daily Routine Assistant & Reminder Engine
==========================================================================
Endpoints for medicines, hydration, activity routines, and appointment reminders.
Enforces care-team relationship checks, patient consent, and audit logging.
Screening output is never a clinical diagnosis.
SIH PS 26003.
"""
from __future__ import annotations

from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Header, HTTPException, Query

from models.memory_schemas import (
    DailyRoutineSummaryResponse,
    HydrationLogSubmit,
    ReminderCreate,
    ReminderResponse,
    ReminderUpdate,
)
from routers.consent_api import check_patient_consent
from services import audit_service, auth_service, reminder_service

router = APIRouter(prefix="/reminders", tags=["reminders"])


def _get_current_user(authorization: Optional[str]) -> Dict[str, Any]:
    if not authorization:
        raise HTTPException(status_code=401, detail="Authentication required.")
    token = auth_service.extract_bearer_token(authorization)
    user = auth_service.get_user_from_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid session token.")
    return user


def _resolve_target_user_id(user: Dict[str, Any], patient_id: Optional[str]) -> str:
    if patient_id and patient_id != user["id"]:
        if user.get("role") not in ("doctor", "caregiver", "admin"):
            audit_service.record(
                event="phi.access_denied",
                actor_id=user["id"],
                actor_role=user.get("role"),
                subject_id=patient_id,
                outcome="forbidden",
                metadata={"resource": "reminders", "reason": "non_caregiver_access"},
            )
            raise HTTPException(status_code=403, detail="Patients may only access their own reminders.")

        # 1. Relationship check
        if not auth_service.verify_doctor_patient_relationship(user["id"], patient_id):
            audit_service.record(
                event="phi.access_denied",
                actor_id=user["id"],
                actor_role=user.get("role"),
                subject_id=patient_id,
                outcome="forbidden",
                metadata={"resource": "reminders", "reason": "unassigned_patient"},
            )
            raise HTTPException(status_code=403, detail="This patient is not assigned to your care team.")

        # 2. Consent check
        if not check_patient_consent(patient_id, "share_reminders"):
            audit_service.record(
                event="phi.access_denied",
                actor_id=user["id"],
                actor_role=user.get("role"),
                subject_id=patient_id,
                outcome="forbidden",
                metadata={"resource": "reminders", "reason": "consent_withheld"},
            )
            raise HTTPException(status_code=403, detail="Patient has not granted consent to share reminders with care team.")

        return patient_id
    return user["id"]


@router.get("", response_model=List[ReminderResponse])
def list_reminders(
    category: Optional[str] = None,
    patient_id: Optional[str] = Query(default=None),
    authorization: Optional[str] = Header(default=None),
) -> List[ReminderResponse]:
    """List reminders filtered by category or target patient."""
    user = _get_current_user(authorization)
    target_id = _resolve_target_user_id(user, patient_id)
    items = reminder_service.get_reminders(target_id, category)

    audit_service.record(
        event="phi.reminders.read",
        actor_id=user["id"],
        actor_role=user.get("role"),
        subject_id=target_id,
        outcome="success",
        metadata={"count": len(items)},
    )
    return [ReminderResponse(**r) for r in items]


@router.post("", response_model=ReminderResponse)
def create_reminder(
    payload: ReminderCreate,
    authorization: Optional[str] = Header(default=None),
) -> ReminderResponse:
    """Create a new reminder (medicine, hydration, activity, appointment)."""
    user = _get_current_user(authorization)
    target_id = user["id"]

    if payload.patient_id and payload.patient_id != user["id"]:
        if user.get("role") not in ("doctor", "caregiver", "admin"):
            raise HTTPException(status_code=403, detail="Unauthorized to set reminders for other patients.")
        if not auth_service.verify_doctor_patient_relationship(user["id"], payload.patient_id):
            raise HTTPException(status_code=403, detail="Target patient is not in your care team.")
        target_id = payload.patient_id

    created_by = "caregiver" if user.get("role") in ("doctor", "caregiver") else "patient"
    item = reminder_service.add_reminder(target_id, payload, created_by=created_by)

    audit_service.record(
        event="phi.reminders.created",
        actor_id=user["id"],
        actor_role=user.get("role"),
        subject_id=target_id,
        outcome="success",
        metadata={"category": payload.category, "title": payload.title},
    )
    return ReminderResponse(**item)


@router.put("/{reminder_id}", response_model=ReminderResponse)
def update_reminder(
    reminder_id: str,
    payload: ReminderUpdate,
    authorization: Optional[str] = Header(default=None),
) -> ReminderResponse:
    """Update scheduled time, status, dosage, or instructions."""
    user = _get_current_user(authorization)
    is_doc = user.get("role") in ("doctor", "caregiver")
    item = reminder_service.update_reminder(reminder_id, user["id"], payload, is_doctor_or_caregiver=is_doc)
    if not item:
        audit_service.record(
            event="phi.reminders.update_failed",
            actor_id=user["id"],
            actor_role=user.get("role"),
            outcome="forbidden",
            metadata={"reminder_id": reminder_id},
        )
        raise HTTPException(status_code=404, detail="Reminder not found or unauthorized.")

    audit_service.record(
        event="phi.reminders.updated",
        actor_id=user["id"],
        actor_role=user.get("role"),
        subject_id=item.get("user_id"),
        outcome="success",
        metadata={"reminder_id": reminder_id},
    )
    return ReminderResponse(**item)


@router.delete("/{reminder_id}")
def delete_reminder(
    reminder_id: str,
    authorization: Optional[str] = Header(default=None),
) -> Dict[str, Any]:
    """Delete a reminder."""
    user = _get_current_user(authorization)
    is_doc = user.get("role") in ("doctor", "caregiver")
    success = reminder_service.delete_reminder(reminder_id, user["id"], is_doctor_or_caregiver=is_doc)
    if not success:
        audit_service.record(
            event="phi.reminders.delete_failed",
            actor_id=user["id"],
            actor_role=user.get("role"),
            outcome="forbidden",
            metadata={"reminder_id": reminder_id},
        )
        raise HTTPException(status_code=404, detail="Reminder not found or unauthorized.")

    audit_service.record(
        event="phi.reminders.deleted",
        actor_id=user["id"],
        actor_role=user.get("role"),
        outcome="success",
        metadata={"reminder_id": reminder_id},
    )
    return {"status": "ok", "message": "Reminder deleted successfully."}


@router.post("/{reminder_id}/complete", response_model=ReminderResponse)
def complete_reminder(
    reminder_id: str,
    authorization: Optional[str] = Header(default=None),
) -> ReminderResponse:
    """Mark a reminder as completed (e.g. pill taken, activity done)."""
    user = _get_current_user(authorization)
    item = reminder_service.complete_reminder(reminder_id, user["id"])
    if not item:
        raise HTTPException(status_code=404, detail="Reminder not found or unauthorized.")

    audit_service.record(
        event="phi.reminders.completed",
        actor_id=user["id"],
        actor_role=user.get("role"),
        subject_id=user["id"],
        outcome="success",
        metadata={"reminder_id": reminder_id},
    )
    return ReminderResponse(**item)


@router.post("/{reminder_id}/snooze", response_model=ReminderResponse)
def snooze_reminder(
    reminder_id: str,
    authorization: Optional[str] = Header(default=None),
) -> ReminderResponse:
    """Snooze a reminder temporarily."""
    user = _get_current_user(authorization)
    item = reminder_service.snooze_reminder(reminder_id, user["id"])
    if not item:
        raise HTTPException(status_code=404, detail="Reminder not found.")
    return ReminderResponse(**item)


@router.post("/hydration/log")
def log_hydration(
    payload: HydrationLogSubmit = HydrationLogSubmit(),
    authorization: Optional[str] = Header(default=None),
) -> Dict[str, Any]:
    """Quick one-tap water intake log (+1 glass)."""
    user = _get_current_user(authorization)
    return reminder_service.log_hydration(user["id"], payload.glasses_added)


@router.get("/summary", response_model=DailyRoutineSummaryResponse)
def get_daily_routine_summary(
    patient_id: Optional[str] = Query(default=None),
    authorization: Optional[str] = Header(default=None),
) -> DailyRoutineSummaryResponse:
    """Retrieve today's routine adherence, hydration count, and upcoming items."""
    user = _get_current_user(authorization)
    target_id = _resolve_target_user_id(user, patient_id)
    summary = reminder_service.get_daily_routine_summary(target_id)
    return DailyRoutineSummaryResponse(**summary)
