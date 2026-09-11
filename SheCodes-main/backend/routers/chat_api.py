from __future__ import annotations

from typing import Any, Optional

import httpx
from fastapi import APIRouter
from pydantic import BaseModel, Field

from core.settings import settings
from utils.logger import log_info, log_warning


router = APIRouter(tags=["chat"])

DISCLAIMER = (
    "This is not medical advice. Always consult a qualified neurologist or physician "
    "for clinical evaluation and treatment decisions."
)

DIAGNOSIS_RESPONSE = (
    "NeuroAid cannot provide a diagnosis. This screening tool identifies cognitive risk "
    "indicators for educational purposes only. For a clinical diagnosis, please consult "
    "a qualified neurologist or physician."
)

MEDICATION_RESPONSE = (
    "NeuroAid cannot provide medication or treatment advice. Only a qualified physician "
    "or neurologist can recommend appropriate treatment."
)


class ChatRequest(BaseModel):
    question: str = Field(..., min_length=2, max_length=1000, description="Educational query regarding cognitive health")
    user_context: Optional[dict[str, Any]] = None


class ChatResponse(BaseModel):
    answer: str
    sources: list[str] = []
    guardrail_triggered: bool = False
    disclaimer: str = DISCLAIMER


def _guardrail_response(question: str) -> Optional[str]:
    normalized = question.lower()
    if any(pattern in normalized for pattern in ["do i have", "am i diagnosed", "confirm i have", "is this alzheimer"]):
        return DIAGNOSIS_RESPONSE
    if any(pattern in normalized for pattern in ["which medicine", "what medicine", "should i take", "dosage", "prescrib"]):
        return MEDICATION_RESPONSE
    return None


@router.post("/chat", response_model=ChatResponse)
async def chat(payload: ChatRequest) -> ChatResponse:
    log_info(f"chat request received (length: {len(payload.question)})")
    blocked = _guardrail_response(payload.question)
    if blocked:
        return ChatResponse(answer=f"{blocked}\n\n{DISCLAIMER}", guardrail_triggered=True)


    try:
        async with httpx.AsyncClient(timeout=settings.ai_service_timeout_seconds) as client:
            response = await client.post(
                f"{settings.ai_service_url}/rag/ask",
                json={"question": payload.question, "user_context": payload.user_context or {}},
            )
            response.raise_for_status()
            data = response.json()
            return ChatResponse(
                answer=data.get("answer", ""),
                sources=data.get("sources", []),
                guardrail_triggered=bool(data.get("guardrail_triggered", False)),
            )
    except Exception as exc:
        log_warning(f"AI service fallback triggered: {exc}")
        return ChatResponse(
            answer=(
                "I am currently unable to retrieve educational content. For trusted cognitive health "
                "resources, please use alz.org, parkinson.org, or nia.nih.gov.\n\n"
                f"{DISCLAIMER}"
            )
        )

