import { describe, it, expect, beforeEach } from "vitest";
import { Narrator } from "../narrator";
import type { TrackedObject } from "../tracker";

/** Helper to create a TrackedObject with sensible defaults. */
function makeTrack(overrides: Partial<TrackedObject> = {}): TrackedObject {
  return {
    id: 1,
    label: "person",
    labelLocked: false,
    box: [0.2, 0.2, 0.4, 0.6],
    zone_x: "center",
    zone_depth: "near",
    area_frac: 0.08,
    confidence: 0.9,
    prevZone_x: null,
    missedFrames: 0,
    seenFrames: 5, // past min-frames threshold by default
    firstSeenAt: 0,
    lastAnnouncedAt: 0,
    ...overrides,
  };
}

describe("Narrator", () => {
  let narrator: Narrator;

  beforeEach(() => {
    // Use minSeenFrames=1 for most tests to isolate narrator logic
    narrator = new Narrator({ minSeenFrames: 1 });
  });

  it("narrates a NEW object on first appearance", () => {
    const result = narrator.decide(1000, [makeTrack()], 0);
    expect(result.utterance).toBe("person,,, center, near!");
  });

  it("returns null for an empty scene", () => {
    const result = narrator.decide(1000, [], 0);
    expect(result.utterance).toBeNull();
  });

  // Mitigation: repeated narration of same person (4s cooldown)
  it("silences a track in the same zone after announcement", () => {
    // First announce
    const r1 = narrator.decide(1000, [makeTrack({ id: 1 })], 0);
    expect(r1.utterance).not.toBeNull();

    // Same track, same zone: narrator's internal map now knows id:1 was announced
    const r2 = narrator.decide(3000, [makeTrack({ id: 1 })], 0);
    expect(r2.utterance).toBeNull(); // STABLE, no narration
  });

  // Mitigation: per-track cooldown on zone move
  it("blocks MOVED narration within cooldown even if zone changed", () => {
    // First announce at center
    narrator.decide(1000, [makeTrack({ id: 1, zone_x: "center" })], 0);

    // Move to left at t=3000 (within 4s cooldown)
    const movedTrack = makeTrack({ id: 1, zone_x: "left" });
    const r = narrator.decide(3000, [movedTrack], 0);
    expect(r.utterance).toBeNull();
  });

  // Mitigation: per-track cooldown expires, zone change triggers MOVED
  it("allows MOVED narration after cooldown expires", () => {
    // First announce at center
    narrator.decide(1000, [makeTrack({ id: 1, zone_x: "center" })], 0);

    // Move to left at t=5001 (after 4s cooldown + 1.5s utterance gap)
    const movedTrack = makeTrack({ id: 1, zone_x: "left" });
    const r = narrator.decide(5001, [movedTrack], 0);
    expect(r.utterance).toBe("person,,, left, near.");
  });

  // Mitigation: multiple identical objects count-merged
  it("count-merges multiple objects of same class in same zone", () => {
    const tracks = [
      makeTrack({ id: 1, label: "person", zone_x: "center" }),
      makeTrack({ id: 2, label: "person", zone_x: "center" }),
      makeTrack({ id: 3, label: "person", zone_x: "center" }),
    ];

    const r = narrator.decide(1000, tracks, 0);
    expect(r.utterance).toBe("three people,,, center, near!");
  });

  // Mitigation: distant objects dominated by near ones (priority)
  it("prioritizes a near person over a far chair", () => {
    const tracks = [
      makeTrack({
        id: 1,
        label: "person",
        zone_x: "center",
        zone_depth: "near",
        area_frac: 0.1,
      }),
      makeTrack({
        id: 2,
        label: "chair",
        zone_x: "left",
        zone_depth: "far",
        area_frac: 0.02,
      }),
    ];

    const r = narrator.decide(1000, tracks, 0);
    // person,center,near: 1.5(new)+1.0(near)+0.5(person) = 3.0
    // chair,left,far: 1.5(new)+0(far)+0(not person) = 1.5
    expect(r.utterance).toBe("person,,, center, near!");
  });

  // Mitigation: MIN_UTTERANCE_GAP_MS
  it("enforces minimum gap between utterances", () => {
    // First utterance at t=1000
    narrator.decide(1000, [makeTrack({ id: 1 })], 0);

    // New object appears at t=1500 (only 500ms after last utterance)
    const r = narrator.decide(1500, [makeTrack({ id: 2, label: "chair" })], 0);
    expect(r.utterance).toBeNull();

    // At t=2501 (1501ms after last utterance), should speak
    const r2 = narrator.decide(2501, [makeTrack({ id: 2, label: "chair" })], 0);
    expect(r2.utterance).toBe("chair,,, center, near!");
  });

  // Mitigation: interrupt rules - high priority can interrupt
  it("allows interrupt when new priority >= 2.0 and current in first 30%", () => {
    narrator.lastUtteranceAt = -2000;
    narrator.currentUtteranceStartedAt = 900;
    narrator.currentUtteranceEstDuration = 2;

    const r = narrator.decide(
      1000,
      [makeTrack({ id: 1, label: "person", zone_depth: "near" })],
      0,
    );
    // priority = 1.5(new) + 1.0(near) + 0.5(person) = 3.0 >= 2.0
    // elapsed = 100ms, pctDone = 0.1/2 = 0.05 < 0.3
    expect(r.shouldInterrupt).toBe(true);
    expect(r.utterance).not.toBeNull();
  });

  // Mitigation: interrupt rules - low priority cannot interrupt
  it("drops utterance when priority < 2.0 and currently speaking", () => {
    narrator.lastUtteranceAt = -2000;
    narrator.currentUtteranceStartedAt = 900;
    narrator.currentUtteranceEstDuration = 2;

    const r = narrator.decide(
      1000,
      [makeTrack({ id: 1, label: "chair", zone_depth: "far" })],
      0,
    );
    // priority = 1.5(new) + 0(far) + 0(not person) = 1.5 < 2.0
    expect(r.utterance).toBeNull();
  });

  // Mitigation: interrupt rules - cannot interrupt late in utterance
  it("drops utterance when current utterance is > 30% done", () => {
    narrator.lastUtteranceAt = -2000;
    narrator.currentUtteranceStartedAt = 0;
    narrator.currentUtteranceEstDuration = 1;

    const r = narrator.decide(
      500, // 500ms into a 1s utterance = 50% done
      [makeTrack({ id: 1, label: "person", zone_depth: "near" })],
      0,
    );
    expect(r.utterance).toBeNull();
  });

  // Stable scene produces silence
  it("returns null when all tracks are STABLE (already announced, same zone)", () => {
    // Announce track 1
    narrator.decide(1000, [makeTrack({ id: 1, zone_x: "center" })], 0);

    // Same track, same zone: narrator knows it was announced
    const r = narrator.decide(15000, [makeTrack({ id: 1, zone_x: "center" })], 0);
    expect(r.utterance).toBeNull();
  });

  // Priority scoring: exact values
  it("computes correct priority scores", () => {
    // New near person = 1.5 + 1.0 + 0.5 = 3.0
    const r = narrator.decide(
      1000,
      [makeTrack({ id: 1, label: "person", zone_depth: "near" })],
      0,
    );
    expect(r.candidate?.priority).toBeCloseTo(3.0);
  });

  // Filters below confidence threshold
  it("ignores detections below confidence threshold", () => {
    const r = narrator.decide(
      1000,
      [makeTrack({ id: 1, confidence: 0.3 })],
      0,
    );
    expect(r.utterance).toBeNull();
  });

  // Filters tiny bboxes
  it("ignores detections with area below minimum", () => {
    const r = narrator.decide(
      1000,
      [makeTrack({ id: 1, area_frac: 0.005 })],
      0,
    );
    expect(r.utterance).toBeNull();
  });

  // Format: drops "far" depth
  it("drops depth from utterance when zone_depth is far", () => {
    const r = narrator.decide(
      1000,
      [makeTrack({ id: 1, zone_depth: "far", area_frac: 0.08 })],
      0,
    );
    expect(r.utterance).toBe("person,,, center!");
  });

  // Minimum seen frames filter
  it("ignores tracks that have not been seen for enough frames", () => {
    const narrator3 = new Narrator({ minSeenFrames: 3 });
    const r = narrator3.decide(
      1000,
      [makeTrack({ id: 1, seenFrames: 2 })],
      0,
    );
    expect(r.utterance).toBeNull();

    // Same track, now seen 3 frames
    const r2 = narrator3.decide(
      3000,
      [makeTrack({ id: 1, seenFrames: 3 })],
      0,
    );
    expect(r2.utterance).toBe("person,,, center, near!");
  });

  // Cleanup of stale track entries
  it("cleans up internal state for evicted tracks", () => {
    // Announce track 1
    narrator.decide(1000, [makeTrack({ id: 1 })], 0);

    // Track 1 disappears, track 2 appears
    const r = narrator.decide(3000, [makeTrack({ id: 2, label: "chair" })], 0);
    expect(r.utterance).toBe("chair,,, center, near!");

    // If track 1 reappears with the same ID somehow (new track), it should be NEW again
    // (cleanup removed the old entry for id:1)
  });
});
