from fastapi import APIRouter

from app.config import get_settings

router = APIRouter(prefix="/api", tags=["health"])


@router.get("/health")
def health():
    settings = get_settings()
    return {
        "status": "ok",
        "fss_configured": bool(settings.fss_api_key),
        "ai_configured": bool(settings.anthropic_api_key),
    }
