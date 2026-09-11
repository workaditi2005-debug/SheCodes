"""
demo_api.py — Deterministic SIH Demo Mode Seeder and Controller
================================================================
Seeds verified synthetic demo data for Smart India Hackathon (SIH PS 26003) judges.
All data is clearly labelled as synthetic.
Screening output is strictly for early cognitive risk indicators and educational purposes,
never a clinical diagnosis.
"""
from __future__ import annotations

from typing import Any, Dict, List
from fastapi import APIRouter

from core.security import hash_password, hash_token
from core.storage import (
    consent_store,
    game_sessions_store,
    memory_bank_store,
    messages_store,
    reminders_store,
    results_store,
    routine_logs_store,
    sessions_store,
    users_store,
)
from services.audit_service import record, utcnow_iso

router = APIRouter(prefix="/demo", tags=["sih-demo"])

DEMO_PATIENT_ID = "sih-demo-patient-001"
DEMO_DOCTOR_ID = "sih-demo-doctor-001"
DEMO_CAREGIVER_ID = "sih-demo-caregiver-001"

DEMO_PATIENT_TOKEN = "sih_demo_patient_token_deterministic_2026"
DEMO_DOCTOR_TOKEN = "sih_demo_doctor_token_deterministic_2026"
DEMO_CAREGIVER_TOKEN = "sih_demo_caregiver_token_deterministic_2026"


