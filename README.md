# AccessLens

On-device scene narrator for blind and low-vision users. No cloud, no data leaves your device.

Powered by [YOLO26 MLX](https://github.com/thewebAI/yolo-mlx) on Apple Silicon. Built for the YOLO26 MLX Build Challenge (May 2026).

## How to run

**Requirements:** Apple Silicon Mac (M1+), Python 3.10+, Node.js 20+.

```bash
# Clone
git clone https://github.com/nanaagyei/accesslens.git
cd accesslens

# Install the yolo-mlx package (sibling directory)
cd ../yolo-mlx && pip install -e ".[convert]" && cd ../accesslens

# Setup (installs Python + Node deps)
make setup

# Download and convert YOLO26n model weights
bash backend/scripts/download_models.sh

# Start backend (terminal 1)
make run-backend

# Start frontend (terminal 2)
make run-frontend
```

Open [http://localhost:3000](http://localhost:3000) in Safari or Chrome.

## What it does

1. Browser captures your webcam at 10 FPS.
2. Frames are sent over localhost WebSocket to a Python backend.
3. YOLO26 MLX runs object detection on Apple Silicon GPU.
4. Detections are sent back to the browser.
5. The browser narrates what it sees using the Web Speech API: "Person, center, near."

Everything runs locally. No internet required after setup.

## Model

- **yolo26n** (nano variant), pretrained on COCO
- Inference latency: `<placeholder>` ms p50 on M4 Mac mini

## Hardware tested

- Mac mini M4 (development machine)

## License

AGPL-3.0. See [LICENSE](LICENSE).
