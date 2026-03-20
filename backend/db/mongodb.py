import logging
from datetime import datetime, timezone
from typing import Any

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorCollection, AsyncIOMotorDatabase

from backend.config import settings
from backend.schemas.prediction import PredictResponse

logger = logging.getLogger(__name__)


class MongoRepository:
    def __init__(self) -> None:
        self._client: AsyncIOMotorClient | None = None
        self._db: AsyncIOMotorDatabase | None = None
        self._collection: AsyncIOMotorCollection | None = None

    async def connect(self) -> None:
        self._client = AsyncIOMotorClient(settings.mongo_uri)
        self._db = self._client[settings.mongo_db_name]
        self._collection = self._db[settings.mongo_collection_name]
        await self._db.command("ping")
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


mongo_repository = MongoRepository()
