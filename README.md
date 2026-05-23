# AccessLens

On-device scene narrator for blind and low-vision users. No cloud, no data leaves your device.

Powered by [YOLO26 MLX](https://github.com/thewebAI/yolo-mlx) on Apple Silicon. Built for the YOLO26 MLX Build Challenge (May 2026).

## How to run

**Requirements:** Apple Silicon Mac (M1+), Python 3.10+, Node.js 20+.

```bash
# Clone
git clone https://github.com/nanaagyei/accesslens.git
cd accesslens

# Install the yolo-mlx package
pip install "yolo-mlx[convert] @ git+https://github.com/nanaagyei/yolo-mlx.git"

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

## Keyboard shortcuts

| Key | Action |
|-----|--------|
| Space | Describe full scene now |
| F | Find object by name (type to search) |
| M | Toggle mute |
| B | Toggle blind mode (screen off, narration continues) |
| ? | Show/hide keyboard shortcuts help |
| Esc | Exit search or close overlay |

## Key features

- **Smart narration** — announces new objects, zone transitions, and count changes without spamming
- **Scene change detection** — auto-describes when you enter a new scene (3+ new objects appear)
- **Proximity alert chime** — short audio tone before TTS for close, high-priority objects
- **Voice search** — press F, type an object name, get spoken location feedback
- **Blind mode** — blacks out screen to save battery; narration continues in background
- **Confidence-scaled overlays** — bounding box opacity reflects detection confidence
- **Session stats** — tracks total objects seen and unique types in the stats HUD
- **On-device privacy** — zero data leaves your machine, no cloud APIs

## Model

- **yolo26n** (nano variant), pretrained on COCO
- Inference latency: `<placeholder>` ms p50 on M4 Mac mini

## Hardware tested

- Mac mini M4 (development machine)

## License

AGPL-3.0. See [LICENSE](LICENSE).
