"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { TTS_RATE, CONFIDENCE_THRESHOLD } from "./constants";

export interface AppSettings {
  speechRate: number;
  muted: boolean;
  confidenceThreshold: number;
}

const DEFAULTS: AppSettings = {
  speechRate: TTS_RATE,
  muted: false,
  confidenceThreshold: CONFIDENCE_THRESHOLD,
};

const STORAGE_KEY = "accesslens-settings";

function loadSettings(): AppSettings {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    // ignore corrupted storage
  }
  return DEFAULTS;
}

function saveSettings(s: AppSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    // storage full or unavailable
  }
}

interface SettingsContextValue {
  settings: AppSettings;
  updateSettings: (partial: Partial<AppSettings>) => void;
}

const SettingsContext = createContext<SettingsContextValue>({
  settings: DEFAULTS,
  updateSettings: () => {},
});

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(DEFAULTS);

  // Load from localStorage on mount
  useEffect(() => {
    setSettings(loadSettings());
  }, []);

  const updateSettings = useCallback((partial: Partial<AppSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...partial };
      saveSettings(next);
      return next;
    });
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, updateSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings(): SettingsContextValue {
  return useContext(SettingsContext);
}
