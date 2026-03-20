from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


BASE_DIR = Path(__file__).resolve().parent


class Settings(BaseSettings):
    app_name: str = "Vehicle Inference API"
    app_version: str = "1.0.0"
    cors_origins: list[str] = Field(default=["*"])

    # MongoDB Atlas connection string, e.g. mongodb+srv://user:pass@cluster.mongodb.net
    mongo_uri: str = Field(default="mongodb://localhost:27017")
    mongo_db_name: str = Field(default="vehicle_ai")
    mongo_collection_name: str = Field(default="predictions")

    max_upload_size_bytes: int = Field(default=5 * 1024 * 1024)

    detector_weights_path: Path = Field(default=BASE_DIR / "rtdetr_weights.pt")
    classifier_weights_path: Path = Field(default=BASE_DIR / "car_model_weights.pth")
    class_mapping_path: Path = Field(default=BASE_DIR / "class_mapping.json")

    model_config = SettingsConfigDict(
        env_file=(BASE_DIR / ".env", ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
