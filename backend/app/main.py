from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import router
from app.core.config import settings
from app.services.model_service import bootstrap_models

app = FastAPI(
    title="RespiraSense 2.0 API",
    description="AI Respiratory Outbreak Prediction System API",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    # LAN / alternate host:5173 when testing from phone or custom hostname
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1|[\w.-]+)(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup_event() -> None:
    bootstrap_models()


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "service": "respirasense-backend"}


app.include_router(router, prefix="/api/v1")
