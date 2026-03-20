import json
import logging
import zipfile
from dataclasses import dataclass
from pathlib import Path

import torch
import torch.nn as nn
from torchvision import models, transforms
from ultralytics import RTDETR

from backend.config import settings

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class LoadedModels:
    detector: RTDETR
    classifier: nn.Module
    class_mapping: dict[str, str]
    device: torch.device
    preprocess: transforms.Compose


class ModelRegistry:
    _instance: LoadedModels | None = None

    @classmethod
    def get_models(cls) -> LoadedModels:
        if cls._instance is None:
            cls._instance = cls._load_models()
        return cls._instance

    @staticmethod
    def _load_models() -> LoadedModels:
        logger.info("Loading inference models")

        device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

        detector_weights = _resolve_weights_path(settings.detector_weights_path)
        classifier_weights = _resolve_weights_path(settings.classifier_weights_path)

        detector = RTDETR(str(detector_weights))

        with settings.class_mapping_path.open("r", encoding="utf-8") as mapping_file:
            class_mapping: dict[str, str] = json.load(mapping_file)

        classifier = models.efficientnet_b0(weights=None)
        classifier.classifier[1] = nn.Linear(classifier.classifier[1].in_features, len(class_mapping))
        state_dict = torch.load(classifier_weights, map_location=device)
        classifier.load_state_dict(state_dict)
        classifier = classifier.to(device)
        classifier.eval()

        preprocess = transforms.Compose(
            [
                transforms.Resize((256, 256)),
                transforms.CenterCrop(224),
                transforms.ToTensor(),
                transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
            ]
        )

        logger.info("Models loaded on device: %s", device)
        return LoadedModels(
            detector=detector,
            classifier=classifier,
            class_mapping=class_mapping,
            device=device,
            preprocess=preprocess,
        )


def _resolve_weights_path(path: Path) -> Path:
    if path.is_file():
        return path

    if not path.is_dir():
        raise FileNotFoundError(f"Weights path not found: {path}")

    suffix = path.suffix if path.suffix else ".pt"
    rebuilt_file = path.parent / f"{path.stem}.rebuilt{suffix}"
    if rebuilt_file.exists() and rebuilt_file.stat().st_size > 0:
        return rebuilt_file

    with zipfile.ZipFile(rebuilt_file, "w", compression=zipfile.ZIP_STORED) as archive:
        for entry in path.rglob("*"):
            if entry.is_file():
                relative = str(entry.relative_to(path)).replace("\\", "/")
                archive.write(entry, arcname=f"archive/{relative}")

    logger.warning("Rebuilt weights file from directory: %s -> %s", path, rebuilt_file)
    return rebuilt_file
