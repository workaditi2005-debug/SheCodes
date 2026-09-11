from __future__ import annotations

from typing import Any, Optional

from fastapi import APIRouter, Header, HTTPException

from core.clinical_config import (
    DOMAIN_WEIGHTS,
    FATIGUE_CONFIDENCE_THRESHOLD,
    SAFE_OUTPUT_LANGUAGE,
    apply_condition_multipliers,
    compute_confidence_score,
    get_education_correction,
)
from core.ml_engine import (
    analyze_all_progress_anomalies,
    compute_confidence_interval,
    compute_feature_importance,
    compute_hybrid_risk,
)
from core.storage import results_store
from core.progress_tracker import build_progress_summary
from models.schemas import AnalyzeRequest, AnalyzeResponse, DiseaseRiskLevels
from services import auth_service
from services.ai_service import (
    _prob_to_level,
    build_feature_vector,
    compute_disease_risks,
    extract_executive_features,
    extract_memory_features,
    extract_motor_features,
    extract_reaction_features,
    extract_speech_features,
)
from utils.logger import log_info


router = APIRouter(tags=["analysis"])
DISCLAIMER = SAFE_OUTPUT_LANGUAGE["disclaimer"]


def _compute_composite_risk(speech: float, memory: float, reaction: float, executive: float, motor: float) -> float:
    values = {
        "speech": speech,
        "memory": memory,
        "reaction": reaction,
        "executive": executive,
        "motor": motor,
    }
    risk = sum(DOMAIN_WEIGHTS[key] * (100.0 - values[key]) for key in values)
    return round(max(0.0, min(100.0, risk)), 2)


def _compute_risk_drivers(speech: float, memory: float, reaction: float, executive: float, motor: float) -> dict[str, float]:
    contributions = {
        "speech": DOMAIN_WEIGHTS["speech"] * (100.0 - speech),
        "memory": DOMAIN_WEIGHTS["memory"] * (100.0 - memory),
        "reaction": DOMAIN_WEIGHTS["reaction"] * (100.0 - reaction),
        "executive": DOMAIN_WEIGHTS["executive"] * (100.0 - executive),
        "motor": DOMAIN_WEIGHTS["motor"] * (100.0 - motor),
    }
    total = sum(contributions.values()) or 1.0
    percentages = {key: round((value / total) * 100) for key, value in contributions.items()}
    return {
        "memory_recall_contribution_pct": percentages["memory"],
        "executive_function_contribution_pct": percentages["executive"],
        "speech_delay_contribution_pct": percentages["speech"],
        "reaction_time_contribution_pct": percentages["reaction"],
        "motor_consistency_contribution_pct": percentages["motor"],
    }


def _optional_user(authorization: Optional[str]) -> Optional[dict[str, Any]]:
    token = auth_service.extract_bearer_token(authorization)
    return auth_service.get_user_from_token(token)


