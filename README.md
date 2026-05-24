# AccessLens

Real-time scene narrator for blind and low-vision users. Runs entirely on Apple Silicon. Zero cloud. Zero data leaves your device.

**Demo:** https://youtu.be/YFThk8kSvag
**Repo:** https://github.com/nanaagyei/accesslens.git

Built for the [YOLO26 MLX Build Challenge](https://github.com/thewebAI/yolo-mlx) (May 2026).

---

## Why I built this

285 million people worldwide live with visual impairments. Most existing assistive tech requires a cloud connection, leaking private visual data to third-party servers. The tradeoff between privacy and accessibility shouldn't exist.

AccessLens proves you can deliver real-time spatial awareness with modern on-device ML and never send a single byte off the machine. Everything runs on Apple Silicon's unified memory — from inference to speech — with sub-130ms latency from camera frame to spoken word.

---

## What it does

Point your MacBook camera at a room and AccessLens narrates what's there:

```
> person  (pause)  center, near      // new object detected
> two people  (pause)  center        // count merged
> laptop  (pause)  left, near        // different zone
> ... silence ...                    // scene stable, no spam
```

The system captures webcam frames at 10 FPS, runs YOLO26 object detection on Apple Silicon GPU via MLX, classifies objects into spatial zones (left/center/right, near/mid/far), and speaks context-aware narration through the native text-to-speech engine.

The hard problem isn't detection — it's deciding **what to say and when to shut up**. AccessLens implements a priority-scored narration state machine:

- **Priority scoring** — NEW objects rank higher than MOVED, near ranks higher than far, people rank higher than furniture. Only the highest-priority candidate speaks per frame window.
- **Anti-spam** — Per-track cooldowns (4s), minimum utterance gaps (1.5s), and interrupt rules that prevent cutting off important descriptions.
- **Count merging** — Three people in center becomes "three people, center" — not three separate announcements.
- **Scene-change detection** — 3+ new objects in a single frame triggers an automatic full-scene summary.
- **Natural cadence** — Tuned pause pattern between object label and position for clear, readable speech.

---

## Key features

- **On-device privacy** — zero network calls, camera data stays on your Mac, works offline
- **Sub-130ms pipeline** — camera to speech faster than human reaction time
- **Smart narration** — announces new objects, zone transitions, and count changes without spamming
- **Describe-now** — press Space for a full scene summary that won't get interrupted
- **Voice search** — press F, type an object name, get spoken location feedback with highlighted bounding boxes
- **Blind mode** — blacks out screen to save battery; narration continues in background
- **Proximity chime** — short descending tone before TTS for close, high-priority objects
- **Scene-change auto-describe** — auto-narrates when entering a new scene
- **Confidence-scaled overlays** — bounding box opacity reflects detection certainty
- **Session stats** — tracks total objects seen and unique types in the HUD

---

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

Open [http://localhost:3000](http://localhost:3000) in Safari or Chrome. Click "Launch AccessLens" and grant camera access.

---

## Architecture

```
Camera (10fps) → WebSocket (localhost) → YOLO26 MLX (Apple Silicon GPU)
     → Spatial Zones → Priority Narrator → Web Speech API
```

| Component | Technology |
|-----------|-----------|
| Object detection | YOLO26n via MLX |
| Backend | Python, FastAPI, WebSocket |
| Frontend | Next.js 15, React 19, TypeScript |
| Speech | Web Speech API (native TTS) |
| Frame transport | WebSocket on localhost |
| Styling | Tailwind CSS 4 |

**Pipeline design:**
- Backpressure — drops frames if inference is in-flight (no queue buildup)
- Lazy model loading — YOLO26 loads on first frame (fast startup)
- Warmup inference — first prediction latency is hidden
- Narrator is a pure function — fully testable, no DOM or speech in core logic

---

## Keyboard shortcuts

| Key | Action |
|-----|--------|
| Space | Describe full scene now |
| F | Find object by name |
| M | Toggle mute |
| B | Toggle blind mode |
| ? | Show keyboard shortcuts |
| Esc | Exit search or close overlay |

---

## Performance

| Metric | Value |
|--------|-------|
| Model | yolo26n (COCO, 80 classes) |
| Inference (p50) | ~85ms |
| Inference (p95) | ~140ms |
| Detection-to-speech | <130ms |
| Capture rate | 10 FPS |
| Network egress | 0 bytes |

---

## Project structure

```
accesslens/
├── backend/           Python FastAPI + YOLO26 MLX inference
│   ├── app/           WebSocket server, inference, spatial zones, config
│   ├── tests/         pytest test suite
│   └── scripts/       benchmark, model download
├── frontend/          Next.js 15 + React 19
│   ├── app/           App Router pages
│   ├── components/    Webcam, overlay, narration log, landing page
│   └── lib/           Narrator, tracker, speech, format, WebSocket client
├── eval/              Benchmark frames and tuning results
└── docs/              Architecture docs, eval protocol, demo shot list
```

---

## Testing

```bash
make test        # Run all tests (pytest + vitest, 49 passing)
make lint        # Ruff + mypy + tsc
make benchmark   # YOLO26 inference latency measurement
```

---

## Hardware tested

- MacBook Pro, Apple Silicon (M-series)

---

## License

AGPL-3.0. See [LICENSE](LICENSE).
