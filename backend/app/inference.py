"""YOLO26 MLX inference wrapper."""

import logging
import time
from pathlib import Path

import numpy as np

from backend.app.config import COCO_NAMES, settings
from backend.app.models import Detection
from backend.app.spatial import compute_area_frac, compute_zone_depth, compute_zone_x

logger = logging.getLogger(__name__)


class YoloInference:
    """Wraps yolo26mlx.YOLO for AccessLens inference."""

    def __init__(self, model_path: str | None = None) -> None:
        self._model_path = model_path or settings.model_path
        self._model = None
        self._names: dict[int, str] = {}
        self._frame_count = 0

    def _ensure_loaded(self) -> None:
        """Lazy-load the model on first use."""
        if self._model is not None:
            return

        from yolo26mlx import YOLO

        logger.info("Loading YOLO26 model from %s", self._model_path)
        self._model = YOLO(self._model_path)
        self._names = self._model.names
        # npz conversion loses COCO names; fall back to our mapping
        if self._names and all(v.startswith("class") for v in self._names.values()):
            self._names = COCO_NAMES

        # Warmup: first inference is always slow
        logger.info("Running warmup inference...")
        dummy = np.zeros((480, 640, 3), dtype=np.uint8)
        self._model.predict(dummy, conf=0.5)
        logger.info("Model ready. Classes: %d", len(self._names))

    def predict(self, frame: np.ndarray, conf: float | None = None) -> tuple[list[Detection], float]:
        """Run inference on a frame.

        Args:
            frame: BGR or RGB numpy array (H, W, 3).
            conf: Confidence threshold override.

        Returns:
            Tuple of (detections list, inference_ms).
        """
        self._ensure_loaded()
        assert self._model is not None

        threshold = conf if conf is not None else settings.confidence_threshold
        h, w = frame.shape[:2]
        frame_area = float(h * w)

        t0 = time.perf_counter()
        results_list = self._model.predict(frame, conf=threshold)
        infer_ms = (time.perf_counter() - t0) * 1000.0

        self._frame_count += 1
        if self._frame_count % 10 == 0:
            logger.info("Inference latency: %.1f ms (frame %d)", infer_ms, self._frame_count)

        detections: list[Detection] = []
        if not results_list:
            return detections, infer_ms

        result = results_list[0]
        if result.boxes is None or len(result.boxes) == 0:
            return detections, infer_ms

        boxes_data = result.boxes.data  # (N, 6): x1,y1,x2,y2,conf,cls

        for i in range(len(boxes_data)):
            row = boxes_data[i]
            x1, y1, x2, y2 = float(row[0]), float(row[1]), float(row[2]), float(row[3])
            confidence = float(row[4])
            cls_id = int(row[5])
            label = self._names.get(cls_id, f"class_{cls_id}")

            box = [x1, y1, x2, y2]
            area_frac = compute_area_frac(box, frame_area)

            if area_frac < settings.min_bbox_area_frac:
                continue

            # Normalize box to 0-1
            norm_box = [x1 / w, y1 / h, x2 / w, y2 / h]
            zone_x = compute_zone_x(box, w)
            zone_depth = compute_zone_depth(box, frame_area)

            detections.append(Detection(
                label=label,
                confidence=round(confidence, 3),
                box=norm_box,
                zone_x=zone_x,
                zone_depth=zone_depth,
                area_frac=round(area_frac, 4),
            ))

        return detections, infer_ms
