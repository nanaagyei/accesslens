"""Pydantic schemas for WebSocket messages."""

from pydantic import BaseModel


class Detection(BaseModel):
    label: str
    confidence: float
    box: list[float]  # [x1, y1, x2, y2] normalized 0-1
    zone_x: str = ""  # "left", "center", "right"
    zone_depth: str = ""  # "near", "mid", "far"
    area_frac: float = 0.0


class DetectionResponse(BaseModel):
    frame_id: int
    detections: list[Detection]
    infer_ms: float
    server_ts: float = 0.0
