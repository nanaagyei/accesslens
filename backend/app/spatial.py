"""Bounding box to spatial zone mapping. Pure functions, trivially testable."""

from typing import Literal


def compute_zone_x(
    box: list[float],
    frame_w: int,
    left_cutoff: float = 0.33,
    right_cutoff: float = 0.66,
    hysteresis: float = 0.05,
    prev_zone: str | None = None,
) -> Literal["left", "center", "right"]:
    """Map bbox center x to a horizontal zone with hysteresis.

    Args:
        box: [x1, y1, x2, y2] in pixel coordinates.
        frame_w: Frame width in pixels.
        left_cutoff: Normalized x boundary between left and center.
        right_cutoff: Normalized x boundary between center and right.
        hysteresis: Band width to prevent zone flickering.
        prev_zone: Previous zone assignment for this track (enables hysteresis).

    Returns:
        "left", "center", or "right".
    """
    cx = (box[0] + box[2]) / 2.0 / frame_w

    if prev_zone == "left":
        if cx < left_cutoff + hysteresis:
            return "left"
    elif prev_zone == "right":
        if cx > right_cutoff - hysteresis:
            return "right"
    elif prev_zone == "center":
        if left_cutoff - hysteresis < cx < right_cutoff + hysteresis:
            return "center"

    if cx < left_cutoff:
        return "left"
    elif cx > right_cutoff:
        return "right"
    return "center"


def compute_zone_depth(
    box: list[float],
    frame_area: float,
    near_threshold: float = 0.08,
    mid_threshold: float = 0.03,
) -> Literal["near", "mid", "far"]:
    """Map bbox area fraction to a depth zone.

    Args:
        box: [x1, y1, x2, y2] in pixel coordinates.
        frame_area: Total frame area in pixels.
        near_threshold: Area fraction above which object is "near".
        mid_threshold: Area fraction above which object is "mid".

    Returns:
        "near", "mid", or "far".
    """
    bbox_area = abs((box[2] - box[0]) * (box[3] - box[1]))
    area_frac = bbox_area / frame_area if frame_area > 0 else 0.0

    if area_frac >= near_threshold:
        return "near"
    elif area_frac >= mid_threshold:
        return "mid"
    return "far"


def compute_area_frac(box: list[float], frame_area: float) -> float:
    """Compute bbox area as a fraction of frame area."""
    bbox_area = abs((box[2] - box[0]) * (box[3] - box[1]))
    return bbox_area / frame_area if frame_area > 0 else 0.0
