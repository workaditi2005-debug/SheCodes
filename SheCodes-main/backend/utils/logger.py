"""
logger.py
─────────
Healthcare-safe logging helper for NeuroAid backend.
Automatically redacts PHI, credentials, bearer tokens, and PII before writing to logs.
"""
from __future__ import annotations

import logging
import re
import sys
from datetime import datetime, timezone

from core.settings import settings


_REDACTIONS = [
    # Bearer tokens
    (re.compile(r"Bearer\s+[A-Za-z0-9\-_.]+", re.IGNORECASE), "Bearer [REDACTED_TOKEN]"),
    # Passwords in query/json
    (re.compile(r'(["\']?password["\']?\s*[:=]\s*["\'])([^"\']+)(["\'])', re.IGNORECASE), r'\1[REDACTED]\3'),
    # Email addresses
    (re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b"), "[REDACTED_EMAIL]"),
    # Phone numbers (10+ digits)
    (re.compile(r"\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b"), "[REDACTED_PHONE]"),
]


def redact_sensitive_text(text: str) -> str:
    """Sanitize message of credentials, tokens, emails, and phone numbers."""
    if not isinstance(text, str):
        text = str(text)
    for pattern, replacement in _REDACTIONS:
        text = pattern.sub(replacement, text)
    return text


class SensitiveFilter(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        if isinstance(record.msg, str):
            record.msg = redact_sensitive_text(record.msg)
        return True


# ── Configure root logger ─────────────────────────────────────────────────────
logging.basicConfig(
    stream=sys.stdout,
    level=logging.DEBUG if settings.debug else logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)

_logger = logging.getLogger("neuroaid")
_logger.addFilter(SensitiveFilter())


def log_info(message: str) -> None:
    _logger.info(redact_sensitive_text(message))


def log_warning(message: str) -> None:
    _logger.warning(redact_sensitive_text(message))


def log_error(message: str) -> None:
    _logger.error(redact_sensitive_text(message))


def log_debug(message: str) -> None:
    _logger.debug(redact_sensitive_text(message))


def log_request(endpoint: str, payload: dict) -> None:
    """Safely log incoming request endpoints and sanitized keys."""
    ts = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    safe_keys = [k for k in payload.keys() if "pass" not in k.lower() and "token" not in k.lower()]
    _logger.info(f"[{ts}] REQUEST → {endpoint} | safe payload keys: {safe_keys}")
