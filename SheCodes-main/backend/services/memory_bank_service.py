"""
memory_bank_service.py — Service Layer for Personal Memory Bank
===============================================================
Manages personal memories (loved ones, places, treasured items, daily routines)
and generates personalized game packs for cognitive exercises.
SIH PS 26003.
"""
from __future__ import annotations

import random
import uuid
from typing import Any, Dict, List, Optional

from core.storage import memory_bank_store
from models.memory_schemas import MemoryItemCreate, MemoryItemUpdate
from services.auth_service import utcnow_iso

# Default warm memories seeded for new users / demos
DEFAULT_SEED_MEMORIES = [
    {
        "category": "person",
        "name": "Aarav (Grandson)",
        "relationship_or_context": "Grandson, lives in Guwahati and loves cricket",
        "image_emoji": "👦",
        "notes": "Always visits on Sunday afternoons. Loves grandma's homemade pitha.",
    },
    {
        "category": "person",
        "name": "Maya (Daughter)",
        "relationship_or_context": "Daughter, calls every evening at 7:00 PM",
        "image_emoji": "👩",
        "notes": "School teacher. Reminds to drink water after dinner.",
    },
    {
        "category": "place",
        "name": "Guwahati Home Garden",
        "relationship_or_context": "Our courtyard garden with marigolds and basil",
        "image_emoji": "🏡",
        "notes": "Where morning chai is enjoyed every sunny day.",
    },
    {
        "category": "object",
        "name": "Traditional Bell Metal Tea Mug",
        "relationship_or_context": "Sarthebari brass cup gifted on 50th wedding anniversary",
        "image_emoji": "☕",
        "notes": "Keeps Assam tea wonderfully warm.",
    },
    {
        "category": "routine",
        "name": "Morning Garden Walk",
        "relationship_or_context": "Daily 15-minute gentle stroll around the courtyard",
        "image_emoji": "🌿",
        "notes": "Done right after morning tea.",
    },
]


def seed_memories_if_empty(user_id: str) -> List[Dict[str, Any]]:
    """Seeds starter memories for demonstration and patient onboarding."""
    all_memories = memory_bank_store.read()
    user_memories = [m for m in all_memories if m.get("user_id") == user_id]
    if user_memories:
        return user_memories

    now = utcnow_iso()
    seeded = []
    for item in DEFAULT_SEED_MEMORIES:
        rec = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "category": item["category"],
            "name": item["name"],
            "relationship_or_context": item["relationship_or_context"],
            "photo_url": None,
            "image_emoji": item["image_emoji"],
            "notes": item["notes"],
            "audio_cue": None,
            "added_by": "caregiver",
            "created_at": now,
            "updated_at": now,
        }
        all_memories.append(rec)
        seeded.append(rec)

    memory_bank_store.write(all_memories)
    return seeded


def get_memories(user_id: str, category: Optional[str] = None) -> List[Dict[str, Any]]:
    """Retrieve all memory items for a user, optionally filtered by category."""
    memories = seed_memories_if_empty(user_id)
    if category:
        memories = [m for m in memories if m.get("category") == category]
    return sorted(memories, key=lambda m: m.get("created_at", ""), reverse=True)


def get_memory_by_id(memory_id: str) -> Optional[Dict[str, Any]]:
    all_memories = memory_bank_store.read()
    for m in all_memories:
        if m.get("id") == memory_id:
            return m
    return None


