import logging
import time
from contextlib import asynccontextmanager
from uuid import uuid4

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from backend.config import settings
from backend.db.mongodb import mongo_repository
from backend.models.model_loader import ModelRegistry
from backend.routes.health import router as health_router
from backend.routes.images import router as images_router
from backend.routes.prediction import router as prediction_router


logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)
logger = logging.getLogger("backend")


@asynccontextmanager
async def lifespan(_: FastAPI):
    ModelRegistry.get_models()
    await mongo_repository.connect()
    yield
    await mongo_repository.disconnect()


app = FastAPI(title=settings.app_name, version=settings.app_version, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def request_context_middleware(request: Request, call_next):
    request_id = request.headers.get("x-request-id") or str(uuid4())
    start = time.perf_counter()

    response = await call_next(request)

    duration_ms = (time.perf_counter() - start) * 1000
    response.headers["x-request-id"] = request_id

    logger.info(
        "request_id=%s method=%s path=%s status=%s duration_ms=%.2f",
        request_id,
        request.method,
        request.url.path,
        response.status_code,
        duration_ms,
    )
    return response


app.include_router(health_router)
app.include_router(images_router)
app.include_router(prediction_router)