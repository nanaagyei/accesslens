"use client";

import { TTS_RATE, UTTERANCE_TTL_MS } from "./constants";

/** Preferred voices in order of preference. */
const PREFERRED_VOICES = ["Samantha", "Ava", "Google US English"];

const VOICE_STORAGE_KEY = "accesslens-voice";

let cachedVoice: SpeechSynthesisVoice | null = null;

/** Find the best available English voice, preferring a previously saved choice. */
export function getBestVoice(): SpeechSynthesisVoice | null {
  if (cachedVoice) return cachedVoice;

  const voices = speechSynthesis.getVoices();
  if (voices.length === 0) return null;

  // Try saved voice first
  try {
    const savedName = localStorage.getItem(VOICE_STORAGE_KEY);
    if (savedName) {
      const saved = voices.find((v) => v.name === savedName);
      if (saved) {
        cachedVoice = saved;
        return saved;
      }
    }
  } catch {
    // localStorage unavailable
  }

  // Try preferred voices
  for (const name of PREFERRED_VOICES) {
    const match = voices.find(
      (v) => v.name.includes(name) && v.lang.startsWith("en"),
    );
    if (match) {
      cachedVoice = match;
      saveVoiceName(match.name);
      return match;
    }
  }

  // Fallback: first en-US voice
  const enUS = voices.find((v) => v.lang === "en-US");
  if (enUS) {
    cachedVoice = enUS;
    saveVoiceName(enUS.name);
    return enUS;
  }

  // Last resort: first available
  cachedVoice = voices[0];
  saveVoiceName(voices[0].name);
  return voices[0];
}

function saveVoiceName(name: string): void {
  try {
    localStorage.setItem(VOICE_STORAGE_KEY, name);
  } catch {
    // storage full or unavailable
  }
}

/** Fire a silent utterance to unlock TTS on Safari/Chrome. */
export function unlockTTS(): void {
  const u = new SpeechSynthesisUtterance("");
  u.volume = 0;
  speechSynthesis.speak(u);
}

export interface SpeakOptions {
  priority?: number;
  ttl_ms?: number;
  queuedAt?: number;
  onEnd?: () => void;
  chime?: boolean;
}

/**
 * Speech wrapper class with init, cancel, interrupt, mute, and rate control.
 * Tracks speaking state for the narrator's interrupt rules.
 */
export class Speech {
  private voice: SpeechSynthesisVoice | null = null;
  private speaking = false;
  private _startedAt = -1;
  private _estDuration = 0;
  private rate = TTS_RATE;
  private muted = false;
  private audioCtx: AudioContext | null = null;

  /** Load voices. Handles Safari async voiceschanged. */
  init(): void {
    this.voice = getBestVoice();
    if (!this.voice) {
      speechSynthesis.addEventListener(
        "voiceschanged",
        () => {
          this.voice = getBestVoice();
        },
        { once: true },
      );
    }
  }

  setRate(rate: number): void {
    this.rate = rate;
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
  }

  /** Play a short proximity alert chime using Web Audio API. */
  playChime(): void {
    if (this.muted) return;
    try {
      if (!this.audioCtx) this.audioCtx = new AudioContext();
      const ctx = this.audioCtx;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.12);
    } catch {
      // AudioContext unavailable
    }
  }

  isSpeaking(): boolean {
    return this.speaking;
  }

  get startedAt(): number {
    return this._startedAt;
  }

  get estDuration(): number {
    return this._estDuration;
  }

  /**
   * Speak text. Returns true if spoken, false if dropped.
   * Checks TTL, mute, and manages speaking state.
   */
  speak(text: string, opts: SpeakOptions = {}): boolean {
    if (this.muted) return false;

    // Check TTL: if utterance was queued too long ago, drop it
    const ttl = opts.ttl_ms ?? UTTERANCE_TTL_MS;
    if (opts.queuedAt != null) {
      const age = Date.now() - opts.queuedAt;
      if (age > ttl) return false;
    }

    const now = Date.now();

    // Play proximity chime before speech if requested
    if (opts.chime) {
      this.playChime();
    }

    // Cancel current speech
    speechSynthesis.cancel();

    const u = new SpeechSynthesisUtterance(text);
    if (this.voice) u.voice = this.voice;
    u.rate = this.rate;
    u.lang = "en-US";

    // Estimate duration: ~3 words/s at rate 1.0
    const wordCount = text.split(/\s+/).length;
    this._estDuration = wordCount / (this.rate * 3);
    this._startedAt = now;
    this.speaking = true;

    u.onend = () => {
      this.speaking = false;
      this._startedAt = -1;
      this._estDuration = 0;
      opts.onEnd?.();
    };

    u.onerror = () => {
      this.speaking = false;
      this._startedAt = -1;
      this._estDuration = 0;
    };

    speechSynthesis.speak(u);
    return true;
  }

  /** Cancel any current or pending speech. */
  cancel(): void {
    speechSynthesis.cancel();
    this.speaking = false;
    this._startedAt = -1;
    this._estDuration = 0;
  }
}