def add_memory(user_id: str, payload: MemoryItemCreate, added_by: str = "patient") -> Dict[str, Any]:
    now = utcnow_iso()
    record = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "category": payload.category.lower().strip(),
        "name": payload.name.strip(),
        "relationship_or_context": payload.relationship_or_context.strip(),
        "photo_url": payload.photo_url,
        "image_emoji": payload.image_emoji or "👤",
        "notes": payload.notes or "",
        "audio_cue": payload.audio_cue,
        "added_by": added_by,
        "created_at": now,
        "updated_at": now,
    }

    def _mutator(existing: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        existing.append(record)
        return existing

    memory_bank_store.update(_mutator)
    return record


def _can_access_patient_memory(actor_id: str, patient_id: str, is_doctor_or_caregiver: bool) -> bool:
    if actor_id == patient_id:
        return True
    if is_doctor_or_caregiver:
        from services import auth_service
        from routers.consent_api import check_patient_consent
        if auth_service.verify_doctor_patient_relationship(actor_id, patient_id) and check_patient_consent(patient_id, "share_memory_bank"):
            return True
    return False


def update_memory(
    memory_id: str,
    user_id: str,
    payload: MemoryItemUpdate,
    is_doctor_or_caregiver: bool = False,
) -> Optional[Dict[str, Any]]:
    now = utcnow_iso()
    updated_rec = None

    def _mutator(existing: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        nonlocal updated_rec
        for item in existing:
            if item.get("id") == memory_id:
                owner_id = item.get("user_id")
                if not _can_access_patient_memory(user_id, owner_id, is_doctor_or_caregiver):
                    break
                if payload.name is not None:
                    item["name"] = payload.name.strip()
                if payload.category is not None:
                    item["category"] = payload.category.lower().strip()
                if payload.relationship_or_context is not None:
                    item["relationship_or_context"] = payload.relationship_or_context.strip()
                if payload.photo_url is not None:
                    item["photo_url"] = payload.photo_url
                if payload.image_emoji is not None:
                    item["image_emoji"] = payload.image_emoji
                if payload.notes is not None:
                    item["notes"] = payload.notes
                if payload.audio_cue is not None:
                    item["audio_cue"] = payload.audio_cue
                item["updated_at"] = now
                updated_rec = item
                break
        return existing

    memory_bank_store.update(_mutator)
    return updated_rec


def delete_memory(memory_id: str, user_id: str, is_doctor_or_caregiver: bool = False) -> bool:
    deleted = False

    def _mutator(existing: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        nonlocal deleted
        new_list = []
        for m in existing:
            if m.get("id") == memory_id:
                owner_id = m.get("user_id")
                if _can_access_patient_memory(user_id, owner_id, is_doctor_or_caregiver):
                    deleted = True
                    continue
            new_list.append(m)
        return new_list

    memory_bank_store.update(_mutator)
    return deleted


def build_game_pack(user_id: str) -> Dict[str, Any]:
    """
    Builds personalized game packs for Memory Match, Object Recognition,
    and Daily Routine using the patient's personal memory bank.
    """
    memories = get_memories(user_id)

    # 1. Match Pairs for Memory Match
    match_items = []
    for m in memories:
        match_items.append({
            "id": f"mem_{m['id'][:8]}",
            "label": m["name"],
            "sublabel": m.get("relationship_or_context", ""),
            "icon_or_photo": m.get("photo_url") or m.get("image_emoji", "⭐"),
            "category": m.get("category", "object"),
        })

    # 2. Recognition Questions for Object Recognition
    questions = []
    people_and_objects = [m for m in memories if m.get("category") in ("person", "object", "place")]
    for idx, item in enumerate(people_and_objects):
        correct_name = item["name"]
        rel = item.get("relationship_or_context", "")

        # Formulate prompt based on category
        if item.get("category") == "person":
            prompt = f"Who is this loved one?"
            hint = f"Relationship: {rel}"
        elif item.get("category") == "place":
            prompt = f"Which familiar place is this?"
            hint = f"Location context: {rel}"
        else:
            prompt = f"What cherished item is this?"
            hint = f"About this item: {rel}"

        # Generate distractors from other memory items or common names
        other_names = [m["name"] for m in memories if m["id"] != item["id"]]
        random.shuffle(other_names)
        distractors = other_names[:2]
        while len(distractors) < 2:
            distractors.append("Family Friend" if len(distractors) == 0 else "Neighbor")

        options = [{"text": correct_name, "correct": True}]
        for d in distractors:
            options.append({"text": d, "correct": False})
        random.shuffle(options)

        questions.append({
            "id": f"rec_{item['id'][:8]}",
            "image": item.get("image_emoji", "👤"),
            "photo_url": item.get("photo_url"),
            "question": prompt,
            "hint": hint,
            "options": options,
        })

    # 3. Routine Sequence for Daily Routine Recall
    routine_memories = [m for m in memories if m.get("category") == "routine"]
    routine_items = []
    for i, r in enumerate(routine_memories[:5]):
        routine_items.append({
            "id": f"rout_{r['id'][:8]}",
            "title": r["name"],
            "time_hint": r.get("relationship_or_context", "Daily Habit"),
            "order": i + 1,
            "icon": r.get("image_emoji", "⏰"),
        })

    return {
        "has_personal_items": len(memories) >= 2,
        "total_personal_items": len(memories),
        "match_pairs": match_items,
        "recognition_questions": questions,
        "routine_sequence": routine_items,
    }
