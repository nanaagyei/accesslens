"use client";

import { useEffect, useState } from "react";

interface NarrationLogProps {
  entries: { text: string; ts: number }[];
}

export default function NarrationLog({ entries }: NarrationLogProps) {
  const [glowTs, setGlowTs] = useState<number | null>(null);

  // Glow the most recent entry briefly when it appears
  useEffect(() => {
    if (entries.length === 0) return;
    const latest = entries[entries.length - 1];
    setGlowTs(latest.ts);
    const timer = setTimeout(() => setGlowTs(null), 1200);
    return () => clearTimeout(timer);
  }, [entries]);

  if (entries.length === 0) {
    return (
      <div className="flex flex-col h-full">
        <div className="text-zinc-500 text-xs font-semibold uppercase tracking-wider mb-2">
          Narration Log
        </div>
        <div className="text-zinc-600 text-sm italic">
          Waiting for detections...
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="text-zinc-500 text-xs font-semibold uppercase tracking-wider mb-2">
        Narration Log
      </div>
      <div className="space-y-1.5 overflow-y-auto flex-1">
        {entries
          .slice(-10)
          .reverse()
          .map((entry, i) => {
            const isGlowing = entry.ts === glowTs;
            return (
              <div
                key={entry.ts + i}
                className={`text-sm font-mono px-2 py-1 rounded transition-all duration-500 ${
                  isGlowing
                    ? "bg-blue-500/20 text-blue-100 shadow-[0_0_8px_rgba(59,130,246,0.3)]"
                    : i === 0
                      ? "text-zinc-200"
                      : "text-zinc-400"
                }`}
              >
                {entry.text}
              </div>
            );
          })}
      </div>
    </div>
  );
}
