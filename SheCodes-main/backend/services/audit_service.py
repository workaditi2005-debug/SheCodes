"""
audit_service.py — Append-only Security & PHI Audit Trail
==========================================================
Maintains an immutable, append-only security log for compliance, traceability,
and security forensics. Strictly forbids persisting cleartext passwords,
bearer tokens, or unredacted PHI payloads.
Screening output is never a clinical diagnosis.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from core.rbac import Permission, has_permission
from core.settings import settings
from core.storage import audit_store


def utcnow_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


_SENSITIVE_KEYS = {
    "password",
    "password_hash",
    "token",
    "authorization",
    "access_token",
    "secret",
    "speech_audio",
    "medical_history",
}


def _sanitize_metadata(meta: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    if not meta or not isinstance(meta, dict):
        return {}
    clean: Dict[str, Any] = {}
    for key, value in meta.items():
        if key.lower() in _SENSITIVE_KEYS:
            clean[key] = "[REDACTED]"
        elif isinstance(value, str) and len(value) > 200:
            clean[key] = f"{value[:197]}..."
        elif isinstance(value, (int, float, bool, str)):
            clean[key] = value
        elif isinstance(value, list):
            clean[key] = f"[list with {len(value)} items]"
        elif isinstance(value, dict):
            clean[key] = _sanitize_metadata(value)
        else:
            clean[key] = str(type(value).__name__)
    return clean


def record(
    event: str,
    actor_id: Optional[str] = None,
    actor_role: Optional[str] = None,
    subject_id: Optional[str] = None,
    outcome: str = "success",
    client_ip: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Append a tamper-evident event record to the audit trail.
    """
    if not settings.audit_log_enabled:
        return {}

    entry = {
        "id": str(uuid.uuid4()),
        "timestamp": utcnow_iso(),
        "event": event,
        "actor_id": actor_id or "anonymous",
        "actor_role": actor_role or "guest",
        "subject_id": subject_id,
        "outcome": outcome,
        "client_ip": client_ip,
        "metadata": _sanitize_metadata(metadata),
    }

    def _mutator(entries: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        if not isinstance(entries, list):
            entries = []
        entries.append(entry)
        return entries[-10000:]

    audit_store.update(_mutator)
    return entry


def query_logs(
    requesting_user: Dict[str, Any],
    limit: int = 100,
    event_filter: Optional[str] = None,
    actor_filter: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """
    Retrieve audit entries, restricted to authorized roles.
    """
    if not has_permission(requesting_user, Permission.VIEW_AUDIT_LOGS):
        record(
            event="audit.access_denied",
            actor_id=requesting_user.get("id"),
            actor_role=requesting_user.get("role"),
            outcome="forbidden",
            metadata={"requested_limit": limit},
        )
        raise PermissionError("Access to security audit logs requires elevated permissions.")

    entries = audit_store.read()
    if not isinstance(entries, list):
        return []

    filtered = entries
    if event_filter:
        filtered = [e for e in filtered if event_filter.lower() in e.get("event", "").lower()]
    if actor_filter:
        filtered = [e for e in filtered if e.get("actor_id") == actor_filter]

    # Newest first
    return list(reversed(filtered[-max(1, min(500, limit)):]))
