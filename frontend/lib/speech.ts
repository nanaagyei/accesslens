"use client";

import { TTS_RATE, UTTERANCE_TTL_MS } from "./constants";

/** Preferred voices in order of preference. */
const PREFERRED_VOICES = ["Samantha", "Ava", "Google US English"];

let cachedVoice: SpeechSynthesisVoice | null = null;

/** Find the best available English voice. */
export function getBestVoice(): SpeechSynthesisVoice | null {
  if (cachedVoice) return cachedVoice;

  const voices = speechSynthesis.getVoices();
  if (voices.length === 0) return null;

  // Try preferred voices
  for (const name of PREFERRED_VOICES) {
    const match = voices.find(
      (v) => v.name.includes(name) && v.lang.startsWith("en"),
    );
    if (match) {
      cachedVoice = match;
      return match;
    }
  }

  // Fallback: first en-US voice
  const enUS = voices.find((v) => v.lang === "en-US");
  if (enUS) {
    cachedVoice = enUS;
    return enUS;
  }

  // Last resort: first available
  cachedVoice = voices[0];
  return voices[0];
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
