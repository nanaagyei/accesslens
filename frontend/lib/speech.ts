"use client";

/** Preferred voices in order of preference. */
const PREFERRED_VOICES = [
  "Samantha",
  "Ava",
  "Google US English",
];

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

/** Speak text with the best available voice. */
export function speak(text: string, rate: number = 1.3): void {
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  const voice = getBestVoice();
  if (voice) u.voice = voice;
  u.rate = rate;
  u.lang = "en-US";
  speechSynthesis.speak(u);
}
