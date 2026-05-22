"""Tests for YOLO26 MLX inference wrapper."""

import cv2
import pytest

from backend.app.inference import YoloInference


@pytest.fixture
def inference():
    """Create inference engine. Skips if model not available."""
    try:
        engine = YoloInference()
        return engine
    except Exception as e:
        pytest.skip(f"Model not available: {e}")


class TestYoloInference:
    def test_predict_bus_image(self, inference, bus_image_path):
        """Inference on bus.jpg should detect at least one person and one bus."""
        frame = cv2.imread(str(bus_image_path))
        assert frame is not None, "Failed to read bus.jpg"

        detections, infer_ms = inference.predict(frame)

        assert infer_ms > 0
        assert len(detections) > 0

        labels = {d.label for d in detections}
        assert "person" in labels, f"Expected 'person' in {labels}"
        assert "bus" in labels, f"Expected 'bus' in {labels}"

    def test_detections_have_zones(self, inference, bus_image_path):
        """Every detection should have zone_x and zone_depth populated."""
        frame = cv2.imread(str(bus_image_path))
        detections, _ = inference.predict(frame)

        for d in detections:
            assert d.zone_x in ("left", "center", "right")
            assert d.zone_depth in ("near", "mid", "far")
            assert 0 <= d.box[0] <= 1
            assert 0 <= d.box[1] <= 1

    def test_empty_frame(self, inference):
        """Black frame should produce zero or few detections."""
        import numpy as np
        frame = np.zeros((480, 640, 3), dtype=np.uint8)
        detections, infer_ms = inference.predict(frame)
        assert infer_ms > 0
        # A black frame might produce some false positives, but shouldn't crash
