# AccessLens — Verification Checklist

Run this checklist on Day 3 after all code changes are complete. Every item here requires hands-on testing — none can be automated.

---

## 1. Fresh Clone Test (use a separate machine or directory)

```bash
# 1. Clone the repo
git clone <your-repo-url> accesslens-fresh
cd accesslens-fresh

# 2. Run setup (time this — should be < 5 minutes)
make setup

# 3. Start backend (Terminal 1)
make run-backend
# Wait for "Model ready" log line

# 4. Start frontend (Terminal 2)
make run-frontend

# 5. Open http://localhost:3000 in Chrome
# 6. Click "Start AccessLens", allow camera
# 7. Verify: bounding boxes appear, narration speaks
```

**Pass:** Working app within 5 minutes of clone with only the README to guide you.

---

## 2. Eval Protocol

Run these from `08_EVAL_PROTOCOL.md`. You need a room with 4+ COCO objects (chair, table, laptop, cup, person).

### Test 1 — Static Scene (30s)

1. Hold laptop steady, don't move.
2. Start a 30-second timer.
3. Count utterances.

**Pass:** 1-3 utterances (initial sweep then silence).
**Fail (too noisy):** > 5 utterances. Increase `STABLE_SCENE_TIMEOUT_MS` or `PER_TRACK_COOLDOWN_MS`.
**Fail (too quiet):** 0 utterances. Lower `CONFIDENCE_THRESHOLD` or check initial-sweep logic.

### Test 2 — Slow Walk (60s)

1. Press Space (describe-now) once.
2. Walk slowly across the room for 60 seconds, panning the laptop.
3. Count utterances during the walk.
4. Press Space again at the end.

**Pass:** 8-15 utterances.
**Fail (spam):** > 20 utterances. Raise `MIN_UTTERANCE_GAP_MS` or `PER_TRACK_COOLDOWN_MS`.
**Fail (sparse):** < 6 utterances. Reduce `PER_TRACK_COOLDOWN_MS` or check NEW transitions.

### Test 3 — Quick Swap

1. Hold up a cup centered. Wait for "cup, center" cue.
2. Swap to a book in the same position. Wait for cue.
3. Swap to a phone. Wait for cue.
4. Swap back to cup. Listen.

**Pass:** 4 distinct cues, each spoken once.

### Test 4 — Count Merge

1. Two people stand in the center of the frame.
2. Listen for narration.

**Pass:** "two people, center" spoken once (not "person" twice).

### Test 5 — Cross-Zone Transit

1. A person walks left-to-right across the frame over ~5 seconds.
2. Count narrations.

**Pass:** 2-3 cues max.

### Test 6 — Latency

1. Watch the Stats HUD inference time.
2. Walk into view from outside the frame.

**Pass:** < 600ms p95 over 30 seconds.

### Test 7 — Describe-Now

1. Set up 3-4 known objects in view (chair left, laptop center, person right).
2. Wait for ambient narration to settle.
3. Press Space.

**Pass:** Single coherent summary within ~300ms (e.g. "Three objects in view. Chair, left. Laptop, center, near. Person, right.").

---

## 3. Edge Case Tests

