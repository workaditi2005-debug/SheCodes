"""
NeuroAid AI Service - Audio Utilities
=======================================
Helper functions for audio preprocessing before feature extraction.

In production, replace the dummy stubs with real DSP / librosa pipelines.
"""

import base64
import logging
from typing import Optional

logger = logging.getLogger(__name__)


def preprocess_audio(audio_b64: str) -> Optional[bytes]:
    """
    Decode a base64 audio string and apply basic preprocessing.

    Production pipeline would:
      1. Decode base64 → raw bytes
      2. Load with librosa / pydub
      3. Resample to 16 kHz mono
      4. Apply noise reduction (e.g., noisereduce library)
      5. Normalise amplitude

    Args:
        audio_b64: Base64-encoded audio (WAV / MP3 / FLAC).

    Returns:
        Preprocessed audio bytes, or None if decoding fails.
    """
    logger.info("preprocess_audio called (dummy mode).")

    try:
        # Attempt to decode; in dummy mode we just verify the string is valid base64.
        audio_bytes = base64.b64decode(audio_b64 + "==")  # pad to be safe
        logger.debug(f"Decoded {len(audio_bytes)} bytes of audio.")

        # ── DUMMY: return raw bytes without actual processing ──────────────
        # TODO: Replace with librosa.load() + resampling + noise reduction
        return audio_bytes

    except Exception as e:
        logger.warning(f"preprocess_audio failed to decode audio: {e}")
        return None


def extract_mfcc(audio_bytes: bytes, sample_rate: int = 16000, n_mfcc: int = 13):
    """
    Extract MFCC (Mel-Frequency Cepstral Coefficients) from audio bytes.

    Args:
        audio_bytes:  Raw PCM audio bytes at `sample_rate`.
        sample_rate:  Sample rate in Hz.
        n_mfcc:       Number of MFCC coefficients.

    Returns:
        2-D numpy array of MFCCs, shape (n_mfcc, time_frames).
        Returns None in dummy mode.
    """
    logger.info("extract_mfcc called (dummy mode – returning None).")

    # ── DUMMY ──────────────────────────────────────────────────────────────
    # TODO:
    #   import librosa, numpy as np, io
    #   y, sr = librosa.load(io.BytesIO(audio_bytes), sr=sample_rate, mono=True)
    #   mfccs  = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=n_mfcc)
    #   return mfccs
    return None


def detect_silence_ratio(audio_bytes: bytes, threshold_db: float = -40.0) -> float:
    """
    Estimate the proportion of silence in an audio clip.

    Higher silence ratio may indicate word-finding difficulty or hesitation.

    Args:
        audio_bytes:   Raw audio bytes.
        threshold_db:  dBFS level below which a frame is considered silent.

    Returns:
        Float in [0.0, 1.0] representing the silence ratio.
        Returns dummy value 0.2 in stub mode.
    """
    logger.info("detect_silence_ratio called (dummy mode).")

    # ── DUMMY ──────────────────────────────────────────────────────────────
    # TODO: use pydub.AudioSegment to chunk and classify frames
    return 0.2
