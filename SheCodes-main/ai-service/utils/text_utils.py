"""
NeuroAid AI Service - Text Utilities
======================================
Helper functions for preprocessing and analysing text transcriptions
produced by Whisper (or any ASR system) before feeding them into
the NLP feature pipeline.
"""

import logging
import re
from typing import List

logger = logging.getLogger(__name__)


def preprocess_text(raw_text: str) -> str:
    """
    Clean and normalise a raw ASR transcription.

    Steps (production):
      - Lowercase
      - Remove filler words ("um", "uh", "er", …) for structural analysis
      - Strip punctuation artifacts introduced by ASR

    Args:
        raw_text: Raw transcription string.

    Returns:
        Cleaned string ready for NLP feature extraction.
    """
    logger.info("preprocess_text called.")

    if not raw_text:
        return ""

    # Lowercase
    text = raw_text.lower()

    # Remove common ASR artifacts (e.g., "[NOISE]", "<unk>")
    text = re.sub(r"\[.*?\]", "", text)
    text = re.sub(r"<.*?>", "", text)

    # Collapse multiple spaces
    text = re.sub(r"\s+", " ", text).strip()

    # ── Extend with real NLP preprocessing in production ──────────────────
    return text


def count_filler_words(text: str) -> int:
    """
    Count filler words ("um", "uh", "er", "like", "you know") in a transcript.

    High filler-word counts can indicate word-finding difficulty.

    Args:
        text: Preprocessed transcription string.

    Returns:
        Integer count of filler occurrences.
    """
    fillers = {"um", "uh", "er", "erm", "like", "you know", "basically", "literally"}
    words   = text.lower().split()
    count   = sum(1 for w in words if w in fillers)
    logger.debug(f"count_filler_words: {count} fillers found.")
    return count


def compute_vocabulary_richness(text: str) -> float:
    """
    Compute type-token ratio (TTR) as a proxy for vocabulary richness.

    TTR = unique_words / total_words; lower TTR can indicate vocabulary decline.

    Args:
        text: Preprocessed transcription string.

    Returns:
        Float in [0.0, 1.0]; returns 0.0 for empty input.
    """
    words = text.lower().split()
    if not words:
        return 0.0

    ttr = len(set(words)) / len(words)
    logger.debug(f"compute_vocabulary_richness: TTR={ttr:.3f}")
    return ttr


def tokenize(text: str) -> List[str]:
    """
    Simple whitespace tokeniser.

    Args:
        text: Input string.

    Returns:
        List of word tokens.
    """
    return text.split()
