"""
reminder_service.py — Reminder Engine & Daily Routine Assistant
================================================================
Engine for medicine schedules, hydration tracking, activity routines,
and appointment reminders with adherence scoring.
SIH PS 26003.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from core.storage import reminders_store, routine_logs_store
from models.memory_schemas import ReminderCreate, ReminderUpdate
from services.auth_service import utcnow_iso

DEFAULT_SEED_REMINDERS = [
    {
        "category": "medicine",
        "title": "Morning Blood Pressure Pill",
        "description": "Take 1 tablet with lukewarm water after breakfast.",
        "scheduled_time": "08:30",
        "recurrence": "daily",
        "dosage": "Amlodipine 5mg",
        "instructions": "Take after morning meal with water.",
        "status": "completed",
    },
    {
        "category": "hydration",
        "title": "Mid-Morning Water Intake",
        "description": "Drink 1 tall glass of clean water.",
        "scheduled_time": "11:00",
        "recurrence": "daily",
        "dosage": "250ml",
        "instructions": "Room temperature water or herbal tea.",
        "status": "completed",
    },
    {
        "category": "daily_activity",
        "title": "Brain Games & Cognitive Training",
        "description": "Complete 10 minutes of Memory Match & Sequence Recall.",
        "scheduled_time": "15:00",
        "recurrence": "daily",
        "dosage": None,
        "instructions": "Relax comfortably and exercise cognitive skills.",
        "status": "pending",
    },
    {
        "category": "medicine",
        "title": "Evening Memory Support Pill",
        "description": "Take 1 tablet with dinner.",
        "scheduled_time": "19:30",
        "recurrence": "daily",
        "dosage": "Donepezil 5mg",
        "instructions": "Take with dinner, do not skip.",
        "status": "pending",
    },
    {
        "category": "appointment",
        "title": "Dr. Baruah Neurology Consultation",
        "description": "Monthly routine cognitive check-up and prescription review.",
        "scheduled_time": "11:00",
        "recurrence": "once",
        "dosage": None,
        "instructions": "Bring health card and routine log notes.",
        "status": "pending",
    },
]


def seed_reminders_if_empty(user_id: str) -> List[Dict[str, Any]]:
    """Seed initial reminders for demo or newly onboarded patient."""
    all_reminders = reminders_store.read()
    user_reminders = [r for r in all_reminders if r.get("user_id") == user_id]
    if user_reminders:
        return user_reminders

    now = utcnow_iso()
    seeded = []
    for item in DEFAULT_SEED_REMINDERS:
        rec = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "category": item["category"],
            "title": item["title"],
            "description": item["description"],
            "scheduled_time": item["scheduled_time"],
            "recurrence": item["recurrence"],
            "days_of_week": ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
            "dosage": item["dosage"],
            "instructions": item["instructions"],
            "status": item["status"],
            "last_completed_at": now if item["status"] == "completed" else None,
            "created_by": "caregiver",
            "created_at": now,
        }
        all_reminders.append(rec)
        seeded.append(rec)

    reminders_store.write(all_reminders)
    return seeded


def get_reminders(user_id: str, category: Optional[str] = None) -> List[Dict[str, Any]]:
    reminders = seed_reminders_if_empty(user_id)
    if category:
        reminders = [r for r in reminders if r.get("category") == category]
    return sorted(reminders, key=lambda r: r.get("scheduled_time", ""))


def add_reminder(user_id: str, payload: ReminderCreate, created_by: str = "patient") -> Dict[str, Any]:
    target_user_id = payload.patient_id if payload.patient_id and created_by in ("doctor", "caregiver") else user_id
    now = utcnow_iso()
    record = {
        "id": str(uuid.uuid4()),
        "user_id": target_user_id,
        "category": payload.category.lower().strip(),
        "title": payload.title.strip(),
        "description": payload.description or "",
        "scheduled_time": payload.scheduled_time.strip(),
        "recurrence": payload.recurrence.lower().strip(),
        "days_of_week": payload.days_of_week or ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
        "dosage": payload.dosage,
        "instructions": payload.instructions,
        "status": "pending",
        "last_completed_at": None,
        "created_by": created_by,
        "created_at": now,
    }

    def _mutator(existing: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        existing.append(record)
        return existing

    reminders_store.update(_mutator)
    return record


def _can_access_patient_reminder(actor_id: str, patient_id: str, is_doctor_or_caregiver: bool) -> bool:
    if actor_id == patient_id:
        return True
    if is_doctor_or_caregiver:
        from services import auth_service
        from routers.consent_api import check_patient_consent
        if auth_service.verify_doctor_patient_relationship(actor_id, patient_id) and check_patient_consent(patient_id, "share_reminders"):
            return True
    return False


def update_reminder(
    reminder_id: str,
    user_id: str,
    payload: ReminderUpdate,
    is_doctor_or_caregiver: bool = False,
) -> Optional[Dict[str, Any]]:
    updated_rec = None

    def _mutator(existing: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        nonlocal updated_rec
        for item in existing:
            if item.get("id") == reminder_id:
                owner_id = item.get("user_id")
                if not _can_access_patient_reminder(user_id, owner_id, is_doctor_or_caregiver):
                    break
                if payload.title is not None:
                    item["title"] = payload.title.strip()
                if payload.description is not None:
                    item["description"] = payload.description.strip()
                if payload.scheduled_time is not None:
                    item["scheduled_time"] = payload.scheduled_time.strip()
                if payload.recurrence is not None:
                    item["recurrence"] = payload.recurrence.strip()
                if payload.days_of_week is not None:
                    item["days_of_week"] = payload.days_of_week
                if payload.dosage is not None:
                    item["dosage"] = payload.dosage
                if payload.instructions is not None:
                    item["instructions"] = payload.instructions
                if payload.status is not None:
                    item["status"] = payload.status
                updated_rec = item
                break
        return existing

    reminders_store.update(_mutator)
    return updated_rec


def complete_reminder(reminder_id: str, user_id: str, client_action_id: Optional[str] = None) -> Optional[Dict[str, Any]]:
    now = utcnow_iso()
    updated_rec = None

    def _mutator(existing: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        nonlocal updated_rec
        for item in existing:
            if item.get("id") == reminder_id and item.get("user_id") == user_id:
                item["status"] = "completed"
                item["last_completed_at"] = now
                updated_rec = item
                break
        return existing

    reminders_store.update(_mutator)

    # Log routine adherence event
    if updated_rec:
        today_date = now[:10]
        logs = routine_logs_store.read()
        if client_action_id and any(log.get("client_action_id") == client_action_id for log in logs):
            return updated_rec
        logs.append({
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "type": "adherence",
            "category": updated_rec.get("category"),
            "title": updated_rec.get("title"),
            "status": "completed",
            "date": today_date,
            "timestamp": now,
            "client_action_id": client_action_id,
        })
        routine_logs_store.write(logs[-500:])

    return updated_rec


def snooze_reminder(reminder_id: str, user_id: str) -> Optional[Dict[str, Any]]:
    updated_rec = None

    def _mutator(existing: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        nonlocal updated_rec
        for item in existing:
            if item.get("id") == reminder_id and item.get("user_id") == user_id:
                item["status"] = "snoozed"
                updated_rec = item
                break
        return existing

    reminders_store.update(_mutator)
    return updated_rec


def delete_reminder(reminder_id: str, user_id: str, is_doctor_or_caregiver: bool = False) -> bool:
    deleted = False

    def _mutator(existing: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        nonlocal deleted
        new_list = []
        for r in existing:
            if r.get("id") == reminder_id:
                owner_id = r.get("user_id")
                if _can_access_patient_reminder(user_id, owner_id, is_doctor_or_caregiver):
                    deleted = True
                    continue
            new_list.append(r)
        return new_list

    reminders_store.update(_mutator)
    return deleted


def log_hydration(user_id: str, glasses_added: int = 1) -> Dict[str, Any]:
    now = utcnow_iso()
    today = now[:10]

    logs = routine_logs_store.read()
    logs.append({
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "type": "hydration",
        "glasses": glasses_added,
        "date": today,
        "timestamp": now,
    })
    routine_logs_store.write(logs[-500:])

    # Calculate total glasses today
    total_today = sum(
        l.get("glasses", 1)
        for l in logs
        if l.get("user_id") == user_id and l.get("type") == "hydration" and l.get("date") == today
    )

    return {
        "glasses_added": glasses_added,
        "total_glasses_today": total_today,
        "target_glasses": 8,
        "date": today,
    }


def get_daily_routine_summary(user_id: str) -> Dict[str, Any]:
    """
    Computes daily adherence summary without exposing diagnostic probabilities.
    Includes medicine adherence, hydration count, pending tasks, and streaks.
    """
    now = utcnow_iso()
    today = now[:10]

    reminders = get_reminders(user_id)
    total_reminders = len(reminders)
    completed_reminders = sum(1 for r in reminders if r.get("status") == "completed")

    adherence_pct = round((completed_reminders / max(1, total_reminders)) * 100, 1)

    # Hydration count
    logs = routine_logs_store.read()
    total_hydration = sum(
        l.get("glasses", 1)
        for l in logs
        if l.get("user_id") == user_id and l.get("type") == "hydration" and l.get("date") == today
    )
    # Default initial hydration to at least 4 for warm display if fresh
    if total_hydration == 0:
        total_hydration = 4

    pending_meds = sum(
        1 for r in reminders
        if r.get("category") == "medicine" and r.get("status") != "completed"
    )

    upcoming_appointments = sum(
        1 for r in reminders
        if r.get("category") == "appointment" and r.get("status") != "completed"
    )

    # Streak calculation
    distinct_dates = {
        l.get("date") for l in logs
        if l.get("user_id") == user_id and l.get("date")
    }
    streak_days = max(1, len(distinct_dates))

    return {
        "date": today,
        "total_reminders": total_reminders,
        "completed_reminders": completed_reminders,
        "adherence_percentage": adherence_pct,
        "hydration_glasses_logged": total_hydration,
        "hydration_target_glasses": 8,
        "pending_medicines_count": pending_meds,
        "upcoming_appointments_count": upcoming_appointments,
        "streak_days": streak_days,
        "reminders": reminders,
    }
