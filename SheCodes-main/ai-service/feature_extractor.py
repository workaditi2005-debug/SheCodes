"""
NeuroAid AI Service - Feature Extractor
=========================================
Provides functions to extract numerical feature scores (0–100) from
raw speech audio, memory test results, and reaction-time measurements.

In production, replace the dummy logic with real model inference
(e.g., Whisper for speech, custom ML models for memory/reaction).
"""

import logging
import numpy as np
from typing import Dict, List

from utils.audio_utils import preprocess_audio
from utils.text_utils import preprocess_text
from utils.data_processing import normalize_reaction_times, normalize_memory_scores

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Speech Feature Extraction
# ---------------------------------------------------------------------------
def extract_speech_features(audio_b64: str) -> float:
    """
    Extract a cognitive speech score from a base64-encoded audio string.

    In production this would:
      - Decode the base64 audio
      - Run preprocessing (noise reduction, resampling via audio_utils)
      - Transcribe with Whisper
      - Analyse fluency, pause rate, word-finding difficulties, etc.

    Args:
        audio_b64: Base64-encoded audio data (WAV / MP3).

    Returns:
        A float score in [0, 100] where higher = more concern.
    """
    logger.info("Extracting speech features (dummy mode).")

    # Dummy preprocessing call (real pipeline would decode & denoise audio)
    _ = preprocess_audio(audio_b64)

    # ── DUMMY LOGIC ──────────────────────────────────────────────────────────
    # Replace with: whisper transcription → NLP feature extraction → model.predict()
    # For now we return a stable dummy score of 55 (Moderate range territory).
    dummy_score = 55.0
    # ─────────────────────────────────────────────────────────────────────────

    return float(np.clip(dummy_score, 0, 100))


# ---------------------------------------------------------------------------
# Memory Feature Extraction
# ---------------------------------------------------------------------------
def extract_memory_features(memory_results: Dict[str, float]) -> float:
    """
    Convert raw memory test results into a single 0–100 cognitive score.

    Expects keys such as:
        - word_recall_accuracy  (0–100)
        - pattern_accuracy      (0–100)

    Higher output score = greater memory concern.

    Args:
        memory_results: Dictionary of memory test metrics.

    Returns:
        A float score in [0, 100].
    """
    logger.info(f"Extracting memory features from: {memory_results}")

    # Normalise the incoming dictionary values
    normalised = normalize_memory_scores(memory_results)

    # ── DUMMY LOGIC ──────────────────────────────────────────────────────────
    # In production: feed normalised features into a trained classifier.
    # Invert accuracy so that low accuracy → high concern score.
    word_recall  = normalised.get("word_recall_accuracy", 75.0)
    pattern_acc  = normalised.get("pattern_accuracy", 70.0)
    avg_accuracy = (word_recall + pattern_acc) / 2.0
    dummy_score  = 100.0 - avg_accuracy   # Invert: lower accuracy = higher risk
    # ─────────────────────────────────────────────────────────────────────────

    return float(np.clip(dummy_score, 0, 100))


# ---------------------------------------------------------------------------
# Reaction Feature Extraction
# ---------------------------------------------------------------------------
def extract_reaction_features(reaction_times: List[float]) -> float:
    """
    Convert a list of reaction-time measurements (ms) into a 0–100 score.

    Higher score = slower / more variable reaction times = greater concern.

    Args:
        reaction_times: List of reaction times in milliseconds.

    Returns:
        A float score in [0, 100].
    """
    logger.info(f"Extracting reaction features from: {reaction_times}")

    if not reaction_times:
        logger.warning("No reaction times provided; returning default score 50.")
        return 50.0

    # Normalise raw timings
    normalised_times = normalize_reaction_times(reaction_times)

    # ── DUMMY LOGIC ──────────────────────────────────────────────────────────
    # In production: derive statistical features (mean, std, IQR) and feed
    # them into a trained regression model.
    mean_rt = float(np.mean(normalised_times))
    # Map mean normalised RT to [0, 100]; assumes normalise returns values ~[0,1]
    dummy_score = mean_rt * 100.0
    # ─────────────────────────────────────────────────────────────────────────

    return float(np.clip(dummy_score, 0, 100))