| Test | How | Pass |
|------|-----|------|
| Camera covered | Cover lens with your hand | No crash, no narration. Uncovering restores narration |
| Backlight / window | Point camera at a bright window | Noisy detections filtered by confidence threshold |
| TV in background | TV showing people in the background | Detections may appear — acceptable (real users want this) |
| Battery power | Unplug the laptop | Latency may climb but cadence still smooth, no faster than it can speak |
| Webcam disconnect | Unplug external webcam mid-session | UI shows a clear error |
| Tab away / back | Switch to another tab, then return | "Paused" banner shows while away, narration resumes on return |
| Mute hotkey | Press M | "Muted" banner appears, narration stops. Press M again to unmute |
| Voice search | Press F, type "person", press Enter | Matching boxes highlighted yellow, speaks "person, found, center, near" |
| Voice search (not found) | Press F, type "elephant", press Enter | Speaks "elephant, not in view" |
| Voice search exit | Press Escape or wait 5 seconds idle | Search overlay disappears, highlight removed |
| Describe-now | Press Space | Full scene summary spoken |
| Speech rate slider | Open settings, adjust rate slider | TTS speed changes immediately |
| Blind mode on | Press B | Screen goes black, narration continues, "Screen off — narration active" text visible |
| Blind mode off | Press B again | Full UI restores, detections visible |
| Blind mode + describe | Press B, then Space | Scene summary spoken while screen is off |
| Scene change auto-describe | Walk into a new room or pan quickly to reveal 3+ new objects | Auto-describes the scene within ~1 second |
| Shortcuts help | Press ? (Shift+/) | Overlay shows all keyboard shortcuts (Space, F, M, B, ?, Esc) |
| Shortcuts dismiss | Press ? or Esc while overlay is open | Overlay closes |
| Proximity chime | Walk close to camera (near zone) with a new high-priority object | Short descending tone plays before TTS cue |
| No chime for far objects | Objects in far zone | No chime, just spoken cue |
| Session stats | Detect several objects over time | Stats HUD shows "Session: N seen, M types" |
| Confidence opacity | Mix of high and low confidence detections | High-confidence boxes are solid, low-confidence boxes are faint/translucent |

---

## 4. Threshold Tuning (if eval tests fail)

If tests are too noisy or too quiet, adjust these values in `frontend/lib/constants.ts` and `backend/app/config.py`:

| Symptom | Parameter | Current | Try |
|---------|-----------|---------|-----|
| Too many cues (spam) | `MIN_UTTERANCE_GAP_MS` | 1500 | 2000 |
| Too many cues (spam) | `PER_TRACK_COOLDOWN_MS` | 4000 | 5000 |
| Too few cues | `CONFIDENCE_THRESHOLD` | 0.45 | 0.35 |
| Too few cues | `PER_TRACK_COOLDOWN_MS` | 4000 | 3000 |
| Noisy / flickering detections | `CONFIDENCE_THRESHOLD` | 0.45 | 0.55 |
| Static scene not silent | `STABLE_SCENE_TIMEOUT_MS` | 10000 | 8000 |
| Speech too fast | `TTS_RATE` | 1.3 | 1.1 |

Do 3-5 tuning passes. Lock the final values and commit them.

---

## 5. Record Eval Results

```bash
mkdir -p eval/results
```

Save your results as `eval/results/YYYYMMDD_HHMM.json`:

```json
{
  "timestamp": "2026-05-23T14:30:00",
  "config_snapshot": {
    "confidence_threshold": 0.45,
    "min_utterance_gap_ms": 1500,
    "per_track_cooldown_ms": 4000,
    "stable_scene_timeout_ms": 10000,
    "tts_rate": 1.3
  },
  "tests": {
    "static": { "utterances": 0, "first_ms": 0, "pass": false },
    "walk": { "utterances": 0, "perceived_spam": 0, "pass": false },
    "swap": { "pass": false },
    "multi": { "pass": false },
    "cross_zone": { "utterances": 0, "pass": false },
    "latency": { "p50_ms": 0, "p95_ms": 0, "pass": false },
    "describe_now": { "pass": false },
    "fresh_clone": { "time_to_working_minutes": 0, "pass": false }
  },
  "notes": ""
}
```

Keep at least two runs: one pre-tuning, one final.

---

## 6. Safari Test

1. Open `http://localhost:3000` in Safari.
2. Voices differ between browsers — verify narration still sounds natural.
3. Pick the browser you'll use for the demo video.

---

## 7. Final Checks

- [ ] `make lint` passes clean (ruff, mypy, tsc)
- [ ] `make test` passes (72/72)
- [ ] Final config values committed
- [ ] Eval results saved to `eval/results/`
- [ ] README "How to run" matches what you actually did in the fresh clone test
- [ ] You know what 60 seconds of demo footage will look like (read `09_DEMO_SHOT_LIST.md`)
- [ ] You know where you'll record (lighting, room, props)

Once all items pass, you're demo-ready for Day 4.
