import type { TrackedObject } from "./tracker";
import { formatUtterance, type UtteranceGroup, type UtteranceState } from "./format";
import {
  MIN_UTTERANCE_GAP_MS,
  PER_TRACK_COOLDOWN_MS,
  CONFIDENCE_THRESHOLD,
  MIN_BBOX_AREA_FRAC,
} from "./constants";

export type TrackState = "NEW" | "MOVED" | "STABLE";

export interface NarrationCandidate {
  trackIds: number[];
  label: string;
  zone_x: "left" | "center" | "right";
  zone_depth: "near" | "mid" | "far";
  count: number;
  area_frac: number;
  priority: number;
  state: TrackState;
  text: string;
}

export interface NarrationResult {
  utterance: string | null;
  shouldInterrupt: boolean;
  candidate: NarrationCandidate | null;
}

export interface NarratorConfig {
  minUtteranceGapMs: number;
  perTrackCooldownMs: number;
  confidenceThreshold: number;
  minBboxAreaFrac: number;
  minSeenFrames: number;
}

const DEFAULT_CONFIG: NarratorConfig = {
  minUtteranceGapMs: MIN_UTTERANCE_GAP_MS,
  perTrackCooldownMs: PER_TRACK_COOLDOWN_MS,
  confidenceThreshold: CONFIDENCE_THRESHOLD,
  minBboxAreaFrac: MIN_BBOX_AREA_FRAC,
  minSeenFrames: 3,
};

function computePriority(
  state: TrackState,
  zone_depth: string,
  label: string,
  trackIds: number[],
  perTrackLastAnnouncedAt: Map<number, number>,
  now: number,
): number {
  let score = 0;
  if (state === "NEW") score += 1.5;
  if (zone_depth === "near") score += 1.0;
  else if (zone_depth === "mid") score += 0.5;
  if (label === "person") score += 0.5;

  // Penalty if any track in group was narrated in the last 8s
  const recentThreshold = now - 8000;
  for (const tid of trackIds) {
    const lastAnnounced = perTrackLastAnnouncedAt.get(tid);
    if (lastAnnounced != null && lastAnnounced > recentThreshold) {
      score -= 0.3;
      break; // apply penalty once per group
    }
  }

  return score;
}

export class Narrator {
  private config: NarratorConfig;
  lastUtteranceAt = -Infinity;
  private perTrackLastAnnouncedAt = new Map<number, number>();
  private perTrackLastZone = new Map<number, string>();

  // Tracking for interrupt rules (set externally by the hook)
  currentUtteranceStartedAt = -1;
  currentUtteranceEstDuration = 0;