@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze(payload: AnalyzeRequest, authorization: Optional[str] = Header(default=None)) -> AnalyzeResponse:
    log_info("analysis request received")
    try:
        speech_score, speech_features = extract_speech_features(payload.speech_audio or None, payload.speech)
        memory_score, memory_features = extract_memory_features(payload.memory_results, payload.memory)
        reaction_score, reaction_features = extract_reaction_features(payload.reaction_times, payload.reaction)
        executive_score, executive_features = extract_executive_features(payload.stroop)
        motor_score, motor_features = extract_motor_features(payload.tap)
        feature_vector = build_feature_vector(
            speech_features,
            memory_features,
            reaction_features,
            executive_features,
            motor_features,
        )
        risks = compute_disease_risks(feature_vector, payload.profile)
    except Exception as exc:
        raise HTTPException(status_code=422, detail=f"Processing error: {exc}") from exc

    conditions = payload.conditions.model_dump() if payload.conditions else {}
    fatigue = payload.fatigue.model_dump() if payload.fatigue else {}

    alz_risk = apply_condition_multipliers(risks["alzheimers_risk"], conditions)
    dementia_risk = apply_condition_multipliers(risks["dementia_risk"], conditions)
    parkinsons_risk = apply_condition_multipliers(risks["parkinsons_risk"], conditions)

    if payload.profile and payload.profile.education_level:
        memory_score = max(0.0, min(100.0, memory_score + get_education_correction(payload.profile.education_level) * 100))

    confidence = compute_confidence_score(0.0, fatigue)
    recommend_retest = confidence < FATIGUE_CONFIDENCE_THRESHOLD
    hybrid_risk = compute_hybrid_risk(alz_risk, risks["alzheimers_risk"])
    confidence_interval = compute_confidence_interval(hybrid_risk)
    composite_risk = _compute_composite_risk(speech_score, memory_score, reaction_score, executive_score, motor_score)
    risk_drivers = _compute_risk_drivers(speech_score, memory_score, reaction_score, executive_score, motor_score)
    feature_importance = compute_feature_importance(feature_vector.model_dump(), disease="alzheimers")
    model_validation = {
        "sensitivity": 0.82,
        "specificity": 0.78,
        "auc": 0.85,
        "note": "Simulated validation due to absence of a clinical dataset.",
    }

    mean_rt = reaction_features.get("mean_rt", 1.0)
    std_rt = reaction_features.get("std_rt", 0.0)
    attention_variability_index = round(std_rt / mean_rt, 4) if mean_rt > 0 else 0.0

    result_data = {
        "timestamp": auth_service.utcnow_iso(),
        "createdAt": auth_service.utcnow_iso(),
        "speech_score": speech_score,
        "memory_score": memory_score,
        "reaction_score": reaction_score,
        "executive_score": executive_score,
        "motor_score": motor_score,
        "alzheimers_risk": alz_risk,
        "dementia_risk": dementia_risk,
        "parkinsons_risk": parkinsons_risk,
        "composite_risk_score": composite_risk,
        "hybrid_risk": hybrid_risk,
        "confidence": confidence,
        "risk_levels": {
            "alzheimers": _prob_to_level(alz_risk),
            "dementia": _prob_to_level(dementia_risk),
            "parkinsons": _prob_to_level(parkinsons_risk),
        },
        "attention_variability_index": attention_variability_index,
        "disclaimer": DISCLAIMER,
    }

    anomaly_result = {"overall_alert": "none", "metrics": {}}
    current_user = _optional_user(authorization)
    if current_user:
        results = results_store.read()
        history = results.get(current_user["id"], [])
        anomaly_result = analyze_all_progress_anomalies(history, result_data)
        history.append(result_data)
        results[current_user["id"]] = history[-20:]
        results_store.write(results)

    return AnalyzeResponse(
        speech_score=speech_score,
        memory_score=memory_score,
        reaction_score=reaction_score,
        executive_score=executive_score,
        motor_score=motor_score,
        alzheimers_risk=alz_risk,
        dementia_risk=dementia_risk,
        parkinsons_risk=parkinsons_risk,
        risk_levels=DiseaseRiskLevels(
            alzheimers=_prob_to_level(alz_risk),
            dementia=_prob_to_level(dementia_risk),
            parkinsons=_prob_to_level(parkinsons_risk),
        ),
        composite_risk_score=composite_risk,
        hybrid_risk=hybrid_risk,
        confidence=confidence,
        recommend_retest=recommend_retest,
        ci_lower=confidence_interval["ci_lower"],
        ci_upper=confidence_interval["ci_upper"],
        ci_label=confidence_interval["ci_label"],
        logistic_risk_probability=alz_risk,
        confidence_interval_label=confidence_interval["ci_label"],
        anomaly_alert=anomaly_result["overall_alert"],
        anomaly_details=anomaly_result["metrics"] if anomaly_result["overall_alert"] != "none" else None,
        risk_drivers=risk_drivers,
        feature_importance=feature_importance,
        model_validation=model_validation,
        feature_vector=feature_vector,
        attention_variability_index=attention_variability_index,
        disclaimer=DISCLAIMER,
    )


@router.get("/results/my")
def get_my_results(authorization: str = Header(...)) -> dict[str, Any]:
    user = auth_service.require_user(authorization)
    results = results_store.read()
    user_results = results.get(user["id"], [])
    from services.audit_service import record
    record(
        event="phi.read_self",
        actor_id=user["id"],
        actor_role=user.get("role"),
        subject_id=user["id"],
        outcome="success",
        metadata={"record_count": len(user_results)},
    )
    return {"results": user_results, "progress": build_progress_summary(user_results)}


@router.get("/results/patient/{patient_id}")
def get_patient_results(patient_id: str, authorization: str = Header(...)) -> dict[str, Any]:
    care_member = auth_service.require_care_team(authorization)
    from services.audit_service import record
    from routers.consent_api import check_patient_consent

    # 1. Enforce doctor/caregiver care relationship
    if not auth_service.verify_doctor_patient_relationship(care_member["id"], patient_id):
        record(
            event="phi.access_denied",
            actor_id=care_member["id"],
            actor_role=care_member.get("role"),
            subject_id=patient_id,
            outcome="forbidden",
            metadata={"reason": "unassigned_patient", "resource": "cognitive_results"},
        )
        raise HTTPException(status_code=403, detail="This patient is not assigned to your care team.")

    # 2. Enforce patient consent
    if not check_patient_consent(patient_id, "share_with_care_team"):
        record(
            event="phi.access_denied",
            actor_id=care_member["id"],
            actor_role=care_member.get("role"),
            subject_id=patient_id,
            outcome="forbidden",
            metadata={"reason": "consent_withheld", "resource": "cognitive_results"},
        )
        raise HTTPException(status_code=403, detail="Patient has not granted consent to share screening results with care team.")

    results = results_store.read()
    patient_results = results.get(patient_id, [])

    record(
        event="phi.read",
        actor_id=care_member["id"],
        actor_role=care_member.get("role"),
        subject_id=patient_id,
        outcome="success",
        metadata={"record_count": len(patient_results), "resource": "cognitive_results"},
    )
    return {"results": patient_results, "progress": build_progress_summary(patient_results)}


