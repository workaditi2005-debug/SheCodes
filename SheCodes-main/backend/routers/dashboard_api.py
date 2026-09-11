"""
dashboard_api.py — RBAC Care Team Dashboard API
================================================
Aggregated cognitive telemetry, trends, and clinical metrics for clinicians and caregivers.
Enforces patient enrollment relationship, consent checks, and audit logging.
Screening output is never a clinical diagnosis.
"""
from __future__ import annotations

from typing import Any, Dict, List
from fastapi import APIRouter, Header, HTTPException

from core.storage import (
    game_sessions_store,
    memory_bank_store,
    reminders_store,
    results_store,
    routine_logs_store,
)
from routers.consent_api import check_patient_consent
from services import audit_service, auth_service

router = APIRouter(prefix="/dashboard", tags=["dashboards"])


def member(header: str) -> Dict[str, Any]:
    return auth_service.require_care_team(header)


def verify_patient_access(user: Dict[str, Any], patient_id: str) -> None:
    # 1. Enforce doctor/caregiver care relationship
    if not auth_service.verify_doctor_patient_relationship(user["id"], patient_id):
        audit_service.record(
            event="dashboard.access_denied",
            actor_id=user["id"],
            actor_role=user.get("role"),
            subject_id=patient_id,
            outcome="forbidden",
            metadata={"reason": "unassigned_patient"},
        )
        raise HTTPException(status_code=403, detail="This patient is not assigned to your care team.")

    # 2. Enforce consent
    if not check_patient_consent(patient_id, "share_with_care_team"):
        audit_service.record(
            event="dashboard.access_denied",
            actor_id=user["id"],
            actor_role=user.get("role"),
            subject_id=patient_id,
            outcome="forbidden",
            metadata={"reason": "consent_withheld"},
        )
        raise HTTPException(status_code=403, detail="Patient has not granted consent to share data with care team.")


def trend(results: List[Dict[str, Any]]) -> List[float]:
    return [
        round(
            sum(row.get(key, 0) for key in ("speech_score", "memory_score", "reaction_score", "executive_score", "motor_score")) / 5,
            1,
        )
        for row in results
    ]


def signal(latest: Dict[str, Any] | None) -> str:
    if latest and latest.get("anomaly_alert") and latest.get("anomaly_alert") != "none":
        return "Requires professional evaluation"
    if latest:
        return "Screening signal: monitor performance change"
    return "No screening data"


@router.get("/patients")
def overview(authorization: str = Header(...)) -> Dict[str, Any]:
    user = member(authorization)
    people = auth_service.list_patients_for_doctor(user["id"])
    audit_service.record(
        event="dashboard.overview_read",
        actor_id=user["id"],
        actor_role=user.get("role"),
        outcome="success",
        metadata={"patient_count": len(people)},
    )
    return {
        "role": user["role"],
        "patients": [
            {
                "id": p["id"],
                "name": p["full_name"],
                "sessions": p.get("sessionCount", 0),
                "screening_signal": signal(p.get("lastResult")),
            }
            for p in people
        ],
    }


@router.get("/patient/{patient_id}")
def detail(patient_id: str, authorization: str = Header(...)) -> Dict[str, Any]:
    user = member(authorization)
    verify_patient_access(user, patient_id)

    results = results_store.read().get(patient_id, [])
    latest = results[-1] if results else None
    reminders = [row for row in reminders_store.read() if row.get("user_id") == patient_id]

    payload: Dict[str, Any] = {
        "patient_id": patient_id,
        "screening_signal": signal(latest),
        "performance_trend": trend(results),
        "game_activity": [row for row in game_sessions_store.read() if row.get("user_id") == patient_id][-10:],
        "medication": reminders,
        "routine": reminders,
        "hydration_glasses": sum(
            row.get("glasses", 0) for row in routine_logs_store.read() if row.get("user_id") == patient_id and row.get("type") == "hydration"
        ),
        "alerts": [signal(latest)] if latest else [],
        "memory_bank": [row for row in memory_bank_store.read() if row.get("user_id") == patient_id],
    }

    if user["role"] == "doctor":
        payload["clinical"] = {
            "assessment_results": results,
            "domain_metrics": (
                {key: latest.get(key) for key in ("speech_score", "memory_score", "reaction_score", "executive_score", "motor_score")}
                if latest
                else {}
            ),
            "anomaly_detection": latest.get("anomaly_details") if latest else None,
            "session_quality": (
                {"confidence": latest.get("confidence"), "retest_recommended": latest.get("recommend_retest")}
                if latest
                else {}
            ),
            "feature_importance": latest.get("feature_importance", []),
            "patient_history": results,
        }

    audit_service.record(
        event="dashboard.patient_detail_read",
        actor_id=user["id"],
        actor_role=user.get("role"),
        subject_id=patient_id,
        outcome="success",
    )
    return payload
