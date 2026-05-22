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

export function useNarrator() {
  const trackerRef = useRef<Tracker | null>(null);
  const narratorRef = useRef<Narrator | null>(null);
  const speechRef = useRef<Speech | null>(null);
  const { settings } = useSettings();
  const [logEntries, setLogEntries] = useState<LogEntry[]>([]);
  const [trackedDetections, setTrackedDetections] = useState<TrackedObject[]>(
    [],
  );

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

  const processDetections = useCallback(
    (detections: Detection[]) => {
      const now = Date.now();
      const tracker = getTracker();
      const narrator = getNarrator();
      const speech = getSpeech();

      // 1. Track
      const tracked = tracker.update(detections, now);
      setTrackedDetections(tracked);

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

        const spoken = speech.speak(result.utterance, {
          queuedAt: now,
          ttl_ms: UTTERANCE_TTL_MS,
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
    [getTracker, getNarrator, getSpeech],
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

    // Group by (label, zone_x) for the summary
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
  }, [getTracker, getSpeech]);

  return { processDetections, describeNow, logEntries, trackedDetections };
}
