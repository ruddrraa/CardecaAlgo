import io
import logging

import torch
from PIL import Image, UnidentifiedImageError

from models.model_loader import ModelRegistry
from schemas.prediction import BoundingBox, PredictResponse

logger = logging.getLogger(__name__)


class InferenceError(Exception):
    pass


class NoDetectionError(InferenceError):
    pass


class InvalidImageError(InferenceError):
    pass


class InferenceService:
    def __init__(self) -> None:
        self.models = ModelRegistry.get_models()

    def run(self, image_bytes: bytes) -> PredictResponse:
        image = self._read_image(image_bytes)
        bbox = self._detect_primary_object(image)
        cropped = image.crop((bbox.x1, bbox.y1, bbox.x2, bbox.y2))

        class_name, confidence = self._classify(cropped)

        return PredictResponse(
            success=True,
            car_model=class_name,
            confidence=confidence,
            bounding_box=bbox,
        )

    @staticmethod
    def _read_image(image_bytes: bytes) -> Image.Image:
        try:
            return Image.open(io.BytesIO(image_bytes)).convert("RGB")
        except (UnidentifiedImageError, OSError) as exc:
            raise InvalidImageError("Uploaded file is not a valid image or is corrupted") from exc

    def _detect_primary_object(self, image: Image.Image) -> BoundingBox:
        results = self.models.detector(image, verbose=False)
        boxes = results[0].boxes

        if boxes is None or len(boxes) == 0:
            raise NoDetectionError("No object detected in the image")

        confs = boxes.conf.tolist()
        best_index = max(range(len(confs)), key=lambda idx: confs[idx])
        best_box = boxes[best_index].xyxy[0].tolist()

        x1, y1, x2, y2 = map(int, best_box)
        x1 = max(x1, 0)
        y1 = max(y1, 0)

        if x2 <= x1 or y2 <= y1:
            raise InferenceError("Invalid detection bounding box")

        return BoundingBox(x1=x1, y1=y1, x2=x2, y2=y2)

    def _classify(self, cropped_image: Image.Image) -> tuple[str, float]:
        input_tensor = self.models.preprocess(cropped_image).unsqueeze(0).to(self.models.device)

        with torch.no_grad():
            logits = self.models.classifier(input_tensor)
            probabilities = torch.softmax(logits, dim=1)
            confidence, predicted_idx = torch.max(probabilities, dim=1)

        class_id = str(predicted_idx.item())
        class_name = self.models.class_mapping.get(class_id, f"unknown_{class_id}")
        return class_name, float(confidence.item())
