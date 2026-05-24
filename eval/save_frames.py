"""Capture frames from the webcam and save to eval/benchmark_frames/ for benchmarking."""

import sys
import time
from datetime import datetime
from pathlib import Path

import cv2


def save_frames(num_frames: int = 10, warmup: int = 30) -> None:
    """Capture num_frames from the default webcam after warmup frames."""
    output_dir = Path(__file__).parent / "benchmark_frames"
    output_dir.mkdir(exist_ok=True)

    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        print("ERROR: Could not open webcam.")
        sys.exit(1)

    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)

    print(f"Warming up camera ({warmup} frames)...")
    for _ in range(warmup):
        cap.read()

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    saved = 0

    print(f"Saving {num_frames} frames to {output_dir}/")
    for i in range(num_frames):
        ret, frame = cap.read()
        if not ret:
            print(f"  Frame {i}: capture failed, skipping")
            continue

        filename = f"frame_{timestamp}_{i:03d}.jpg"
        filepath = output_dir / filename
        cv2.imwrite(str(filepath), frame)
        saved += 1
        time.sleep(0.1)  # ~10 FPS to match app capture rate

    cap.release()
    print(f"Done. Saved {saved} frames to {output_dir}/")


if __name__ == "__main__":
    n = int(sys.argv[1]) if len(sys.argv) > 1 else 10
    save_frames(n)
