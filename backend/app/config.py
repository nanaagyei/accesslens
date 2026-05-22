"""All tunable thresholds for AccessLens. Single source of truth."""

from pathlib import Path

from pydantic_settings import BaseSettings

_BACKEND_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    # Model
    model_path: str = str(_BACKEND_DIR / "models" / "yolo26n.npz")
    confidence_threshold: float = 0.45
    min_bbox_area_frac: float = 0.01

    # Spatial zones
    zone_x_left_cutoff: float = 0.33
    zone_x_right_cutoff: float = 0.66
    zone_x_hysteresis: float = 0.05

    # Depth zones (bbox area fraction thresholds)
    depth_near_threshold: float = 0.08
    depth_mid_threshold: float = 0.03

    # Narration cadence
    min_utterance_gap_ms: int = 1500
    per_track_cooldown_ms: int = 4000
    max_queue_depth: int = 1
    stable_scene_timeout_ms: int = 10000
    utterance_ttl_ms: int = 800

    # TTS
    tts_rate: float = 1.3

    # Frame capture
    target_fps: int = 10
    jpeg_quality: int = 70
    frame_width: int = 640
    frame_height: int = 480

    # Server
    host: str = "127.0.0.1"
    port: int = 8000

    model_config = {"env_prefix": "ACCESSLENS_"}


settings = Settings()

# COCO class names (80 classes). The npz conversion loses these.
COCO_NAMES: dict[int, str] = {
    0: "person", 1: "bicycle", 2: "car", 3: "motorcycle", 4: "airplane",
    5: "bus", 6: "train", 7: "truck", 8: "boat", 9: "traffic light",
    10: "fire hydrant", 11: "stop sign", 12: "parking meter", 13: "bench",
    14: "bird", 15: "cat", 16: "dog", 17: "horse", 18: "sheep", 19: "cow",
    20: "elephant", 21: "bear", 22: "zebra", 23: "giraffe", 24: "backpack",
    25: "umbrella", 26: "handbag", 27: "tie", 28: "suitcase", 29: "frisbee",
    30: "skis", 31: "snowboard", 32: "sports ball", 33: "kite",
    34: "baseball bat", 35: "baseball glove", 36: "skateboard", 37: "surfboard",
    38: "tennis racket", 39: "bottle", 40: "wine glass", 41: "cup", 42: "fork",
    43: "knife", 44: "spoon", 45: "bowl", 46: "banana", 47: "apple",
    48: "sandwich", 49: "orange", 50: "broccoli", 51: "carrot", 52: "hot dog",
    53: "pizza", 54: "donut", 55: "cake", 56: "chair", 57: "couch",
    58: "potted plant", 59: "bed", 60: "dining table", 61: "toilet", 62: "tv",
    63: "laptop", 64: "mouse", 65: "remote", 66: "keyboard", 67: "cell phone",
    68: "microwave", 69: "oven", 70: "toaster", 71: "sink", 72: "refrigerator",
    73: "book", 74: "clock", 75: "vase", 76: "scissors", 77: "teddy bear",
    78: "hair drier", 79: "toothbrush",
}
