"""
NeuroAid AI Service — app.py
==============================
FastAPI entry point for the standalone AI microservice.
Handles /analyze (feature scoring) and /rag/ask (educational RAG chatbot).

This service does NOT provide medical diagnosis.
It provides early cognitive risk signals for further evaluation.
"""

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Optional
import logging

from feature_extractor import (
    extract_speech_features,
    extract_memory_features,
    extract_reaction_features,
)
from scoring_engine import (
    compute_risk_score,
    compute_full_risk_pipeline,
    map_risk_level,
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

DISCLAIMER = (
    "⚠️ This tool does NOT provide medical diagnosis. "
    "It provides early cognitive risk signals for further evaluation. "
    "Always consult a qualified neurologist or physician."
)

app = FastAPI(
    title="NeuroAid AI Service",
    description=(
        "Early Cognitive Risk Indicator API. "
        "Screening approach inspired by MMSE and MoCA principles. "
        "This tool does NOT provide medical diagnosis."
    ),
    version="2.1.0",
)


# ── Request / Response models ──────────────────────────────────────────────────

class MedicalConditions(BaseModel):
    diabetes: bool = False
    hypertension: bool = False
    stroke_history: bool = False
    family_alzheimers: bool = False
    parkinsons_dx: bool = False
    depression: bool = False
    thyroid_disorder: bool = False

class FatigueFlags(BaseModel):
    tired: bool = False
    sleep_deprived: bool = False
    sick: bool = False
    anxious: bool = False

class AnalyzeRequest(BaseModel):
    speech_audio: str = ""
    memory_results: Dict[str, float] = {"word_recall_accuracy": 50.0, "pattern_accuracy": 50.0}
    reaction_times: List[float] = []
    age: Optional[int] = None
    education_level: Optional[int] = None
    medical_conditions: Optional[MedicalConditions] = None
    fatigue_flags: Optional[FatigueFlags] = None

class AnalyzeResponse(BaseModel):
    speech_score: float
    memory_score: float
    reaction_score: float
    risk_score: float
    risk_level: str
    risk_probability: float
    risk_level_safe: str
    adjusted_memory_score: float
    confidence_score: float
    recommend_retest: bool
    retest_message: Optional[str]
    disclaimer: str


# ── Routes ─────────────────────────────────────────────────────────────────────

@app.get("/", tags=["Health"])
def root():
    return {
        "status": "ok",
        "service": "NeuroAid AI Service",
        "version": "2.1.0",
        "note": DISCLAIMER,
    }


@app.post("/analyze", response_model=AnalyzeResponse, tags=["Analysis"])
def analyze(payload: AnalyzeRequest):
    """
    Run 4-layer cognitive risk pipeline:
      1. Age-adjusted normalization
      2. Education correction (cognitive reserve)
      3. Medical condition multipliers
      4. Fatigue confidence scoring
    """
    try:
        speech_score   = extract_speech_features(payload.speech_audio)
        memory_score   = extract_memory_features(payload.memory_results)
        reaction_score = extract_reaction_features(payload.reaction_times)

        risk_score = compute_risk_score(speech_score, memory_score, reaction_score)
        risk_level = map_risk_level(risk_score)

        conditions    = payload.medical_conditions.dict() if payload.medical_conditions else {}
        fatigue_dict  = payload.fatigue_flags.dict()      if payload.fatigue_flags      else {}
        provided      = sum([bool(payload.speech_audio), bool(payload.memory_results), bool(payload.reaction_times)])
        missing_ratio = 1.0 - (provided / 3.0)

        pipeline_result = compute_full_risk_pipeline(
            speech_score=speech_score, memory_score=memory_score, reaction_score=reaction_score,
            age=payload.age, education_level=payload.education_level,
            conditions=conditions, fatigue_flags=fatigue_dict, missing_data_ratio=missing_ratio,
        )

        return AnalyzeResponse(
            speech_score=round(speech_score, 2),
            memory_score=round(memory_score, 2),
            reaction_score=round(reaction_score, 2),
            risk_score=round(risk_score, 2),
            risk_level=risk_level,
            risk_probability=pipeline_result["risk_probability"],
            risk_level_safe=pipeline_result["risk_level"],
            adjusted_memory_score=pipeline_result["adjusted_memory_score"],
            confidence_score=pipeline_result["confidence"],
            recommend_retest=pipeline_result["recommend_retest"],
            retest_message=pipeline_result["retest_message"],
            disclaimer=DISCLAIMER,
        )
    except Exception as e:
        logger.error(f"Error during analysis: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ── RAG Educational Chatbot ────────────────────────────────────────────────────
from rag_service import answer_educational_question

class RagRequest(BaseModel):
    question: str
    user_context: Optional[dict] = None

class RagResponse(BaseModel):
    answer: str
    sources: list = []
    guardrail_triggered: bool = False
    disclaimer: str

@app.post("/rag/ask", response_model=RagResponse, tags=["Education / RAG"])
def rag_ask(payload: RagRequest):
    """
    Educational Q&A backed by the RAG knowledge base.
    References: NIH, WHO, Alzheimer's Association, Parkinson's Foundation.
    Refuses diagnosis and medication questions (guardrails enforced).
    """
    result = answer_educational_question(payload.question, payload.user_context)
    return RagResponse(
        answer=result["answer"],
        sources=result.get("sources", []),
        guardrail_triggered=result.get("guardrail_triggered", False),
        disclaimer=DISCLAIMER,
    )
