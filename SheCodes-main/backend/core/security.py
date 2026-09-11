from __future__ import annotations

import hashlib
import hmac
import secrets


_PBKDF2_ITERATIONS = 390000
_PBKDF2_SCHEME = "pbkdf2_sha256"
_LEGACY_SALT_PREFIX = "neuroaid_salt_"


def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    derived = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt.encode("utf-8"),
        _PBKDF2_ITERATIONS,
    )
    return f"{_PBKDF2_SCHEME}${_PBKDF2_ITERATIONS}${salt}${derived.hex()}"


def _legacy_hash(password: str) -> str:
    return hashlib.sha256(f"{_LEGACY_SALT_PREFIX}{password}".encode("utf-8")).hexdigest()


def verify_password(password: str, stored_hash: str) -> tuple[bool, bool]:
    if not stored_hash:
        return False, False

    if stored_hash.startswith(f"{_PBKDF2_SCHEME}$"):
        try:
            _, iterations, salt, expected = stored_hash.split("$", 3)
        except ValueError:
            return False, False
        derived = hashlib.pbkdf2_hmac(
            "sha256",
            password.encode("utf-8"),
            salt.encode("utf-8"),
            int(iterations),
        ).hex()
        return hmac.compare_digest(derived, expected), False

    legacy_valid = hmac.compare_digest(_legacy_hash(password), stored_hash)
    return legacy_valid, legacy_valid


def create_session_token() -> str:
    return secrets.token_hex(32)


def hash_token(token: str) -> str:
    """Hash session token before storing in persistence layer."""
    if not token:
        return ""
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def validate_password_strength(password: str) -> tuple[bool, str]:
    """
    Validate password complexity:
    - At least 8 characters
    - At least 1 uppercase letter
    - At least 1 lowercase letter
    - At least 1 digit
    - At least 1 special character
    """
    if len(password) < 8:
        return False, "Password must be at least 8 characters long."
    if len(password) > 128:
        return False, "Password must not exceed 128 characters."
    if not any(c.isupper() for c in password):
        return False, "Password must contain at least one uppercase letter."
    if not any(c.islower() for c in password):
        return False, "Password must contain at least one lowercase letter."
    if not any(c.isdigit() for c in password):
        return False, "Password must contain at least one digit."
    special_chars = set("!@#$%^&*()-_=+[]{}|;:,.<>?/~`")
    if not any(c in special_chars for c in password):
        return False, "Password must contain at least one special character."
    return True, ""


def dummy_verify_password() -> None:
    """
    Perform a dummy PBKDF2 calculation to ensure constant-time response
    when an email is not found, mitigating user enumeration timing attacks.
    """
    hashlib.pbkdf2_hmac(
        "sha256",
        b"dummy_timing_mitigation_password",
        b"neuroaid_fixed_salt_mitigation",
        _PBKDF2_ITERATIONS,
    )


