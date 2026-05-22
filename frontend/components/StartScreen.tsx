"use client";

import { unlockTTS } from "@/lib/speech";

interface StartScreenProps {
  onStart: () => void;
}

export default function StartScreen({ onStart }: StartScreenProps) {
  const handleStart = async () => {
    // Unlock TTS engine (requires user gesture)
    unlockTTS();

    try {
      // Request camera permission early so we know if it fails
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 },
      });
      // Stop the test stream; the capture component will request its own
      stream.getTracks().forEach((t) => t.stop());
      onStart();
    } catch (err) {
      alert(
        "Camera permission is required.\n\n" +
          "Open System Settings > Privacy & Security > Camera " +
          "and allow your browser.",
      );
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-8 p-8">
      <div className="text-center max-w-lg">
        <h1 className="text-4xl font-bold mb-4">AccessLens</h1>
        <p className="text-zinc-400 text-lg mb-2">
          On-device scene narrator for blind and low-vision users.
        </p>
        <p className="text-zinc-500 text-sm">
          No cloud. No data leaves your device. Powered by YOLO26 MLX on Apple
          Silicon.
        </p>
      </div>

      <button
        onClick={handleStart}
        className="px-8 py-4 bg-white text-zinc-950 rounded-lg text-xl font-semibold hover:bg-zinc-200 transition-colors focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-zinc-950"
      >
        Start AccessLens
      </button>

      <p className="text-zinc-600 text-xs max-w-md text-center">
        Requires camera permission and a running backend server. Start the
        backend with <code className="text-zinc-400">make run-backend</code>.
      </p>
    </div>
  );
}
