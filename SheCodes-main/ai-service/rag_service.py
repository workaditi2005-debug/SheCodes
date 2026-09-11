"""
NeuroAid AI Service - RAG Educational Layer
=============================================
NEW FILE v2.0 — Retrieval-Augmented Generation for educational Q&A.

Purpose:
  - Explain risk indicators in plain language to users
  - Retrieve from a controlled, curated knowledge base only
  - Enforce strict guardrails: NO diagnosis, NO medication advice
  - Reference only trusted sources: NIH, WHO, Alzheimer's Association,
    Parkinson's Foundation

Architecture:
  User question
    → Guardrail check (refuse if asking for diagnosis / medication)
    → Retrieve relevant chunk from knowledge base
    → Generate safe educational response
    → Append disclaimer
"""

import logging
from typing import Optional

from knowledge_base.guardrails import check_guardrails
from knowledge_base.index import retrieve_relevant_chunks

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are an educational assistant for NeuroAid.

RULES (non-negotiable):
1. You do NOT diagnose diseases.
2. You do NOT provide medical treatment advice or medication recommendations.
3. You explain cognitive risk indicators in simple, non-alarming language.
4. You always recommend consulting a neurologist for clinical decisions.
5. You only reference information from: NIH, WHO, Alzheimer's Association,
   Parkinson's Foundation, or the NeuroAid knowledge base.
6. You never say "You have [disease]" or "You likely have [disease]".
7. If you cannot answer from the knowledge base, say so and recommend a specialist.

SAFE LANGUAGE:
- Instead of "You have Alzheimer's" → "Elevated memory indicators detected"
- Instead of "You need medication" → "A neurologist can discuss treatment options"
- Instead of "This confirms dementia" → "These results suggest further evaluation may be helpful"
"""

DISCLAIMER = (
    "\n\n---\n⚠️ This is NOT medical advice. Always consult a qualified neurologist "
    "or physician for clinical evaluation and treatment decisions."
)


def answer_educational_question(
    question: str,
    user_context: Optional[dict] = None,
) -> dict:
    """
    Answer a user's educational question about cognitive health.

    Args:
        question: The user's natural language question.
        user_context: Optional dict with age, risk scores for personalization.

    Returns:
        Dict with 'answer', 'sources', 'guardrail_triggered', 'disclaimer'.
    """
    logger.info(f"RAG query: {question[:80]}")

    # ── Guardrail check ────────────────────────────────────────────────────
    guardrail_result = check_guardrails(question)
    if guardrail_result["blocked"]:
        logger.warning(f"Guardrail triggered: {guardrail_result['reason']}")
        return {
            "answer": guardrail_result["safe_response"],
            "sources": [],
            "guardrail_triggered": True,
            "reason": guardrail_result["reason"],
            "disclaimer": DISCLAIMER,
        }

    # ── Retrieve relevant chunks ───────────────────────────────────────────
    chunks = retrieve_relevant_chunks(question, top_k=3)

    if not chunks:
        return {
            "answer": (
                "I don't have specific information about that topic in my knowledge base. "
                "I recommend consulting the Alzheimer's Association (alz.org), "
                "the NIH National Institute on Aging (nia.nih.gov), or speaking "
                "with a neurologist for accurate information."
            ),
            "sources": [],
            "guardrail_triggered": False,
            "disclaimer": DISCLAIMER,
        }

    # ── Compose answer from retrieved chunks ───────────────────────────────
    context = "\n\n".join(
        f"[{c['source']}]: {c['text']}" for c in chunks
    )

    # In production: pass context + question to an LLM with SYSTEM_PROMPT.
    # For now, return structured educational response.
    answer = _compose_educational_answer(question, chunks, user_context)

    return {
        "answer": answer + DISCLAIMER,
        "sources": [c["source"] for c in chunks],
        "guardrail_triggered": False,
        "disclaimer": DISCLAIMER,
    }


def _compose_educational_answer(
    question: str,
    chunks: list,
    user_context: Optional[dict],
) -> str:
    """
    Compose a safe educational answer from retrieved chunks.
    In production replace with LLM call using SYSTEM_PROMPT + context.
    """
    intro = "Based on information from trusted neurological health sources:\n\n"
    body = "\n\n".join(c["text"] for c in chunks[:2])
    outro = (
        "\n\nFor personalized evaluation, please consult a neurologist "
        "or visit the Alzheimer's Association (alz.org) or "
        "Parkinson's Foundation (parkinson.org) for more resources."
    )
    return intro + body + outro
