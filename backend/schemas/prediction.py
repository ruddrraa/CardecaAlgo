from datetime import datetime

from pydantic import BaseModel, Field


class BoundingBox(BaseModel):
    x1: int = Field(..., ge=0)
    y1: int = Field(..., ge=0)
    x2: int = Field(..., ge=0)
    y2: int = Field(..., ge=0)


class PredictResponse(BaseModel):
    success: bool
    car_model: str
    confidence: float = Field(..., ge=0.0, le=1.0)
    bounding_box: BoundingBox


class PredictionDocument(BaseModel):
    filename: str
    prediction: PredictResponse
    timestamp: datetime


class HealthResponse(BaseModel):
    status: str
    app: str
    version: str
