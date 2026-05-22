"use client";

interface NarrationLogProps {
  entries: { text: string; ts: number }[];
}

export default function NarrationLog({ entries }: NarrationLogProps) {
  if (entries.length === 0) return null;

  return (
    <div className="absolute bottom-3 left-3 right-3 bg-zinc-900/80 rounded-lg px-4 py-3 max-h-48 overflow-y-auto">
      <div className="text-zinc-500 text-xs mb-1 font-semibold uppercase tracking-wider">
        Narration Log
      </div>
      <div className="space-y-1">
        {entries
          .slice(-10)
          .reverse()
          .map((entry, i) => (
            <div key={entry.ts + i} className="text-zinc-200 text-sm font-mono">
              {entry.text}
            </div>
          ))}
      </div>
    </div>
  );
}
