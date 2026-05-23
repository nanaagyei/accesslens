"""Benchmark YOLO26 MLX inference latency on a directory of JPEG images."""

import sys
import time
from pathlib import Path

import cv2

# Add project root to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from backend.app.inference import YoloInference


def benchmark(image_dir: str | None = None, iterations: int = 50) -> None:
    """Run inference benchmark and print latency stats."""
    engine = YoloInference()

    # Collect test images
    if image_dir:
        image_paths = sorted(Path(image_dir).glob("*.jpg"))
        if not image_paths:
            print(f"No .jpg files found in {image_dir}")
            sys.exit(1)
    else:
        # Use bus.jpg fixture if no directory specified
        fixture = Path(__file__).parent.parent / "tests" / "fixtures" / "bus.jpg"
        if not fixture.exists():
            print("No test images found. Place .jpg files in eval/benchmark_frames/")
            print("or provide a directory as argument.")
            sys.exit(1)
        image_paths = [fixture]

    print(f"Benchmarking {len(image_paths)} image(s), {iterations} iterations each")
    print("=" * 50)

    all_latencies: list[float] = []

    for img_path in image_paths:
        frame = cv2.imread(str(img_path))
        if frame is None:
            print(f"  Skipping unreadable: {img_path.name}")
            continue

        latencies: list[float] = []
        for _ in range(iterations):
            t0 = time.perf_counter()
            detections, _ = engine.predict(frame)
            elapsed = (time.perf_counter() - t0) * 1000.0
            latencies.append(elapsed)

        latencies.sort()
        p50 = latencies[len(latencies) // 2]
        p95 = latencies[int(len(latencies) * 0.95)]
        p99 = latencies[int(len(latencies) * 0.99)]
        det_count = len(detections)

        print(f"\n{img_path.name} ({det_count} detections):")
        print(f"  p50: {p50:.1f} ms")
        print(f"  p95: {p95:.1f} ms")
        print(f"  p99: {p99:.1f} ms")
        print(f"  min: {min(latencies):.1f} ms")
        print(f"  max: {max(latencies):.1f} ms")

        all_latencies.extend(latencies)

    if all_latencies:
        all_latencies.sort()
        print(f"\n{'=' * 50}")
        print(f"Overall ({len(all_latencies)} runs):")
        print(f"  p50: {all_latencies[len(all_latencies) // 2]:.1f} ms")
        print(f"  p95: {all_latencies[int(len(all_latencies) * 0.95)]:.1f} ms")
        print(f"  p99: {all_latencies[int(len(all_latencies) * 0.99)]:.1f} ms")


if __name__ == "__main__":
    img_dir = sys.argv[1] if len(sys.argv) > 1 else None
    iters = int(sys.argv[2]) if len(sys.argv) > 2 else 50
    benchmark(img_dir, iters)
