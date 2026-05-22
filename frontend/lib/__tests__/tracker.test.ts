import { describe, it, expect, beforeEach } from "vitest";
import { Tracker, computeIoU } from "../tracker";
import type { Detection } from "../types";

function makeDet(overrides: Partial<Detection> = {}): Detection {
  return {
    label: "person",
    confidence: 0.9,
    box: [0.2, 0.2, 0.4, 0.6],
    zone_x: "center",
    zone_depth: "near",
    area_frac: 0.08,
    ...overrides,
  };
}

describe("computeIoU", () => {
  it("returns 1.0 for identical boxes", () => {
    const box: [number, number, number, number] = [0.1, 0.1, 0.5, 0.5];
    expect(computeIoU(box, box)).toBeCloseTo(1.0);
  });

  it("returns 0 for non-overlapping boxes", () => {
    expect(
      computeIoU([0, 0, 0.2, 0.2], [0.5, 0.5, 0.8, 0.8]),
    ).toBe(0);
  });

  it("computes partial overlap correctly", () => {
    // 0.1x0.1 overlap, areas 0.04 each, union = 0.04+0.04-0.01 = 0.07
    const iou = computeIoU([0.0, 0.0, 0.2, 0.2], [0.1, 0.1, 0.3, 0.3]);
    expect(iou).toBeCloseTo(0.01 / 0.07, 2);
  });
});

describe("Tracker", () => {
  let tracker: Tracker;

  beforeEach(() => {
    tracker = new Tracker();
  });

  it("creates a new track for a fresh detection", () => {
    const tracks = tracker.update([makeDet()], 1000);
    expect(tracks).toHaveLength(1);
    expect(tracks[0].id).toBe(1);
    expect(tracks[0].label).toBe("person");
    expect(tracks[0].missedFrames).toBe(0);
    expect(tracks[0].firstSeenAt).toBe(1000);
  });

  it("matches overlapping detections to existing tracks by IoU", () => {
    tracker.update([makeDet({ box: [0.2, 0.2, 0.4, 0.6] })], 1000);

    // Slightly shifted box (high IoU)
    const tracks = tracker.update(
      [makeDet({ box: [0.21, 0.21, 0.41, 0.61] })],
      1100,
    );

    expect(tracks).toHaveLength(1);
    expect(tracks[0].id).toBe(1); // same track
  });

  it("creates a new track when IoU is below threshold", () => {
    tracker.update([makeDet({ box: [0.0, 0.0, 0.1, 0.1] })], 1000);

    // Far away box (IoU ~0)
    const tracks = tracker.update(
      [makeDet({ box: [0.7, 0.7, 0.9, 0.9] })],
      1100,
    );

    expect(tracks).toHaveLength(2);
    expect(tracks.map((t) => t.id).sort()).toEqual([1, 2]);
  });

  it("evicts tracks after 21 missed frames", () => {
    tracker.update([makeDet()], 1000);

    // Send 21 empty frames
    for (let i = 0; i <= 20; i++) {
      tracker.update([], 1100 + i * 100);
    }

    expect(tracker.getCurrentTracks()).toHaveLength(0);
  });

  it("does not evict at exactly 20 missed frames", () => {
    tracker.update([makeDet()], 1000);

    for (let i = 0; i < 20; i++) {
      tracker.update([], 1100 + i * 100);
    }

    expect(tracker.getCurrentTracks()).toHaveLength(1);
    expect(tracker.getCurrentTracks()[0].missedFrames).toBe(20);
  });

  it("preserves locked label when model relabels", () => {
    tracker.update([makeDet({ label: "chair", box: [0.2, 0.2, 0.4, 0.6] })], 1000);
    tracker.lockLabel(1);

    // Same position but different label from model
    const tracks = tracker.update(
      [makeDet({ label: "couch", box: [0.21, 0.21, 0.41, 0.61] })],
      1100,
    );

    expect(tracks[0].label).toBe("chair"); // locked
  });

  it("allows label update when not locked", () => {
    tracker.update([makeDet({ label: "chair", box: [0.2, 0.2, 0.4, 0.6] })], 1000);

    const tracks = tracker.update(
      [makeDet({ label: "couch", box: [0.21, 0.21, 0.41, 0.61] })],
      1100,
    );

    expect(tracks[0].label).toBe("couch"); // updated
  });

  it("resets missedFrames on re-match", () => {
    tracker.update([makeDet({ box: [0.2, 0.2, 0.4, 0.6] })], 1000);

    // Miss 5 frames
    for (let i = 0; i < 5; i++) {
      tracker.update([], 1100 + i * 100);
    }
    expect(tracker.getCurrentTracks()[0].missedFrames).toBe(5);

    // Re-appear
    const tracks = tracker.update(
      [makeDet({ box: [0.21, 0.21, 0.41, 0.61] })],
      2000,
    );
    expect(tracks[0].missedFrames).toBe(0);
    expect(tracks[0].id).toBe(1);
  });

  it("tracks prevZone_x for zone transition detection", () => {
    tracker.update([makeDet({ zone_x: "center" })], 1000);

    const tracks = tracker.update(
      [makeDet({ zone_x: "left", box: [0.21, 0.21, 0.41, 0.61] })],
      1100,
    );

    expect(tracks[0].prevZone_x).toBe("center");
    expect(tracks[0].zone_x).toBe("left");
  });

  it("increments seenFrames on each match", () => {
    tracker.update([makeDet({ box: [0.2, 0.2, 0.4, 0.6] })], 1000);
    expect(tracker.getCurrentTracks()[0].seenFrames).toBe(1);

    tracker.update([makeDet({ box: [0.21, 0.21, 0.41, 0.61] })], 1100);
    expect(tracker.getCurrentTracks()[0].seenFrames).toBe(2);

    tracker.update([makeDet({ box: [0.22, 0.22, 0.42, 0.62] })], 1200);
    expect(tracker.getCurrentTracks()[0].seenFrames).toBe(3);
  });

  it("handles greedy assignment correctly with multiple tracks", () => {
    // Create two tracks far apart
    tracker.update(
      [
        makeDet({ label: "person", box: [0.0, 0.0, 0.15, 0.3] }),
        makeDet({ label: "chair", box: [0.7, 0.7, 0.9, 0.9] }),
      ],
      1000,
    );

    // Move them slightly
    const tracks = tracker.update(
      [
        makeDet({ label: "person", box: [0.01, 0.01, 0.16, 0.31] }),
        makeDet({ label: "chair", box: [0.71, 0.71, 0.91, 0.91] }),
      ],
      1100,
    );

    expect(tracks).toHaveLength(2);
    const person = tracks.find((t) => t.label === "person");
    const chair = tracks.find((t) => t.label === "chair");
    expect(person?.id).toBe(1);
    expect(chair?.id).toBe(2);
  });
});