  constructor(config: Partial<NarratorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /** Update config without losing internal state. */
  updateConfig(partial: Partial<NarratorConfig>): void {
    this.config = { ...this.config, ...partial };
  }

  /**
   * Decide what (if anything) to narrate for this frame.
   * Pure logic: no DOM, no speech calls. Fully testable.
   */
  decide(
    now: number,
    tracked: TrackedObject[],
    _sceneStaticSince: number,
  ): NarrationResult {
    const nil: NarrationResult = {
      utterance: null,
      shouldInterrupt: false,
      candidate: null,
    };

    // 1. Filter by confidence, area, and minimum frames seen
    const filtered = tracked.filter(
      (t) =>
        t.confidence >= this.config.confidenceThreshold &&
        t.area_frac >= this.config.minBboxAreaFrac &&
        t.seenFrames >= this.config.minSeenFrames,
    );

    // 2. Classify each track state using narrator's own announcement history
    const classified: { track: TrackedObject; state: TrackState }[] = [];
    for (const t of filtered) {
      const everAnnounced = this.perTrackLastAnnouncedAt.has(t.id);
      if (!everAnnounced) {
        classified.push({ track: t, state: "NEW" });
      } else {
        const prevZone = this.perTrackLastZone.get(t.id);
        const zoneChanged = prevZone != null && prevZone !== t.zone_x;
        const cooldownExpired =
          now - (this.perTrackLastAnnouncedAt.get(t.id) ?? 0) >=
          this.config.perTrackCooldownMs;

        if (zoneChanged && cooldownExpired) {
          classified.push({ track: t, state: "MOVED" });
        } else {
          classified.push({ track: t, state: "STABLE" });
        }
      }
    }

    // 3. Only NEW and MOVED are candidates
    const candidates = classified.filter(
      (c) => c.state === "NEW" || c.state === "MOVED",
    );

    if (candidates.length === 0) return nil;

    // 4. Count merge: group by (label, zone_x)
    const groups = new Map<string, NarrationCandidate>();
    for (const { track, state } of candidates) {
      const key = `${track.label}|${track.zone_x}`;
      const existing = groups.get(key);
      if (existing) {
        existing.trackIds.push(track.id);
        existing.count++;
        existing.area_frac = Math.max(existing.area_frac, track.area_frac);
        // Keep the higher-priority state (NEW > MOVED)
        if (state === "NEW" && existing.state !== "NEW") {
          existing.state = "NEW";
        }
      } else {
        groups.set(key, {
          trackIds: [track.id],
          label: track.label,
          zone_x: track.zone_x,
          zone_depth: track.zone_depth,
          count: 1,
          area_frac: track.area_frac,
          priority: 0,
          state,
          text: "",
        });
      }
    }

    // 5. Format and score each group
    const mergedCandidates: NarrationCandidate[] = [];
    for (const cand of groups.values()) {
      cand.text = formatUtterance(cand as UtteranceGroup, cand.state as UtteranceState);
      cand.priority = computePriority(
        cand.state,
        cand.zone_depth,
        cand.label,
        cand.trackIds,
        this.perTrackLastAnnouncedAt,
        now,
      );
      mergedCandidates.push(cand);
    }

    // 6. Sort by priority desc, then NEW > MOVED, then area desc
    mergedCandidates.sort((a, b) => {
      if (b.priority !== a.priority) return b.priority - a.priority;
      if (a.state !== b.state) return a.state === "NEW" ? -1 : 1;
      return b.area_frac - a.area_frac;
    });

    const chosen = mergedCandidates[0];

    // 7. Check MIN_UTTERANCE_GAP_MS
    if (now - this.lastUtteranceAt < this.config.minUtteranceGapMs) {
      return nil;
    }

    // 8. Check interrupt rules
    let shouldInterrupt = false;
    if (
      this.currentUtteranceEstDuration > 0 &&
      this.currentUtteranceStartedAt >= 0
    ) {
      const elapsed = now - this.currentUtteranceStartedAt;
      const pctDone = elapsed / (this.currentUtteranceEstDuration * 1000);

      if (chosen.priority >= 2.0 && pctDone < 0.3) {
        shouldInterrupt = true;
      } else {
        // Cannot interrupt, drop
        return nil;
      }
    }

    // 9. Commit: update timing state
    this.lastUtteranceAt = now;
    for (const tid of chosen.trackIds) {
      this.perTrackLastAnnouncedAt.set(tid, now);
    }

    // Update zone tracking for all filtered tracks (not just announced ones)
    for (const t of filtered) {
      this.perTrackLastZone.set(t.id, t.zone_x);
    }

    // Clean up stale entries for tracks no longer present
    const activeIds = new Set(tracked.map((t) => t.id));
    for (const tid of this.perTrackLastAnnouncedAt.keys()) {
      if (!activeIds.has(tid)) {
        this.perTrackLastAnnouncedAt.delete(tid);
        this.perTrackLastZone.delete(tid);
      }
    }

    return {
      utterance: chosen.text,
      shouldInterrupt,
      candidate: chosen,
    };
  }

  /** Update lastUtteranceAt when speech actually ends (from onend callback). */
  markSpeechEnded(endedAt: number): void {
    this.lastUtteranceAt = endedAt;
  }

  /** Reset all state. */
  reset(): void {
    this.lastUtteranceAt = -Infinity;
    this.perTrackLastAnnouncedAt.clear();
    this.perTrackLastZone.clear();
    this.currentUtteranceStartedAt = -1;
    this.currentUtteranceEstDuration = 0;
  }
}
