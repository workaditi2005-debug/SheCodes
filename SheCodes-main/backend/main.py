from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from core.settings import settings
from routers import (
    analyze_api,
    auth_api,
    chat_api,
    consent_api,
    content_api,
    games_api,
    memory_bank_api,
    messages_api,
    reminders_api,
    sync_api,
    dashboard_api,
    demo_api,
    rhythm_recall_api,
)
from utils.logger import log_error, log_info

app = FastAPI(
    title=settings.app_name,
    description="Unified backend for NeuroAid cognitive screening and clinician workflows. Screening output is never a clinical diagnosis.",
    version=settings.app_version,
)

# ── Security Headers Middleware ───────────────────────────────────────────────
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(self), geolocation=()"
    if settings.environment == "production":
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return response

# ── CORS ──────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=list(settings.cors_origins),
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept", "Origin", "X-Requested-With"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(analyze_api.router, prefix="/api")
app.include_router(auth_api.router, prefix="/api")
app.include_router(consent_api.router, prefix="/api")
app.include_router(messages_api.router, prefix="/api")
app.include_router(content_api.router, prefix="/api")
app.include_router(chat_api.router, prefix="/api")
app.include_router(games_api.router, prefix="/api")
app.include_router(memory_bank_api.router, prefix="/api")
app.include_router(reminders_api.router, prefix="/api")
app.include_router(sync_api.router, prefix="/api")
app.include_router(dashboard_api.router, prefix="/api")
app.include_router(demo_api.router, prefix="/api")
app.include_router(rhythm_recall_api.router, prefix="/api/v1/games/rhythm-recall")
app.include_router(rhythm_recall_api.router, prefix="/api/games/rhythm-recall")


# ── Global exception handler ──────────────────────────────────────────────────
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    log_error(f"Unhandled error on {request.url.path}: {exc.__class__.__name__}")
    return JSONResponse(
        status_code=500,
        content={
            "detail": "An internal server error occurred. Please try again later.",
        },
    )

# ── Health check ──────────────────────────────────────────────────────────────
@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": settings.app_name,
        "version": settings.app_version,
        "environment": settings.environment,
    }
