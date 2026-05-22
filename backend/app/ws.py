"""WebSocket endpoint for frame processing."""

import asyncio
import json
import logging
import time

import cv2
import numpy as np
from fastapi import WebSocket, WebSocketDisconnect

from backend.app.inference import YoloInference
from backend.app.models import DetectionResponse

logger = logging.getLogger(__name__)

# Shared inference engine (lazy-loaded on first frame)
_inference = YoloInference()


async def ws_endpoint(websocket: WebSocket) -> None:
    """Handle a WebSocket connection for frame processing.

    Protocol:
        1. Client sends text JSON: {"type": "frame", "id": N, "w": 640, "h": 480}
        2. Client sends binary: JPEG bytes
        3. Server responds with DetectionResponse JSON
    """
    await websocket.accept()
    logger.info("WebSocket client connected")

    in_flight = False
    pending_header: dict | None = None

    try:
        while True:
            message = await websocket.receive()

            if message["type"] == "websocket.disconnect":
                break

            if "text" in message:
                # Frame metadata header
                try:
                    pending_header = json.loads(message["text"])
                except json.JSONDecodeError:
                    logger.warning("Invalid JSON header")
                    pending_header = None
                continue

            if "bytes" in message:
                if pending_header is None:
                    logger.warning("Binary frame without header, skipping")
                    continue

                if in_flight:
                    # Backpressure: drop frame
                    pending_header = None
                    continue

                header = pending_header
                pending_header = None
                frame_id = header.get("id", 0)
                jpeg_bytes = message["bytes"]

                in_flight = True
                try:
                    detections, infer_ms = await asyncio.to_thread(
                        _process_frame, jpeg_bytes
                    )

                    response = DetectionResponse(
                        frame_id=frame_id,
                        detections=detections,
                        infer_ms=round(infer_ms, 1),
                        server_ts=time.time(),
                    )

                    await websocket.send_text(response.model_dump_json())
                finally:
                    in_flight = False

    except WebSocketDisconnect:
        logger.info("WebSocket client disconnected")
    except Exception:
        logger.exception("WebSocket error")


def _process_frame(jpeg_bytes: bytes):
    """Decode JPEG and run inference. Runs in a thread."""
    buf = np.frombuffer(jpeg_bytes, dtype=np.uint8)
    frame = cv2.imdecode(buf, cv2.IMREAD_COLOR)
    if frame is None:
        return [], 0.0
    return _inference.predict(frame)
