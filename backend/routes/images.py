from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import Response

from db.mongodb import MongoRepository, mongo_repository

router = APIRouter(prefix="", tags=["images"])


def get_repository() -> MongoRepository:
    return mongo_repository


@router.get("/images/{image_id}")
async def get_image(image_id: str, repository: MongoRepository = Depends(get_repository)) -> Response:
    image_doc = await repository.get_image(image_id)
    if image_doc is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Image not found or expired")

    expires_at = image_doc.get("expires_at")
    if isinstance(expires_at, datetime) and expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Image expired")

    return Response(content=bytes(image_doc["data"]), media_type=image_doc.get("content_type", "image/jpeg"))
