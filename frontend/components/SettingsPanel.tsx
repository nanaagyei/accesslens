"use client";

import { useState } from "react";
import { useSettings } from "@/lib/settings";

export default function SettingsPanel() {
  const [open, setOpen] = useState(false);
  const { settings, updateSettings } = useSettings();

  return (
    <div className="absolute top-3 left-3 z-20">
      {/* Gear toggle */}
      <button
        onClick={() => setOpen(!open)}
        className="bg-zinc-800/80 hover:bg-zinc-700/80 text-zinc-300 rounded-lg p-2 text-sm"
        aria-label={open ? "Close settings" : "Open settings"}
      >
        {open ? "✕" : "⚙"}
      </button>

      {open && (
        <div className="mt-2 bg-zinc-900/95 rounded-lg p-4 w-64 space-y-4 text-sm text-zinc-200">
          <h3 className="font-semibold text-zinc-100">Settings</h3>

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
            className={`w-full py-1.5 rounded text-xs font-medium ${
              settings.muted
                ? "bg-red-900/60 text-red-200"
                : "bg-zinc-700 text-zinc-300"
            }`}
          >
            {settings.muted ? "Unmute Narration" : "Mute Narration"}
          </button>
        </div>
      )}
    </div>
  );
}
