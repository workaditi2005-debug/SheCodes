"""
memory_bank_api.py — REST API for Personal Memory Bank
=======================================================
Endpoints for managing loved ones, places, items, and building game packs.
Enforces patient ownership, care-team authorization, and consent gating.
Screening output is never a clinical diagnosis.
SIH PS 26003.
"""
from __future__ import annotations

from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Header, HTTPException, Query

from models.memory_schemas import (
    GamePackResponse,
    MemoryItemCreate,
    MemoryItemResponse,
    MemoryItemUpdate,
)
from routers.consent_api import check_patient_consent
from services import audit_service, auth_service, memory_bank_service

router = APIRouter(prefix="/memory-bank", tags=["memory-bank"])


def _get_current_user(authorization: Optional[str]) -> Dict[str, Any]:
    if not authorization:
        raise HTTPException(status_code=401, detail="Authentication required.")
    token = auth_service.extract_bearer_token(authorization)
    user = auth_service.get_user_from_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid session token.")
    return user


def _resolve_target_user_id(user: Dict[str, Any], patient_id: Optional[str]) -> str:
    """If doctor or caregiver is accessing a patient, verify enrollment and patient consent."""
    if patient_id and patient_id != user["id"]:
        if user.get("role") not in ("doctor", "caregiver", "admin"):
            audit_service.record(
                event="phi.access_denied",
                actor_id=user["id"],
                actor_role=user.get("role"),
                subject_id=patient_id,
                outcome="forbidden",
                metadata={"resource": "memory_bank", "reason": "non_caregiver_access"},
            )
            raise HTTPException(status_code=403, detail="Patients may only access their own memory bank.")

        # 1. Care relationship verification
        if not auth_service.verify_doctor_patient_relationship(user["id"], patient_id):
            audit_service.record(
                event="phi.access_denied",
                actor_id=user["id"],
                actor_role=user.get("role"),
                subject_id=patient_id,
                outcome="forbidden",
                metadata={"resource": "memory_bank", "reason": "unassigned_patient"},
            )
            raise HTTPException(status_code=403, detail="This patient is not assigned to your care team.")

        # 2. Consent verification
        if not check_patient_consent(patient_id, "share_memory_bank"):
            audit_service.record(
                event="phi.access_denied",
                actor_id=user["id"],
                actor_role=user.get("role"),
                subject_id=patient_id,
                outcome="forbidden",
                metadata={"resource": "memory_bank", "reason": "consent_withheld"},
            )
            raise HTTPException(status_code=403, detail="Patient has not granted consent to share memory bank with care team.")

        return patient_id
    return user["id"]


@router.get("", response_model=List[MemoryItemResponse])
def list_memory_items(
    category: Optional[str] = None,
    patient_id: Optional[str] = Query(default=None),
    authorization: Optional[str] = Header(default=None),
) -> List[MemoryItemResponse]:
    """Retrieve personal memory items for patient or authorized care team."""
    user = _get_current_user(authorization)
    target_id = _resolve_target_user_id(user, patient_id)
    items = memory_bank_service.get_memories(target_id, category)

    audit_service.record(
        event="phi.memory_bank.read",
        actor_id=user["id"],
        actor_role=user.get("role"),
        subject_id=target_id,
        outcome="success",
        metadata={"count": len(items)},
    )
    return [MemoryItemResponse(**item) for item in items]


@router.post("", response_model=MemoryItemResponse)
def create_memory_item(
    payload: MemoryItemCreate,
    patient_id: Optional[str] = Query(default=None),
    authorization: Optional[str] = Header(default=None),
) -> MemoryItemResponse:
    """Add a new memory item (by patient or caregiver)."""
    user = _get_current_user(authorization)
    target_id = _resolve_target_user_id(user, patient_id)
    added_by = "caregiver" if user.get("role") in ("doctor", "caregiver") else "patient"
    item = memory_bank_service.add_memory(target_id, payload, added_by=added_by)

    audit_service.record(
        event="phi.memory_bank.created",
        actor_id=user["id"],
        actor_role=user.get("role"),
        subject_id=target_id,
        outcome="success",
        metadata={"category": payload.category},
    )
    return MemoryItemResponse(**item)


@router.put("/{memory_id}", response_model=MemoryItemResponse)
def update_memory_item(
    memory_id: str,
    payload: MemoryItemUpdate,
    authorization: Optional[str] = Header(default=None),
) -> MemoryItemResponse:
    """Update an existing memory item."""
    user = _get_current_user(authorization)
    is_doc = user.get("role") in ("doctor", "caregiver")
    item = memory_bank_service.update_memory(memory_id, user["id"], payload, is_doctor_or_caregiver=is_doc)
    if not item:
        audit_service.record(
            event="phi.memory_bank.update_failed",
            actor_id=user["id"],
            actor_role=user.get("role"),
            outcome="forbidden",
            metadata={"memory_id": memory_id},
        )
        raise HTTPException(status_code=404, detail="Memory item not found or unauthorized.")

    audit_service.record(
        event="phi.memory_bank.updated",
        actor_id=user["id"],
        actor_role=user.get("role"),
        subject_id=item.get("user_id"),
        outcome="success",
        metadata={"memory_id": memory_id},
    )
    return MemoryItemResponse(**item)


@router.delete("/{memory_id}")
def delete_memory_item(
    memory_id: str,
    authorization: Optional[str] = Header(default=None),
) -> Dict[str, Any]:
    """Delete a memory item."""
    user = _get_current_user(authorization)
    is_doc = user.get("role") in ("doctor", "caregiver")
    success = memory_bank_service.delete_memory(memory_id, user["id"], is_doctor_or_caregiver=is_doc)
    if not success:
        audit_service.record(
            event="phi.memory_bank.delete_failed",
            actor_id=user["id"],
            actor_role=user.get("role"),
            outcome="forbidden",
            metadata={"memory_id": memory_id},
        )
        raise HTTPException(status_code=404, detail="Memory item not found or unauthorized.")

    audit_service.record(
        event="phi.memory_bank.deleted",
        actor_id=user["id"],
        actor_role=user.get("role"),
        outcome="success",
        metadata={"memory_id": memory_id},
    )
    return {"status": "ok", "message": "Memory item deleted successfully."}


@router.get("/game-pack", response_model=GamePackResponse)
def get_personal_game_pack(
    patient_id: Optional[str] = Query(default=None),
    authorization: Optional[str] = Header(default=None),
) -> GamePackResponse:
    """Retrieve personalized decks for Object Recognition, Memory Match, and Daily Routine."""
    user = _get_current_user(authorization)
    target_id = _resolve_target_user_id(user, patient_id)
    pack = memory_bank_service.build_game_pack(target_id)
    return GamePackResponse(**pack)
