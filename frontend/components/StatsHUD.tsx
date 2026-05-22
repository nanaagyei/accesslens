"use client";

interface StatsHUDProps {
  connected: boolean;
  inferMs: number;
  detectionCount: number;
}

export default function StatsHUD({
  connected,
  inferMs,
  detectionCount,
}: StatsHUDProps) {
  return (
    <div className="absolute top-3 right-3 bg-zinc-900/80 text-zinc-300 text-xs font-mono px-3 py-2 rounded-lg space-y-0.5">
      <div>
        <span className={connected ? "text-green-400" : "text-red-400"}>
          {connected ? "●" : "○"}
        </span>{" "}
        {connected ? "Connected" : "Disconnected"}
      </div>
      <div>Inference: {inferMs.toFixed(0)} ms</div>
      <div>Objects: {detectionCount}</div>
      <div>Model: yolo26n</div>
    </div>
  );
}
