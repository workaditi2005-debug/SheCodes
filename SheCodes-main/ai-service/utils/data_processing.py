"""
NeuroAid AI Service - Data Processing Utilities
=================================================
Normalisation and transformation helpers for memory test results
and reaction-time arrays.

These functions ensure that raw, heterogeneously-scaled inputs are
converted to a consistent [0, 1] range before being passed to the
scoring engine.
"""

import logging
import numpy as np
from typing import Dict, List

from config import REACTION_CONFIG

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Memory score normalisation
# ---------------------------------------------------------------------------
def normalize_memory_scores(memory_results: Dict[str, float]) -> Dict[str, float]:
    """
    Ensure all memory metric values are clamped to [0, 100].

    If a metric is provided on a different scale (e.g. 0–1), convert it here.

    Args:
        memory_results: Raw dictionary of memory test metrics.

    Returns:
        Dictionary with the same keys, values clamped to [0, 100].
    """
    logger.debug(f"normalize_memory_scores input: {memory_results}")

    normalised = {}
    for key, value in memory_results.items():
        # If value appears to be in 0–1 range, scale to 0–100
        if 0.0 <= value <= 1.0 and value != 0:
            scaled = value * 100.0
        else:
            scaled = float(value)

        normalised[key] = float(np.clip(scaled, 0.0, 100.0))

    logger.debug(f"normalize_memory_scores output: {normalised}")
    return normalised


# ---------------------------------------------------------------------------
# Reaction-time normalisation
# ---------------------------------------------------------------------------
def normalize_reaction_times(reaction_times: List[float]) -> List[float]:
    """
    Clip and min-max normalise reaction times to [0, 1].

    Steps:
      1. Clip outliers below `min_rt_ms` and above `max_rt_ms`.
      2. Apply min-max scaling so the output lives in [0, 1],
         where 0 = fastest possible and 1 = slowest possible.

    Args:
        reaction_times: List of raw reaction times in milliseconds.

    Returns:
        List of normalised reaction times in [0, 1].
    """
    logger.debug(f"normalize_reaction_times input: {reaction_times}")

    min_rt = REACTION_CONFIG["min_rt_ms"]
    max_rt = REACTION_CONFIG["max_rt_ms"]

    arr = np.array(reaction_times, dtype=float)

    # Clip to physiological bounds
    arr = np.clip(arr, min_rt, max_rt)

    # Min-max normalise
    arr_norm = (arr - min_rt) / (max_rt - min_rt)

    result = arr_norm.tolist()
    logger.debug(f"normalize_reaction_times output: {result}")
    return result


# ---------------------------------------------------------------------------
# General helpers
# ---------------------------------------------------------------------------
def safe_mean(values: List[float], default: float = 0.0) -> float:
    """
    Compute the mean of a list, returning `default` for empty lists.

    Args:
        values:  Input list of floats.
        default: Value to return when the list is empty.

    Returns:
        Mean of `values`, or `default`.
    """
    if not values:
        return default
    return float(np.mean(values))


def safe_std(values: List[float], default: float = 0.0) -> float:
    """
    Compute the standard deviation, returning `default` for empty / single-element lists.

    Args:
        values:  Input list of floats.
        default: Fallback for degenerate inputs.

    Returns:
        Standard deviation or `default`.
    """
    if len(values) < 2:
        return default
    return float(np.std(values))
