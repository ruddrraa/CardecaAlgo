import logging
from datetime import datetime, timedelta, timezone
from uuid import uuid4

from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile, status

from backend.config import settings
from backend.db.mongodb import MongoRepository, mongo_repository
from backend.schemas.prediction import PredictResponse
from backend.services.inference_service import (
    InferenceError,
    InferenceService,
    InvalidImageError,
    NoDetectionError,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="", tags=["inference"])


def get_repository() -> MongoRepository:
    return mongo_repository


def get_inference_service() -> InferenceService:
    return InferenceService()


@router.post("/predict", response_model=PredictResponse)
async def predict(
    request: Request,
    file: UploadFile = File(...),
    service: InferenceService = Depends(get_inference_service),
    repository: MongoRepository = Depends(get_repository),
) -> PredictResponse:
    request_id = request.headers.get("x-request-id") or str(uuid4())

    if file.content_type is None or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="File must be an image")

    image_bytes = await file.read()
    if len(image_bytes) == 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Uploaded file is empty")

    if len(image_bytes) > settings.max_upload_size_bytes:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="Image exceeds 5MB limit")

    logger.info("[%s] Processing file=%s size=%s", request_id, file.filename, len(image_bytes))

    try:
        prediction = service.run(image_bytes)

        expires_at = datetime.now(timezone.utc) + timedelta(hours=settings.image_retention_hours)
        image_id = await repository.save_image(
            filename=file.filename or "unknown",
            content_type=file.content_type,
            image_bytes=image_bytes,
            expires_at=expires_at,
        )

        prediction.image_id = image_id
        prediction.image_url = str(request.base_url).rstrip("/") + f"/images/{image_id}"
        prediction.image_expires_at = expires_at

        await repository.save_prediction(file.filename or "unknown", prediction)
        logger.info("[%s] Prediction complete for file=%s", request_id, file.filename)
        return prediction
    except InvalidImageError as exc:
        logger.warning("[%s] Invalid image file=%s error=%s", request_id, file.filename, exc)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except NoDetectionError as exc:
        logger.info("[%s] No detections for file=%s", request_id, file.filename)
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except InferenceError as exc:
        logger.exception("[%s] Inference error file=%s", request_id, file.filename)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc)) from exc
    except Exception as exc:  # noqa: BLE001
        logger.exception("[%s] Unexpected error file=%s", request_id, file.filename)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error",
        ) from exc