@router.post("/reset-and-seed")
def reset_and_seed_demo() -> Dict[str, Any]:
    """
    Seed deterministic synthetic demo data for SIH judges.
    Idempotent and resets state to a clean baseline.
    """
    now = utcnow_iso()

    # 1. Synthetic Users
    patient = {
        "id": DEMO_PATIENT_ID,
        "full_name": "Biren Das (Demo Patient)",
        "email": "biren.das@sihdemo.local",
        "password_hash": hash_password("DemoPassword#2026"),
        "role": "patient",
        "age": 68,
        "gender": "Male",
        "phone": "+91 98640 12345",
        "assigned_doctor_id": DEMO_DOCTOR_ID,
        "education": "Graduate",
        "occupation": "Retired High School Teacher (Assam)",
        "location": "Guwahati, Assam",
        "created_at": now,
        "last_login": now,
    }

    doctor = {
        "id": DEMO_DOCTOR_ID,
        "full_name": "Dr. Rupjyoti Hazarika",
        "email": "dr.hazarika@sihdemo.local",
        "password_hash": hash_password("DemoPassword#2026"),
        "role": "doctor",
        "specialization": "Cognitive Neurologist",
        "hospital": "Guwahati Medical College & Hospital (GMCH)",
        "location": "Guwahati, Assam",
        "years_experience": 18,
        "consultation_mode": "Both",
        "bio": "Specialist in neurodegenerative screening, MCI longitudinal monitoring, and community cognitive health.",
        "max_patients": 20,
        "current_patients": 1,
        "patient_list": [DEMO_PATIENT_ID],
        "pending_requests": [],
        "created_at": now,
        "last_login": now,
    }

    caregiver = {
        "id": DEMO_CAREGIVER_ID,
        "full_name": "Ananya Das (Caregiver)",
        "email": "ananya.das@sihdemo.local",
        "password_hash": hash_password("DemoPassword#2026"),
        "role": "caregiver",
        "specialization": "Family Caregiver",
        "hospital": "Home Care Network, Assam",
        "location": "Guwahati, Assam",
        "patient_list": [DEMO_PATIENT_ID],
        "created_at": now,
        "last_login": now,
    }

    users = users_store.read()
    users[DEMO_PATIENT_ID] = patient
    users[DEMO_DOCTOR_ID] = doctor
    users[DEMO_CAREGIVER_ID] = caregiver
    users_store.write(users)

    # 2. Synthetic Hashed Sessions
    sessions = sessions_store.read()
    sessions[hash_token(DEMO_PATIENT_TOKEN)] = {"user_id": DEMO_PATIENT_ID, "created_at": now, "last_active": now}
    sessions[hash_token(DEMO_DOCTOR_TOKEN)] = {"user_id": DEMO_DOCTOR_ID, "created_at": now, "last_active": now}
    sessions[hash_token(DEMO_CAREGIVER_TOKEN)] = {"user_id": DEMO_CAREGIVER_ID, "created_at": now, "last_active": now}
    sessions_store.write(sessions)

    # 3. Synthetic Consent
    consents = consent_store.read()
    consents[DEMO_PATIENT_ID] = {
        "share_with_care_team": True,
        "share_memory_bank": True,
        "share_reminders": True,
        "allow_research_deidentified": True,
        "updated_at": now,
        "policy_version": "2026-v2-sih-demo",
    }
    consent_store.write(consents)

    # 4. Synthetic Personal Memory Bank (Culturally rooted in Assam)
    memories: List[Dict[str, Any]] = [
        {
            "id": "mem-sih-001",
            "user_id": DEMO_PATIENT_ID,
            "category": "person",
            "name": "Aarav (Grandson)",
            "relationship_or_context": "নাতি (Grandson), lives in Guwahati, loves cricket",
            "photo_url": None,
            "image_emoji": "👦",
            "notes": "Always visits on Sunday afternoons. Loves grandma's homemade pitha.",
            "audio_cue": None,
            "added_by": "caregiver",
            "created_at": now,
            "updated_at": now,
        },
        {
            "id": "mem-sih-002",
            "user_id": DEMO_PATIENT_ID,
            "category": "person",
            "name": "Maya (Daughter)",
            "relationship_or_context": "কন্যা (Daughter), calls every evening at 7:00 PM",
            "photo_url": None,
            "image_emoji": "👩",
            "notes": "Civil engineer in Tezpur. Always asks about medicine routine.",
            "audio_cue": None,
            "added_by": "caregiver",
            "created_at": now,
            "updated_at": now,
        },
        {
            "id": "mem-sih-003",
            "user_id": DEMO_PATIENT_ID,
            "category": "place",
            "name": "Jorhat Ancestral Tea Garden",
            "relationship_or_context": "পুৰণি চাহ বাগিচা (Ancestral home in Upper Assam)",
            "photo_url": None,
            "image_emoji": "🍵",
            "notes": "Visited every Bihu festival with family.",
            "audio_cue": None,
            "added_by": "patient",
            "created_at": now,
            "updated_at": now,
        },
        {
            "id": "mem-sih-004",
            "user_id": DEMO_PATIENT_ID,
            "category": "item",
            "name": "Assamese Japi & Gamosa",
            "relationship_or_context": "সাংস্কৃতিক চিন (Traditional gift received upon retirement)",
            "photo_url": None,
            "image_emoji": "👒",
            "notes": "Kept in the study room showcase.",
            "audio_cue": None,
            "added_by": "patient",
            "created_at": now,
            "updated_at": now,
        },
    ]
    # Filter out previous demo memories and re-add
    existing_mem = [m for m in memory_bank_store.read() if m.get("user_id") != DEMO_PATIENT_ID]
    memory_bank_store.write(existing_mem + memories)

    # 5. Synthetic Reminders
    reminders: List[Dict[str, Any]] = [
        {
            "id": "rem-sih-001",
            "user_id": DEMO_PATIENT_ID,
            "category": "medicine",
            "title": "Donepezil 5mg (মগজুৰ ঔষধ)",
            "description": "Morning memory maintenance prescribed by Dr. Hazarika",
            "scheduled_time": "08:00",
            "recurrence": "daily",
            "days_of_week": ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
            "dosage": "1 tablet after breakfast",
            "instructions": "Take with warm water",
            "status": "pending",
            "last_completed_at": None,
            "created_by": "caregiver",
            "created_at": now,
        },
        {
            "id": "rem-sih-002",
            "user_id": DEMO_PATIENT_ID,
            "category": "hydration",
            "title": "Drink a Glass of Water (পানী খোৱা)",
            "description": "Hydration reminder to reduce cognitive fatigue",
            "scheduled_time": "11:30",
            "recurrence": "daily",
            "days_of_week": ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
            "dosage": "1 full glass (250ml)",
            "instructions": None,
            "status": "pending",
            "last_completed_at": None,
            "created_by": "patient",
            "created_at": now,
        },
        {
            "id": "rem-sih-003",
            "user_id": DEMO_PATIENT_ID,
            "category": "activity",
            "title": "Evening Walk & Breathing (সন্ধিয়া খোজকঢ়া)",
            "description": "Light walk in the garden",
            "scheduled_time": "17:00",
            "recurrence": "daily",
            "days_of_week": ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
            "dosage": "20 minutes gentle pacing",
            "instructions": "Wear comfortable walking shoes",
            "status": "pending",
            "last_completed_at": None,
            "created_by": "caregiver",
            "created_at": now,
        },
    ]
    existing_rem = [r for r in reminders_store.read() if r.get("user_id") != DEMO_PATIENT_ID]
    reminders_store.write(existing_rem + reminders)

    # 6. Synthetic 6-Week Longitudinal Assessments & Explainable Alerts
    # Week 1 to Week 6: Speech 78->71, Memory 75->56, Reaction 76->60
    synthetic_results = [
        {
            "timestamp": "2026-01-20T10:00:00Z",
            "createdAt": "2026-01-20T10:00:00Z",
            "speech_score": 82.0,
            "memory_score": 78.0,
            "reaction_score": 80.0,
            "executive_score": 76.0,
            "motor_score": 84.0,
            "composite_risk_score": 20.0,
            "hybrid_risk": 21.5,
            "confidence": 0.88,
            "risk_levels": {"alzheimers": "Low", "dementia": "Low", "parkinsons": "Low"},
            "attention_variability_index": 0.12,
            "anomaly_alert": "none",
            "disclaimer": "Synthetic demonstration data. Screening indicators only, not a clinical diagnosis.",
        },
        {
            "timestamp": "2026-01-27T10:00:00Z",
            "createdAt": "2026-01-27T10:00:00Z",
            "speech_score": 80.0,
            "memory_score": 74.0,
            "reaction_score": 76.0,
            "executive_score": 75.0,
            "motor_score": 82.0,
            "composite_risk_score": 23.5,
            "hybrid_risk": 24.0,
            "confidence": 0.86,
            "risk_levels": {"alzheimers": "Low", "dementia": "Low", "parkinsons": "Low"},
            "attention_variability_index": 0.14,
            "anomaly_alert": "none",
            "disclaimer": "Synthetic demonstration data. Screening indicators only, not a clinical diagnosis.",
        },
        {
            "timestamp": "2026-02-03T10:00:00Z",
            "createdAt": "2026-02-03T10:00:00Z",
            "speech_score": 76.0,
            "memory_score": 68.0,
            "reaction_score": 72.0,
            "executive_score": 72.0,
            "motor_score": 80.0,
            "composite_risk_score": 28.0,
            "hybrid_risk": 29.5,
            "confidence": 0.85,
            "risk_levels": {"alzheimers": "Mild Concern", "dementia": "Low", "parkinsons": "Low"},
            "attention_variability_index": 0.16,
            "anomaly_alert": "none",
            "disclaimer": "Synthetic demonstration data. Screening indicators only, not a clinical diagnosis.",
        },
        {
            "timestamp": "2026-02-10T10:00:00Z",
            "createdAt": "2026-02-10T10:00:00Z",
            "speech_score": 74.0,
            "memory_score": 64.0,
            "reaction_score": 68.0,
            "executive_score": 70.0,
            "motor_score": 78.0,
            "composite_risk_score": 32.0,
            "hybrid_risk": 33.0,
            "confidence": 0.82,
            "risk_levels": {"alzheimers": "Mild Concern", "dementia": "Low", "parkinsons": "Low"},
            "attention_variability_index": 0.18,
            "anomaly_alert": "none",
            "disclaimer": "Synthetic demonstration data. Screening indicators only, not a clinical diagnosis.",
        },
        {
            "timestamp": "2026-02-17T10:00:00Z",
            "createdAt": "2026-02-17T10:00:00Z",
            "speech_score": 71.0,
            "memory_score": 60.0,
            "reaction_score": 64.0,
            "executive_score": 68.0,
            "motor_score": 76.0,
            "composite_risk_score": 36.5,
            "hybrid_risk": 37.0,
            "confidence": 0.80,
            "risk_levels": {"alzheimers": "Moderate", "dementia": "Mild Concern", "parkinsons": "Low"},
            "attention_variability_index": 0.22,
            "anomaly_alert": "mild_variance",
            "disclaimer": "Synthetic demonstration data. Screening indicators only, not a clinical diagnosis.",
        },
        {
            "timestamp": "2026-02-24T10:00:00Z",
            "createdAt": "2026-02-24T10:00:00Z",
            "speech_score": 68.0,
            "memory_score": 56.0,
            "reaction_score": 60.0,
            "executive_score": 66.0,
            "motor_score": 75.0,
            "composite_risk_score": 41.5,
            "hybrid_risk": 43.0,
            "confidence": 0.79,
            "risk_levels": {"alzheimers": "Moderate", "dementia": "Moderate", "parkinsons": "Low"},
            "attention_variability_index": 0.28,
            "anomaly_alert": "significant_drift",
            "anomaly_details": {
                "detected": True,
                "metric": "attention_variability",
                "drift_percentage": "+19.4%",
                "baseline_mean_rt": "285ms",
                "current_mean_rt": "341ms",
                "explanation": "Reaction time variability drifted +19.4% above personal 4-week moving baseline, combined with word-recall latency. Flags candidate for clinician review.",
            },
            "feature_importance": [
                {"feature": "word_recall_accuracy", "importance": 0.38},
                {"feature": "speech_hesitation_ratio", "importance": 0.26},
                {"feature": "reaction_time_variability", "importance": 0.21},
                {"feature": "stroop_interference", "importance": 0.15},
            ],
            "recommend_retest": False,
            "disclaimer": "Synthetic demonstration data. Screening indicators only, not a clinical diagnosis.",
        },
    ]

    all_res = results_store.read()
    all_res[DEMO_PATIENT_ID] = synthetic_results
    results_store.write(all_res)

    record(
        event="demo.seeded",
        actor_id="sih_system",
        outcome="success",
        metadata={"patient_id": DEMO_PATIENT_ID, "doctor_id": DEMO_DOCTOR_ID},
    )

    return {
        "status": "ok",
        "message": "SIH deterministic demo data initialized successfully.",
        "patient": {"id": DEMO_PATIENT_ID, "name": patient["full_name"], "token": DEMO_PATIENT_TOKEN},
        "doctor": {"id": DEMO_DOCTOR_ID, "name": doctor["full_name"], "token": DEMO_DOCTOR_TOKEN},
        "caregiver": {"id": DEMO_CAREGIVER_ID, "name": caregiver["full_name"], "token": DEMO_CAREGIVER_TOKEN},
    }
