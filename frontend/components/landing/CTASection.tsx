"use client";

import { useRef, useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { unlockTTS } from "@/lib/speech";

gsap.registerPlugin(ScrollTrigger);

interface CTASectionProps {
  onStart: () => void;
}

export default function CTASection({ onStart }: CTASectionProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (prefersReduced) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        buttonRef.current,
        { opacity: 0, scale: 0.95 },
        {
          opacity: 1,
          scale: 1,
          duration: 0.6,
          ease: "power2.out",
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top 70%",
          },
        },
      );
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  const handleStart = async () => {
    unlockTTS();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 },
      });
      stream.getTracks().forEach((t) => t.stop());
      onStart();
    } catch {
      alert(
        "Camera permission is required.\n\n" +
          "Open System Settings > Privacy & Security > Camera " +
          "and allow your browser.",
      );
    }
  };

  return (
    <section
      ref={sectionRef}
      className="fade-section py-32 sm:py-48 px-8 border-t border-zinc-900"
    >
      <div className="max-w-3xl mx-auto text-center">
        <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-6">
          Experience it yourself
        </h2>
        <p className="text-zinc-500 text-lg mb-12 max-w-xl mx-auto">
          Point your camera at the room. AccessLens will narrate what it sees
          in real-time. No setup beyond granting camera access.
        </p>

        <button
          ref={buttonRef}
          onClick={handleStart}
          className="opacity-0 group relative inline-flex items-center gap-3 px-10 py-5 bg-zinc-100 text-zinc-950 rounded-lg text-lg font-semibold hover:bg-white transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-100 focus:ring-offset-2 focus:ring-offset-zinc-950"
        >
          <span>Launch AccessLens</span>
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            className="transition-transform group-hover:translate-x-1"
          >
            <path
              d="M4 10h12M12 6l4 4-4 4"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4 text-xs text-zinc-600 font-mono">
          <span>Requires camera permission</span>
          <span className="hidden sm:inline text-zinc-800">|</span>
          <span>
            Backend: <code className="text-zinc-500">make run-backend</code>
          </span>
          <span className="hidden sm:inline text-zinc-800">|</span>
          <span>macOS + Apple Silicon</span>
        </div>

        {/* Keyboard shortcuts hint */}
        <div className="mt-16 border border-zinc-800 rounded-lg p-6 text-left max-w-md mx-auto">
          <div className="text-xs font-mono text-zinc-600 uppercase tracking-wider mb-4">
            Keyboard shortcuts
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {[
              ["Space", "Describe scene"],
              ["F", "Find object"],
              ["M", "Mute / unmute"],
              ["B", "Blind mode"],
              ["?", "Show all shortcuts"],
            ].map(([key, desc]) => (
              <div key={key} className="flex items-center gap-3">
                <kbd className="px-2 py-0.5 bg-zinc-800 border border-zinc-700 rounded text-xs font-mono text-zinc-300">
                  {key}
                </kbd>
                <span className="text-zinc-500">{desc}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-32 text-center text-xs text-zinc-700 font-mono">
        Built for the MLX Accessibility Hackathon 2026
      </div>
    </section>
  );
}
