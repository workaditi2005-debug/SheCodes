from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path


try:
    from dotenv import load_dotenv
    backend_env = Path(__file__).resolve().parents[1] / ".env"
    if backend_env.is_file():
        load_dotenv(backend_env)
    else:
        load_dotenv()
except ImportError:
    pass


def _parse_bool(value: str, default: bool) -> bool:
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def _parse_origins(value: str | None, default: tuple[str, ...]) -> tuple[str, ...]:
    if not value:
        return default
    origins = tuple(item.strip() for item in value.split(",") if item.strip() and item.strip() != "*")
    return origins or default


@dataclass(frozen=True)
class Settings:
    app_name: str
    app_version: str
    environment: str
    debug: bool
    api_host: str
    api_port: int
    cors_origins: tuple[str, ...]
    data_dir: Path
    ai_service_url: str
    ai_service_timeout_seconds: float
    session_ttl_seconds: int
    session_idle_timeout_seconds: int
    max_login_attempts: int
    lockout_duration_seconds: int
    audit_log_enabled: bool
    firebase_project_id: str
    firebase_credentials_path: str | None

    @classmethod
    def from_env(cls) -> "Settings":
        backend_dir = Path(__file__).resolve().parents[1]
        data_dir = Path(os.getenv("DATA_DIR", backend_dir / "data")).resolve()
        return cls(
            app_name=os.getenv("APP_NAME", "NeuroAid API"),
            app_version=os.getenv("APP_VERSION", "2.0.0"),
            environment=os.getenv("APP_ENV", "development"),
            debug=_parse_bool(os.getenv("DEBUG"), False),
            api_host=os.getenv("API_HOST", "0.0.0.0"),
            api_port=int(os.getenv("API_PORT", "8000")),
            cors_origins=_parse_origins(
                os.getenv("ALLOWED_ORIGINS"),
                (
                    "http://localhost:5173",
                    "http://127.0.0.1:5173",
                    "http://localhost:5174",
                    "http://127.0.0.1:5174",
                    "http://localhost:5175",
                    "http://127.0.0.1:5175",
                    "http://localhost:4173",
                    "http://127.0.0.1:4173",
                    "http://localhost:3000",
                    "http://127.0.0.1:3000",
                    "http://localhost:8000",
                    "http://127.0.0.1:8000",
                ),
            ),
            data_dir=data_dir,
            ai_service_url=os.getenv("AI_SERVICE_URL", "http://localhost:8001"),
            ai_service_timeout_seconds=float(os.getenv("AI_SERVICE_TIMEOUT", "15")),
            session_ttl_seconds=int(os.getenv("SESSION_TTL_SECONDS", "28800")),
            session_idle_timeout_seconds=int(os.getenv("SESSION_IDLE_TIMEOUT_SECONDS", "3600")),
            max_login_attempts=int(os.getenv("MAX_LOGIN_ATTEMPTS", "5")),
            lockout_duration_seconds=int(os.getenv("LOCKOUT_DURATION_SECONDS", "900")),
            audit_log_enabled=_parse_bool(os.getenv("AUDIT_LOG_ENABLED"), True),
            firebase_project_id=os.getenv("FIREBASE_PROJECT_ID", "neuroaid-sih-2026"),
            firebase_credentials_path=os.getenv("GOOGLE_APPLICATION_CREDENTIALS") or os.getenv("FIREBASE_CREDENTIALS_PATH"),
        )


settings = Settings.from_env()

