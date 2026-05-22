import type { Detection } from "./types";

export interface TrackedObject {
  id: number;
  label: string;
  labelLocked: boolean;
  box: [number, number, number, number];
  zone_x: "left" | "center" | "right";
  zone_depth: "near" | "mid" | "far";
  area_frac: number;
  confidence: number;
  prevZone_x: "left" | "center" | "right" | null;
  missedFrames: number;
  seenFrames: number;
  firstSeenAt: number;
  lastAnnouncedAt: number;
}

/** Standard intersection-over-union for [x1, y1, x2, y2] boxes. */
export function computeIoU(
  a: [number, number, number, number],
  b: [number, number, number, number],
): number {
  const x1 = Math.max(a[0], b[0]);
  const y1 = Math.max(a[1], b[1]);
  const x2 = Math.min(a[2], b[2]);
  const y2 = Math.min(a[3], b[3]);

  const interW = Math.max(0, x2 - x1);
  const interH = Math.max(0, y2 - y1);
  const inter = interW * interH;

  const areaA = (a[2] - a[0]) * (a[3] - a[1]);
  const areaB = (b[2] - b[0]) * (b[3] - b[1]);
  const union = areaA + areaB - inter;

  if (union <= 0) return 0;
  return inter / union;
}

const IOU_THRESHOLD = 0.3;
const MAX_MISSED_FRAMES = 20;

export class Tracker {
  private nextId = 1;
  private tracks = new Map<number, TrackedObject>();

  /** Match incoming detections to existing tracks, return all active tracks. */
  update(detections: Detection[], now: number): TrackedObject[] {
    const trackIds = Array.from(this.tracks.keys());
    const matchedTrackIds = new Set<number>();
    const matchedDetIdxs = new Set<number>();

    // Build IoU pairs and sort descending
    const pairs: { trackId: number; detIdx: number; iou: number }[] = [];
    for (const tid of trackIds) {
      const track = this.tracks.get(tid)!;
      for (let di = 0; di < detections.length; di++) {
        const iou = computeIoU(track.box, detections[di].box);
        if (iou > IOU_THRESHOLD) {
          pairs.push({ trackId: tid, detIdx: di, iou });
        }
      }
    }
    pairs.sort((a, b) => b.iou - a.iou);

    // Greedy assignment
    for (const { trackId, detIdx } of pairs) {
      if (matchedTrackIds.has(trackId) || matchedDetIdxs.has(detIdx)) continue;
      matchedTrackIds.add(trackId);
      matchedDetIdxs.add(detIdx);

      const track = this.tracks.get(trackId)!;
      const det = detections[detIdx];

      track.prevZone_x = track.zone_x;
      track.box = det.box;
      track.zone_x = det.zone_x;
      track.zone_depth = det.zone_depth;
      track.area_frac = det.area_frac;
      track.confidence = det.confidence;
      track.missedFrames = 0;
      track.seenFrames++;

      // Label lock: only update label if not locked
      if (!track.labelLocked) {
        track.label = det.label;
      }
    }

    // Create new tracks for unmatched detections
    for (let di = 0; di < detections.length; di++) {
      if (matchedDetIdxs.has(di)) continue;
      const det = detections[di];
      this.tracks.set(this.nextId, {
        id: this.nextId,
        label: det.label,
        labelLocked: false,
        box: det.box,
        zone_x: det.zone_x,
        zone_depth: det.zone_depth,
        area_frac: det.area_frac,
        confidence: det.confidence,
        prevZone_x: null,
        missedFrames: 0,
        seenFrames: 1,
        firstSeenAt: now,
        lastAnnouncedAt: 0,
      });
      this.nextId++;
    }

    // Increment missed frames and evict stale tracks
    for (const tid of trackIds) {
      if (matchedTrackIds.has(tid)) continue;
      const track = this.tracks.get(tid)!;
      track.missedFrames++;
      if (track.missedFrames > MAX_MISSED_FRAMES) {
        this.tracks.delete(tid);
      }
    }

    return Array.from(this.tracks.values());
  }

  /** Lock a track's label so model relabeling won't change it. */
  lockLabel(trackId: number): void {
    const track = this.tracks.get(trackId);
    if (track) track.labelLocked = true;
  }

  /** Get all currently active tracks. */
  getCurrentTracks(): TrackedObject[] {
    return Array.from(this.tracks.values());
  }

  /** Reset all state (useful for testing). */
  reset(): void {
    this.tracks.clear();
    this.nextId = 1;
  }
}
