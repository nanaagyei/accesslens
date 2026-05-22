"use client";

import { useState, useCallback, useRef } from "react";
import StartScreen from "@/components/StartScreen";
import WebcamCapture from "@/components/WebcamCapture";
import DetectionOverlay from "@/components/DetectionOverlay";
import StatsHUD from "@/components/StatsHUD";
import NarrationLog from "@/components/NarrationLog";
import { Detection } from "@/lib/types";

export default function Home() {
  const [started, setStarted] = useState(false);
  const [connected, setConnected] = useState(false);
  const [detections, setDetections] = useState<Detection[]>([]);
  const [inferMs, setInferMs] = useState(0);
  const [logEntries, setLogEntries] = useState<{ text: string; ts: number }[]>(
    [],
  );

  // Stable refs for callbacks passed to child components
  const handleDetections = useCallback(
    (dets: Detection[], ms: number) => {
      setDetections(dets);
      setInferMs(ms);
    },
    [],
  );

  const handleConnectionChange = useCallback((conn: boolean) => {
    setConnected(conn);
  }, []);

  if (!started) {
    return <StartScreen onStart={() => setStarted(true)} />;
  }

  return (
    <main className="relative w-screen h-screen bg-black overflow-hidden">
      {/* Video feed */}
      <WebcamCapture
        onDetections={handleDetections}
        onConnectionChange={handleConnectionChange}
      />

      {/* Detection bounding boxes */}
      <DetectionOverlay detections={detections} width={640} height={480} />

      {/* Stats overlay */}
      <StatsHUD
        connected={connected}
        inferMs={inferMs}
        detectionCount={detections.length}
      />

      {/* Narration log (will be populated by narrator in Day 2) */}
      <NarrationLog entries={logEntries} />

      {/* Connection error banner */}
      {!connected && (
        <div className="absolute top-0 left-0 right-0 bg-red-900/90 text-red-100 text-center py-2 text-sm">
          Backend not reachable. Run{" "}
          <code className="bg-red-800 px-1 rounded">make run-backend</code> in
          the project directory. Retrying...
        </div>
      )}
    </main>
  );
}
