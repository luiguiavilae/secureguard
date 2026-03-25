import logging
import threading
import time
from collections import defaultdict, deque

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request as StarletteRequest

logging.basicConfig(
    level=logging.INFO,
    format="%(levelname)s: %(name)s — %(message)s",
)

from config import settings
from routers import auth, agents, services, payments, messages, reviews

# ── Rate Limiting (in-memory; usar Redis en multi-instancia) ──
_rl_lock = threading.Lock()
_rl_store: dict[str, deque] = defaultdict(deque)
_RL_MAX_REQUESTS = 100
_RL_WINDOW_SECONDS = 60

logger = logging.getLogger(__name__)


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Límite global: 100 requests/minuto por IP."""

    async def dispatch(self, request: StarletteRequest, call_next):
        if request.url.path == "/health":
            return await call_next(request)

        ip = request.client.host if request.client else "unknown"
        now = time.time()
        window_start = now - _RL_WINDOW_SECONDS

        with _rl_lock:
            ts = _rl_store[ip]
            while ts and ts[0] < window_start:
                ts.popleft()
            if len(ts) >= _RL_MAX_REQUESTS:
                logger.warning(f"Rate limit global excedido por IP {ip}")
                return JSONResponse(
                    status_code=429,
                    content={"detail": "Demasiadas solicitudes. Espera un minuto."},
                    headers={"Retry-After": "60"},
                )
            ts.append(now)

        return await call_next(request)


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Headers HTTP de seguridad en todas las respuestas."""

    async def dispatch(self, request: StarletteRequest, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        if settings.backend_env == "production":
            response.headers["Strict-Transport-Security"] = (
                "max-age=31536000; includeSubDomains"
            )
        return response


# ── Application ───────────────────────────────────────────────
app = FastAPI(
    title="SecureGuard API",
    version="0.1.0",
    docs_url="/docs" if settings.backend_env != "production" else None,
    redoc_url="/redoc" if settings.backend_env != "production" else None,
)

# Orden de add_middleware: el ÚLTIMO agregado es el más externo (se ejecuta primero).
# CORSMiddleware → RateLimitMiddleware → SecurityHeadersMiddleware → handler
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(RateLimitMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins.split(","),
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(agents.router, prefix="/agents", tags=["agents"])
app.include_router(services.router, prefix="/services", tags=["services"])
app.include_router(payments.router, prefix="/payments", tags=["payments"])
app.include_router(messages.router, prefix="/messages", tags=["messages"])
app.include_router(reviews.router, prefix="/reviews", tags=["reviews"])


@app.get("/health")
async def health_check():
    return {"status": "ok"}
