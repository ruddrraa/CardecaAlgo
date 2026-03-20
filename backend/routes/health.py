from fastapi import APIRouter

from config import settings
from schemas.prediction import HealthResponse

router = APIRouter(prefix="", tags=["health"])


@router.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    return HealthResponse(
        status="ok",
        app=settings.app_name,
        version=settings.app_version
    )
