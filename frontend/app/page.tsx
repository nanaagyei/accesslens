"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import StartScreen from "@/components/StartScreen";
import WebcamCapture from "@/components/WebcamCapture";
import DetectionOverlay from "@/components/DetectionOverlay";
import StatsHUD from "@/components/StatsHUD";
import NarrationLog from "@/components/NarrationLog";
import SettingsPanel from "@/components/SettingsPanel";
import { SettingsProvider, useSettings } from "@/lib/settings";
import { useNarrator } from "@/lib/useNarrator";
import { Detection } from "@/lib/types";

const SHORTCUTS = [
  { key: "Space", action: "Describe full scene" },
  { key: "F", action: "Find object by name" },
  { key: "M", action: "Toggle mute" },
  { key: "B", action: "Toggle blind mode (screen off)" },
  { key: "?", action: "Show/hide this help" },
  { key: "Esc", action: "Exit search or close overlay" },
];

function MainView() {
  const [connected, setConnected] = useState(false);
  const [detections, setDetections] = useState<Detection[]>([]);
  const [inferMs, setInferMs] = useState(0);
  const [paused, setPaused] = useState(false);
  const [sending, setSending] = useState(false);
  const [blindMode, setBlindMode] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  const {
    processDetections,
    describeNow,
    logEntries,
    trackedDetections,
    speakText,
  } = useNarrator();
  const { settings, updateSettings } = useSettings();

  // Voice search state
  const [searchMode, setSearchMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResult, setSearchResult] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const exitSearch = useCallback(() => {
    setSearchMode(false);
    setSearchQuery("");
    setSearchResult(null);
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = null;
    }
  }, []);

  const resetSearchTimeout = useCallback(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(exitSearch, 5000);
  }, [exitSearch]);

  const executeSearch = useCallback(
    (query: string) => {
      if (!query.trim()) return;
      const q = query.trim().toLowerCase();

      const matches = trackedDetections.filter((t) =>
        t.label.toLowerCase().includes(q),
      );

      if (matches.length > 0) {
        const first = matches[0];
        const depthPart =
          first.zone_depth !== "far" ? `, ${first.zone_depth}` : "";
        const text = `${first.label}, found, ${first.zone_x}${depthPart}`;
        setSearchResult(text);
        speakText(text);
      } else {
        const text = `${query.trim()}, not in view`;
        setSearchResult(text);
        speakText(text);
      }

      resetSearchTimeout();
    },
    [trackedDetections, speakText, resetSearchTimeout],
  );

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

  const handleFrameActivity = useCallback((active: boolean) => {
    setSending(active);
  }, []);

  // Hotkeys
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Escape: exit search, close help, exit blind mode
      if (e.code === "Escape") {
        if (searchMode) {
          exitSearch();
          return;
        }
        if (showHelp) {
          setShowHelp(false);
          return;
        }
        return;
      }

      // If typing in the search input, let it handle its own keys
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
      if (e.code === "KeyM" && !e.repeat) {
        updateSettings({ muted: !settings.muted });
      }
      if (e.code === "KeyB" && !e.repeat) {
        setBlindMode((prev) => !prev);
      }
      if (e.code === "KeyF" && !e.repeat && !searchMode) {
        e.preventDefault();
        setSearchMode(true);
        setSearchQuery("");
        setSearchResult(null);
        resetSearchTimeout();
      }
      if ((e.key === "?" || e.code === "Slash") && e.shiftKey && !e.repeat) {
        setShowHelp((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [
    describeNow,
    settings.muted,
    updateSettings,
    searchMode,
    exitSearch,
    resetSearchTimeout,
    showHelp,
  ]);

  // Focus search input when search mode activates
  useEffect(() => {
    if (searchMode) {
      requestAnimationFrame(() => searchInputRef.current?.focus());
    }
  }, [searchMode]);

  // Cleanup search timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, []);

  // Visibility change: pause when tab hidden
  useEffect(() => {
    const handler = () => {
      setPaused(document.hidden);
    };
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, []);

  // Blind mode: screen off, narration continues
  if (blindMode) {
    return (
      <main className="w-screen h-screen bg-black flex items-center justify-center cursor-none">
        {/* Hidden webcam — keeps capturing and narrating */}
        <div className="hidden">
          <WebcamCapture
            onDetections={handleDetections}
            onConnectionChange={handleConnectionChange}
            onFrameActivity={handleFrameActivity}
            paused={paused}
          />
        </div>
        <div className="text-center">
          <div className="text-zinc-600 text-sm">
            Screen off — narration active
          </div>
          <div className="text-zinc-700 text-xs mt-2">Press B to restore</div>
        </div>
      </main>
    );
  }

  return (
    <main className="w-screen h-screen bg-zinc-950 overflow-hidden flex flex-col">
      {/* Top bar */}
      <header className="flex items-center justify-between px-4 py-2 bg-zinc-900/60 border-b border-zinc-800/50 shrink-0">
        <div className="flex items-center gap-3">
          <SettingsPanel />
          <h1 className="text-lg font-semibold text-zinc-100 tracking-tight">
            AccessLens
          </h1>
          <span className="text-[10px] font-medium uppercase tracking-wider bg-green-900/40 text-green-400 border border-green-800/50 px-2 py-0.5 rounded-full">
            on-device
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Help toggle */}
          <button
            onClick={() => setShowHelp((prev) => !prev)}
            className="text-zinc-500 hover:text-zinc-300 text-sm font-mono transition-colors"
            aria-label="Show keyboard shortcuts"
          >
            ?
          </button>
          <StatsHUD
            connected={connected}
            inferMs={inferMs}
            detectionCount={detections.length}
            sending={sending}
          />
        </div>
      </header>

      {/* Status banners */}
      {!connected && (
        <div className="bg-red-900/90 text-red-100 text-center py-1.5 text-xs shrink-0">
          Backend not reachable. Run{" "}
          <code className="bg-red-800 px-1 rounded">make run-backend</code>.
          Retrying...
        </div>
      )}
      {settings.muted && (
        <div className="bg-zinc-800/90 text-zinc-400 text-center py-1.5 text-xs shrink-0">
          Muted (press M to unmute)
        </div>
      )}
      {paused && (
        <div className="bg-yellow-900/90 text-yellow-100 text-center py-1.5 text-xs shrink-0">
          Paused: tab not focused
        </div>
      )}

      {/* Main content: webcam left, narration log right */}
      <div className="flex flex-1 min-h-0">
        {/* Webcam panel */}
        <div className="flex-1 relative flex items-center justify-center bg-black min-w-0">
          <div className="relative w-full max-w-[720px] aspect-4/3">
            <WebcamCapture
              onDetections={handleDetections}
              onConnectionChange={handleConnectionChange}
              onFrameActivity={handleFrameActivity}
              paused={paused}
            />
            <DetectionOverlay
              detections={detections}
              width={640}
              height={480}
              highlightLabel={searchMode ? searchQuery : null}
            />
          </div>

          {/* Voice search overlay */}
          {searchMode && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20">
              <div className="bg-zinc-900/95 border border-yellow-500/50 rounded-lg px-4 py-3 shadow-xl flex flex-col items-center gap-2 min-w-[280px]">
                <div className="text-xs text-yellow-400 font-medium uppercase tracking-wider">
                  Find Object
                </div>
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setSearchResult(null);
                    resetSearchTimeout();
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      executeSearch(searchQuery);
                    }
                    if (e.key === "Escape") {
                      exitSearch();
                    }
                  }}
                  placeholder="Type a class name (e.g. phone, cup)..."
                  className="w-full bg-zinc-800 text-zinc-100 text-sm px-3 py-2 rounded border border-zinc-700 focus:outline-none focus:border-yellow-500/50 placeholder:text-zinc-500"
                  autoComplete="off"
                />
                {searchResult && (
                  <div className="text-sm font-mono text-yellow-300">
                    {searchResult}
                  </div>
                )}
                <div className="text-[10px] text-zinc-500">
                  Enter to search, Esc to close
                </div>
              </div>
            </div>
          )}

          {/* Keyboard shortcuts overlay */}
          {showHelp && (
            <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-30">
              <div className="bg-zinc-900 border border-zinc-700/50 rounded-xl px-6 py-5 shadow-2xl min-w-[300px]">
                <div className="text-xs text-zinc-400 font-semibold uppercase tracking-wider mb-3">
                  Keyboard Shortcuts
                </div>
                <div className="space-y-2">
                  {SHORTCUTS.map((s) => (
                    <div
                      key={s.key}
                      className="flex items-center justify-between gap-6"
                    >
                      <span className="text-sm text-zinc-300">{s.action}</span>
                      <kbd className="text-xs font-mono bg-zinc-800 text-zinc-400 border border-zinc-700 px-2 py-0.5 rounded min-w-[40px] text-center">
                        {s.key}
                      </kbd>
                    </div>
                  ))}
                </div>
                <div className="text-[10px] text-zinc-600 mt-4 text-center">
                  Press ? or Esc to close
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right sidebar: narration log + buttons */}
        <aside className="w-80 bg-zinc-900/40 border-l border-zinc-800/50 flex flex-col shrink-0">
          <div className="flex-1 p-4 min-h-0 overflow-hidden">
            <NarrationLog entries={logEntries} />
          </div>

          {/* Buttons */}
          <div className="p-4 pt-0 space-y-2">
            <button
              onClick={describeNow}
              className="w-full bg-zinc-100 text-zinc-900 py-2.5 rounded-lg font-semibold text-sm hover:bg-white transition-colors"
              aria-label="Describe scene now"
            >
              Describe Now
              <span className="text-zinc-500 ml-1.5 font-normal text-xs">
                Space
              </span>
            </button>
            <button
              onClick={() => {
                if (searchMode) {
                  exitSearch();
                } else {
                  setSearchMode(true);
                  setSearchQuery("");
                  setSearchResult(null);
                  resetSearchTimeout();
                }
              }}
              className={`w-full py-2 rounded-lg text-sm font-medium transition-colors ${
                searchMode
                  ? "bg-yellow-500/20 text-yellow-300 border border-yellow-500/30"
                  : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700 border border-zinc-700/50"
              }`}
            >
              {searchMode ? "Exit Search" : "Find Object"}
              <span className="text-zinc-500 ml-1.5 font-normal text-xs">
                F
              </span>
            </button>
            <button
              onClick={() => setBlindMode(true)}
              className="w-full py-2 rounded-lg text-sm font-medium bg-zinc-800 text-zinc-300 hover:bg-zinc-700 border border-zinc-700/50 transition-colors"
            >
              Blind Mode
              <span className="text-zinc-500 ml-1.5 font-normal text-xs">
                B
              </span>
            </button>
          </div>
        </aside>
      </div>
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
