"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Tracker, type TrackedObject } from "./tracker";
import { Narrator } from "./narrator";
import { Speech } from "./speech";
import { formatDescribeNow, type UtteranceGroup } from "./format";
import { useSettings } from "./settings";
import { UTTERANCE_TTL_MS } from "./constants";
import type { Detection } from "./types";

export interface LogEntry {
  text: string;
  ts: number;
}

/** Threshold: if this many NEW tracks appear in a single frame, auto-describe. */
const SCENE_CHANGE_THRESHOLD = 3;

export function useNarrator() {
  const trackerRef = useRef<Tracker | null>(null);
  const narratorRef = useRef<Narrator | null>(null);
  const speechRef = useRef<Speech | null>(null);
  const { settings } = useSettings();
  const [logEntries, setLogEntries] = useState<LogEntry[]>([]);
  const [trackedDetections, setTrackedDetections] = useState<TrackedObject[]>(
    [],
  );
  const prevTrackIdsRef = useRef<Set<number>>(new Set());
  const lastAutoDescribeRef = useRef<number>(0);

  // Session-level object tracking
  const [sessionStats, setSessionStats] = useState({
    uniqueLabels: new Set<string>(),
    totalSeen: 0,
  });

  // Lazy-init to avoid SSR issues with speechSynthesis
  const getTracker = useCallback(() => {
    if (!trackerRef.current) trackerRef.current = new Tracker();
    return trackerRef.current;
  }, []);

  const getNarrator = useCallback(() => {
    if (!narratorRef.current) narratorRef.current = new Narrator();
    return narratorRef.current;
  }, []);

  const getSpeech = useCallback(() => {
    if (!speechRef.current) {
      speechRef.current = new Speech();
      speechRef.current.init();
    }
    return speechRef.current;
  }, []);

  // Sync settings to speech instance
  useEffect(() => {
    if (speechRef.current) {
      speechRef.current.setRate(settings.speechRate);
      speechRef.current.setMuted(settings.muted);
    }
  }, [settings.speechRate, settings.muted]);

  // Update narrator config in place (preserves cooldown/zone state)
  useEffect(() => {
    if (narratorRef.current) {
      narratorRef.current.updateConfig({
        confidenceThreshold: settings.confidenceThreshold,
      });
    }
  }, [settings.confidenceThreshold]);

  const doDescribeNow = useCallback(
    (speech: Speech, tracker: Tracker) => {
      const tracks = tracker.getCurrentTracks();
      if (tracks.length === 0) return;

      const groupMap = new Map<string, UtteranceGroup>();
      for (const t of tracks) {
        const key = `${t.label}|${t.zone_x}`;
        const existing = groupMap.get(key);
        if (existing) {
          existing.count++;
          existing.area_frac = Math.max(existing.area_frac, t.area_frac);
        } else {
          groupMap.set(key, {
            label: t.label,
            zone_x: t.zone_x,
            zone_depth: t.zone_depth,
            count: 1,
            area_frac: t.area_frac,
          });
        }
      }

      const summary = formatDescribeNow(Array.from(groupMap.values()));
      speech.cancel();
      speech.speak(summary, { priority: 10 });
      const now = Date.now();
      setLogEntries((prev) => [...prev.slice(-9), { text: summary, ts: now }]);
    },
    [],
  );

  const processDetections = useCallback(
    (detections: Detection[]) => {
      const now = Date.now();
      const tracker = getTracker();
      const narrator = getNarrator();
      const speech = getSpeech();

      // 1. Track
      const tracked = tracker.update(detections, now);
      setTrackedDetections(tracked);

      // Update session-level object counts
      const newLabels = tracked
        .filter((t) => !prevTrackIdsRef.current.has(t.id))
        .map((t) => t.label);
      if (newLabels.length > 0) {
        setSessionStats((prev) => {
          const updated = new Set(prev.uniqueLabels);
          for (const l of newLabels) updated.add(l);
          return {
            uniqueLabels: updated,
            totalSeen: prev.totalSeen + newLabels.length,
          };
        });
      }

      // Scene change detection: if many new tracks appear at once, auto-describe
      const currentIds = new Set(tracked.map((t) => t.id));
      const prevIds = prevTrackIdsRef.current;
      const newCount = tracked.filter((t) => !prevIds.has(t.id)).length;
      prevTrackIdsRef.current = currentIds;

      if (
        newCount >= SCENE_CHANGE_THRESHOLD &&
        now - lastAutoDescribeRef.current > 5000
      ) {
        lastAutoDescribeRef.current = now;
        // Small delay so tracks stabilize before describing
        setTimeout(() => doDescribeNow(speech, tracker), 500);
        return;
      }

      // 2. Sync speech state to narrator for interrupt rules
      narrator.currentUtteranceStartedAt = speech.startedAt;
      narrator.currentUtteranceEstDuration = speech.estDuration;

      // 3. Narrate
      const result = narrator.decide(now, tracked, 0);

      // 4. Speak
      if (result.utterance) {
        if (result.shouldInterrupt) {
          speech.cancel();
        }

        // Play proximity chime for high-priority near objects
        const useChime =
          result.candidate != null &&
          result.candidate.zone_depth === "near" &&
          result.candidate.priority >= 2.0;

        const spoken = speech.speak(result.utterance, {
          queuedAt: now,
          ttl_ms: UTTERANCE_TTL_MS,
          chime: useChime,
          onEnd: () => {
            // Update narrator gap timing from actual speech end
            narrator.markSpeechEnded(Date.now());
          },
        });

        if (spoken) {
          // Lock labels on announced tracks
          if (result.candidate) {
            for (const tid of result.candidate.trackIds) {
              tracker.lockLabel(tid);
            }
          }

          setLogEntries((prev) => [
            ...prev.slice(-9),
            { text: result.utterance!, ts: now },
          ]);
        }
      }
    },
    [getTracker, getNarrator, getSpeech, doDescribeNow],
  );

  const describeNow = useCallback(() => {
    const tracker = getTracker();
    const speech = getSpeech();
    const tracks = tracker.getCurrentTracks();

    if (tracks.length === 0) {
      speech.cancel();
      speech.speak("Nothing in view.", { priority: 10 });
      const now = Date.now();
      setLogEntries((prev) => [
        ...prev.slice(-9),
        { text: "Nothing in view.", ts: now },
      ]);
      return;
    }

    doDescribeNow(speech, tracker);
  }, [getTracker, getSpeech, doDescribeNow]);

  const speakText = useCallback(
    (text: string) => {
      const speech = getSpeech();
      speech.cancel();
      speech.speak(text, { priority: 10 });
    },
    [getSpeech],
  );

  return {
    processDetections,
    describeNow,
    logEntries,
    trackedDetections,
    speakText,
    sessionStats: {
      uniqueClasses: sessionStats.uniqueLabels.size,
      totalObjectsSeen: sessionStats.totalSeen,
    },
  };
}
