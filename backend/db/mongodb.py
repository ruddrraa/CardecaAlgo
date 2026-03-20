import logging
from datetime import datetime, timezone
from typing import Any

from bson import Binary, ObjectId
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorCollection, AsyncIOMotorDatabase

from config import settings
from schemas.prediction import PredictResponse

logger = logging.getLogger(__name__)


class MongoRepository:
    def __init__(self) -> None:
        self._client: AsyncIOMotorClient | None = None
        self._db: AsyncIOMotorDatabase | None = None
        self._collection: AsyncIOMotorCollection | None = None
        self._image_collection: AsyncIOMotorCollection | None = None

    async def connect(self) -> None:
        self._client = AsyncIOMotorClient(settings.mongo_uri)
        self._db = self._client[settings.mongo_db_name]
        self._collection = self._db[settings.mongo_collection_name]
        self._image_collection = self._db[settings.mongo_image_collection_name]
        await self._db.command("ping")
        await self._image_collection.create_index("expires_at", expireAfterSeconds=0)
        logger.info("Connected to MongoDB Atlas")

    async def disconnect(self) -> None:
        if self._client is not None:
            self._client.close()
            logger.info("Disconnected from MongoDB")

    async def save_prediction(self, filename: str, prediction: PredictResponse) -> str:
        if self._collection is None:
            raise RuntimeError("MongoDB collection is not initialized")

        payload: dict[str, Any] = {
            "filename": filename,
            "prediction": prediction.model_dump(),
            "timestamp": datetime.now(timezone.utc),
        }
        result = await self._collection.insert_one(payload)
        return str(result.inserted_id)

    async def save_image(
        self,
        *,
        filename: str,
        content_type: str,
        image_bytes: bytes,
        expires_at: datetime,
    ) -> str:
        if self._image_collection is None:
            raise RuntimeError("MongoDB image collection is not initialized")

        payload: dict[str, Any] = {
            "filename": filename,
            "content_type": content_type,
            "data": Binary(image_bytes),
            "created_at": datetime.now(timezone.utc),
            "expires_at": expires_at,
        }
        result = await self._image_collection.insert_one(payload)
        return str(result.inserted_id)

    async def get_image(self, image_id: str) -> dict[str, Any] | None:
        if self._image_collection is None:
            raise RuntimeError("MongoDB image collection is not initialized")

        try:
            object_id = ObjectId(image_id)
        except Exception:  # noqa: BLE001
            return None

        return await self._image_collection.find_one({"_id": object_id})


mongo_repository = MongoRepository()
