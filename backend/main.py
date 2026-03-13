import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

logging.basicConfig(
    level=logging.INFO,
    format="%(levelname)s: %(name)s — %(message)s",
)

from config import settings
from routers import auth, agents, services, payments, messages, reviews

app = FastAPI(
    title="SecureGuard API",
    version="0.1.0",
    docs_url="/docs" if settings.backend_env != "production" else None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins.split(","),
    allow_credentials=True,
    allow_methods=["*"],
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
