"use client";

import { useState } from "react";
import { useSettings } from "@/lib/settings";

export default function SettingsPanel() {
  const [open, setOpen] = useState(false);
  const { settings, updateSettings } = useSettings();

  return (
    <div className="relative">
      {/* Gear toggle */}
      <button
        onClick={() => setOpen(!open)}
        className="bg-zinc-800/80 hover:bg-zinc-700/80 text-zinc-400 hover:text-zinc-200 rounded-lg p-2 text-sm transition-colors border border-zinc-700/50"
        aria-label={open ? "Close settings" : "Open settings"}
      >
        {open ? "✕" : "⚙"}
      </button>

      {open && (
        <div className="absolute top-10 left-0 bg-zinc-900/95 rounded-lg p-4 w-64 space-y-4 text-sm text-zinc-200 border border-zinc-800/50 shadow-xl z-30">
          <h3 className="font-semibold text-zinc-100 text-xs uppercase tracking-wider">
            Settings
          </h3>

          {/* Speech rate */}
          <div>
            <label className="block text-zinc-400 text-xs mb-1">
              Speech Rate: {settings.speechRate.toFixed(1)}
            </label>
            <input
              type="range"
              min={0.8}
              max={1.6}
              step={0.1}
              value={settings.speechRate}
              onChange={(e) =>
                updateSettings({ speechRate: parseFloat(e.target.value) })
              }
              className="w-full accent-blue-500"
            />
          </div>

          {/* Confidence threshold */}
          <div>
            <label className="block text-zinc-400 text-xs mb-1">
              Confidence: {settings.confidenceThreshold.toFixed(2)}
            </label>
            <input
              type="range"
              min={0.25}
              max={0.75}
              step={0.05}
              value={settings.confidenceThreshold}
              onChange={(e) =>
                updateSettings({
                  confidenceThreshold: parseFloat(e.target.value),
                })
              }
              className="w-full accent-blue-500"
            />
          </div>

          {/* Mute toggle */}
          <button
            onClick={() => updateSettings({ muted: !settings.muted })}
            className={`w-full py-1.5 rounded text-xs font-medium transition-colors ${
              settings.muted
                ? "bg-red-900/60 text-red-200 hover:bg-red-900/80"
                : "bg-zinc-700 text-zinc-300 hover:bg-zinc-600"
            }`}
          >
            {settings.muted ? "Unmute (M)" : "Mute (M)"}
          </button>
        </div>
      )}
    </div>
  );
}
