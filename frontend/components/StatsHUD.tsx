"use client";

interface StatsHUDProps {
  connected: boolean;
  inferMs: number;
  detectionCount: number;
  sending?: boolean;
}

export default function StatsHUD({
  connected,
  inferMs,
  detectionCount,
  sending = false,
}: StatsHUDProps) {
  return (
    <div className="bg-zinc-900/80 text-zinc-400 text-xs font-mono px-3 py-2 rounded-lg space-y-0.5 border border-zinc-800/50">
      <div className="flex items-center gap-1.5">
        {/* Listening indicator: pulses green when sending frames, red when disconnected */}
        <span
          className={`inline-block w-2 h-2 rounded-full ${
            !connected
              ? "bg-red-500"
              : sending
                ? "bg-green-400 animate-pulse"
                : "bg-green-600"
          }`}
        />
        <span className={connected ? "text-zinc-300" : "text-red-400"}>
          {connected ? "Connected" : "Disconnected"}
        </span>
      </div>
      <div>Inference: {inferMs.toFixed(0)} ms</div>
      <div>Objects: {detectionCount}</div>
      <div className="text-zinc-500">yolo26n</div>
    </div>
  );
}
