"""
memory_schemas.py — Schemas for Personal Memory Bank, Reminders, and Routine Assistant
======================================================================================
Data transfer models for Phase 3 (SIH PS 26003).
"""
from __future__ import annotations

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


# ── 1. Personal Memory Bank Schemas ───────────────────────────────────────────

class MemoryItemCreate(BaseModel):
    category: str = Field(..., description="'person' | 'place' | 'object' | 'routine' | 'event'")
    name: str = Field(..., min_length=1, max_length=100)
    relationship_or_context: str = Field(..., max_length=200)
    photo_url: Optional[str] = Field(default=None, description="Image URL or data URI")
    image_emoji: str = Field(default="👤", max_length=10)
    notes: Optional[str] = Field(default="", max_length=500)
    audio_cue: Optional[str] = Field(default=None)


class MemoryItemUpdate(BaseModel):
    category: Optional[str] = None
    name: Optional[str] = None
    relationship_or_context: Optional[str] = None
    photo_url: Optional[str] = None
    image_emoji: Optional[str] = None
    notes: Optional[str] = None
    audio_cue: Optional[str] = None


class MemoryItemResponse(BaseModel):
    id: str
    user_id: str
    category: str
    name: str
    relationship_or_context: str
    photo_url: Optional[str] = None
    image_emoji: str = "👤"
    notes: Optional[str] = ""
    audio_cue: Optional[str] = None
    created_at: str
    updated_at: str
    added_by: str = "patient"


# ── 2. Reminder & Routine Assistant Schemas ───────────────────────────────────

class ReminderCreate(BaseModel):
    category: str = Field(..., description="'medicine' | 'hydration' | 'daily_activity' | 'appointment'")
    title: str = Field(..., min_length=1, max_length=120)
    description: Optional[str] = Field(default="", max_length=300)
    scheduled_time: str = Field(..., description="HH:MM (24-hour) or ISO datetime string")
    recurrence: str = Field(default="daily", description="'daily' | 'weekly' | 'once'")
    days_of_week: List[str] = Field(default_factory=lambda: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"])
    dosage: Optional[str] = Field(default=None, description="Dosage for medication e.g. '5mg with breakfast'")
    instructions: Optional[str] = Field(default=None, description="Instructions e.g. 'Take with a full glass of water'")
    patient_id: Optional[str] = Field(default=None, description="Target patient ID if created by caregiver")


class ReminderUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    scheduled_time: Optional[str] = None
    recurrence: Optional[str] = None
    days_of_week: Optional[List[str]] = None
    dosage: Optional[str] = None
    instructions: Optional[str] = None
    status: Optional[str] = None


class ReminderResponse(BaseModel):
    id: str
    user_id: str
    category: str
    title: str
    description: Optional[str] = ""
    scheduled_time: str
    recurrence: str = "daily"
    days_of_week: List[str] = Field(default_factory=list)
    dosage: Optional[str] = None
    instructions: Optional[str] = None
    status: str = "pending"  # "pending" | "completed" | "snoozed" | "missed"
    last_completed_at: Optional[str] = None
    created_by: str = "patient"
    created_at: str


class HydrationLogSubmit(BaseModel):
    glasses_added: int = Field(default=1, ge=1, le=8)
    notes: Optional[str] = None


class DailyRoutineSummaryResponse(BaseModel):
    date: str
    total_reminders: int
    completed_reminders: int
    adherence_percentage: float
    hydration_glasses_logged: int
    hydration_target_glasses: int = 8
    pending_medicines_count: int
    upcoming_appointments_count: int
    streak_days: int
    reminders: List[ReminderResponse] = Field(default_factory=list)


# ── 3. Game Integration Pack Schemas ──────────────────────────────────────────

class GamePackItem(BaseModel):
    id: str
    label: str
    sublabel: str
    icon_or_photo: str
    category: str


class GamePackResponse(BaseModel):
    has_personal_items: bool
    total_personal_items: int
    match_pairs: List[GamePackItem] = Field(default_factory=list)
    recognition_questions: List[Dict[str, Any]] = Field(default_factory=list)
    routine_sequence: List[Dict[str, Any]] = Field(default_factory=list)
