"""
NeuroAid Backend - Chat/RAG Router
====================================
NEW FILE v2.0

Exposes the RAG educational chatbot endpoint.
Integrates with the ai-service RAG pipeline.

Endpoint: POST /api/chat
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
import httpx
import os

from utils.logger import log_info

router = APIRouter()

AI_SERVICE_URL = os.getenv("AI_SERVICE_URL", "http://localhost:8001")

GUARDRAIL_PATTERNS = [
    "do i have", "have i got", "am i diagnosed", "confirm i have",
    "which medicine", "what medicine", "should i take", "dosage", "prescribe",
]

DISCLAIMER = (
    "⚠️ This is NOT medical advice. Always consult a qualified neurologist "
    "or physician for clinical evaluation and treatment decisions."
)

DIAGNOSIS_RESPONSE = (
    "NeuroAid cannot provide a diagnosis. This screening tool identifies "
    "cognitive risk indicators for educational purposes only. "
    "For a clinical diagnosis, please consult a qualified neurologist or physician."
)

MEDICATION_RESPONSE = (
    "NeuroAid cannot provide medication or treatment advice. "
    "Only a qualified physician or neurologist can recommend appropriate treatment. "
    "Please consult your doctor for personalized medical guidance."
)


class ChatRequest(BaseModel):
    question: str
    user_context: Optional[dict] = None   # age, recent scores, etc.

class ChatResponse(BaseModel):
    answer: str
    sources: list = []
    guardrail_triggered: bool = False
    disclaimer: str = DISCLAIMER


def _check_local_guardrails(question: str) -> Optional[str]:
    """Fast local guardrail check before forwarding to AI service."""
    q = question.lower()
    if any(p in q for p in ["do i have", "am i diagnosed", "confirm i have", "is this alzheimer"]):
        return DIAGNOSIS_RESPONSE
    if any(p in q for p in ["which medicine", "what medicine", "should i take", "dosage", "prescrib"]):
        return MEDICATION_RESPONSE
    return None


@router.post("/chat", response_model=ChatResponse)
async def chat(payload: ChatRequest):
    """
    Educational chatbot endpoint with RAG retrieval.

    Guardrails:
    - Refuses diagnosis requests
    - Refuses medication/treatment requests
    - Only references trusted health organization sources
    """
    log_info(f"[/api/chat] question={payload.question[:60]}")

    # Local guardrail (fast path — no network call needed)
    blocked = _check_local_guardrails(payload.question)
    if blocked:
        return ChatResponse(
            answer=blocked + f"\n\n{DISCLAIMER}",
            guardrail_triggered=True,
            disclaimer=DISCLAIMER,
        )

    # Forward to AI service RAG endpoint
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(
                f"{AI_SERVICE_URL}/rag/ask",
                json={"question": payload.question, "user_context": payload.user_context or {}},
            )
            if resp.status_code == 200:
                data = resp.json()
                return ChatResponse(
                    answer=data.get("answer", ""),
                    sources=data.get("sources", []),
                    guardrail_triggered=data.get("guardrail_triggered", False),
                    disclaimer=DISCLAIMER,
                )
    except Exception as e:
        log_info(f"[/api/chat] AI service unavailable: {e}")

    # Fallback if AI service unreachable
    return ChatResponse(
        answer=(
            "I'm currently unable to retrieve information. "
            "For trusted cognitive health resources please visit: "
            "alz.org (Alzheimer's Association), parkinson.org (Parkinson's Foundation), "
            "or nia.nih.gov (NIH National Institute on Aging)."
            f"\n\n{DISCLAIMER}"
        ),
        disclaimer=DISCLAIMER,
    )
