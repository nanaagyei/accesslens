"use client";

import { useState, useCallback, useEffect } from "react";
import StartScreen from "@/components/StartScreen";
import WebcamCapture from "@/components/WebcamCapture";
import DetectionOverlay from "@/components/DetectionOverlay";
import StatsHUD from "@/components/StatsHUD";
import NarrationLog from "@/components/NarrationLog";
import SettingsPanel from "@/components/SettingsPanel";
import { SettingsProvider } from "@/lib/settings";
import { useNarrator } from "@/lib/useNarrator";
import { Detection } from "@/lib/types";

function MainView() {
  const [connected, setConnected] = useState(false);
  const [detections, setDetections] = useState<Detection[]>([]);
  const [inferMs, setInferMs] = useState(0);
  const [paused, setPaused] = useState(false);

  const { processDetections, describeNow, logEntries } = useNarrator();

  const handleDetections = useCallback(
    (dets: Detection[], ms: number) => {
      setDetections(dets);
      setInferMs(ms);
      processDetections(dets);
    },
    [processDetections],
  );

  const handleConnectionChange = useCallback((conn: boolean) => {
    setConnected(conn);
  }, []);

  // Describe-now hotkey (spacebar)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }
      if (e.code === "Space" && !e.repeat) {
        e.preventDefault();
        describeNow();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [describeNow]);

  // Visibility change: pause when tab hidden
  useEffect(() => {
    const handler = () => {
      setPaused(document.hidden);
    };
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, []);

  return (
    <main className="relative w-screen h-screen bg-black overflow-hidden">
      {/* Video feed (pauses frame sending when tab hidden) */}
      <WebcamCapture
        onDetections={handleDetections}
        onConnectionChange={handleConnectionChange}
        paused={paused}
      />

      {/* Detection bounding boxes */}
      <DetectionOverlay detections={detections} width={640} height={480} />

      {/* Settings panel (top-left) */}
      <SettingsPanel />

      {/* Stats overlay */}
      <StatsHUD
        connected={connected}
        inferMs={inferMs}
        detectionCount={detections.length}
      />

      {/* Describe-now button */}
      <button
        onClick={describeNow}
        className="absolute bottom-52 right-3 z-10 bg-zinc-100 text-zinc-900 px-4 py-2 rounded-lg font-semibold text-sm hover:bg-white transition-colors"
        aria-label="Describe scene now"
      >
        Describe Now (Space)
      </button>

      {/* Narration log */}
      <NarrationLog entries={logEntries} />

      {/* Connection error banner */}
      {!connected && (
        <div className="absolute top-0 left-0 right-0 bg-red-900/90 text-red-100 text-center py-2 text-sm z-30">
          Backend not reachable. Run{" "}
          <code className="bg-red-800 px-1 rounded">make run-backend</code> in
          the project directory. Retrying...
        </div>
      )}

      {/* Paused indicator */}
      {paused && (
        <div className="absolute top-10 left-0 right-0 bg-yellow-900/90 text-yellow-100 text-center py-2 text-sm z-30">
          Paused: tab not focused
        </div>
      )}
    </main>
  );
}

export default function Home() {
  const [started, setStarted] = useState(false);

  if (!started) {
    return <StartScreen onStart={() => setStarted(true)} />;
  }

  return (
    <SettingsProvider>
      <MainView />
    </SettingsProvider>
  );
}
