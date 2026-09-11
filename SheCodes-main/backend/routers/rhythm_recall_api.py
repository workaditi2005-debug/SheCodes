"""
rhythm_recall_api.py — Router export for Rhythm & Recall
=========================================================
Exposes the router from app.api.v1.games.rhythm_recall for consistent backend routing.
"""
from app.api.v1.games.rhythm_recall import router

__all__ = ["router"]
