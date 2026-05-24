"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

interface StepProps {
  number: string;
  title: string;
  description: string;
  icon: React.ReactNode;
}

function Step({ number, title, description, icon }: StepProps) {
  return (
    <div className="step-card flex flex-col items-center text-center px-6">
      <div className="w-16 h-16 rounded-full border border-zinc-700 flex items-center justify-center mb-6 text-zinc-300">
        {icon}
      </div>
      <div className="text-xs font-mono text-zinc-600 mb-2 tracking-wider uppercase">
        Step {number}
      </div>
      <h3 className="text-xl font-semibold text-zinc-100 mb-3">{title}</h3>
      <p className="text-sm text-zinc-500 leading-relaxed max-w-[280px]">
        {description}
      </p>
    </div>
  );
}

// SVG icons
function CameraIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}

function BrainIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="2" />
      <path d="M7 8h10M7 12h10M7 16h6" />
    </svg>
  );
}

function SpeakerIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
    </svg>
  );
}

export default function HowItWorksSection() {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (prefersReduced) return;

    const ctx = gsap.context(() => {
      const cards = sectionRef.current?.querySelectorAll(".step-card");
      if (cards) {
        gsap.fromTo(
          cards,
          { opacity: 0, y: 50 },
          {
            opacity: 1,
            y: 0,
            duration: 0.6,
            stagger: 0.2,
            ease: "power2.out",
            scrollTrigger: {
              trigger: sectionRef.current,
              start: "top 70%",
            },
          },
        );
      }

      // Animate the connector lines
      const connectors = sectionRef.current?.querySelectorAll(".connector");
      if (connectors) {
        gsap.fromTo(
          connectors,
          { scaleX: 0 },
          {
            scaleX: 1,
            duration: 0.8,
            stagger: 0.2,
            ease: "power2.inOut",
            scrollTrigger: {
              trigger: sectionRef.current,
              start: "top 70%",
            },
          },
        );
      }
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} className="fade-section py-32 sm:py-48 px-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-16 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
            How it works
          </h2>
          <p className="mt-4 text-zinc-500 text-lg">
            Three stages. Under 130 milliseconds. Entirely local.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-4 relative">
          {/* Connector lines (visible on sm+) */}
          <div className="hidden sm:block absolute top-8 left-[calc(16.67%+32px)] right-[calc(16.67%+32px)] h-px">
            <div className="connector h-px bg-zinc-700 w-full origin-left" />
          </div>

          <Step
            number="01"
            title="Capture"
            description="Your webcam streams frames at 10 FPS over a local WebSocket. No network calls leave your machine."
            icon={<CameraIcon />}
          />
          <Step
            number="02"
            title="Detect"
            description="YOLO26 runs on Apple Silicon via MLX. Objects are classified, positioned, and assigned spatial zones in real-time."
            icon={<BrainIcon />}
          />
          <Step
            number="03"
            title="Narrate"
            description="A priority-scored narrator decides what to speak and when. Natural pauses. No spam. Context-aware cues."
            icon={<SpeakerIcon />}
          />
        </div>

        {/* Code snippet */}
        <div className="mt-20 border border-zinc-800 rounded-lg overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 bg-zinc-900/50 border-b border-zinc-800">
            <div className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
            <div className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
            <div className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
            <span className="ml-3 text-xs font-mono text-zinc-600">
              narration output
            </span>
          </div>
          <div className="p-6 font-mono text-sm leading-relaxed">
            <div className="text-zinc-400">
              <span className="text-zinc-600">{">"}</span>{" "}
              person <span className="text-zinc-600">(pause)</span> center, near
              <span className="text-zinc-600 ml-2">// new object detected</span>
            </div>
            <div className="text-zinc-400 mt-1">
              <span className="text-zinc-600">{">"}</span>{" "}
              two people <span className="text-zinc-600">(pause)</span> center
              <span className="text-zinc-600 ml-2">// count merged</span>
            </div>
            <div className="text-zinc-400 mt-1">
              <span className="text-zinc-600">{">"}</span>{" "}
              laptop <span className="text-zinc-600">(pause)</span> left, near
              <span className="text-zinc-600 ml-2">// new object, different zone</span>
            </div>
            <div className="text-zinc-400 mt-1">
              <span className="text-zinc-600">{">"}</span>{" "}
              <span className="text-zinc-600 italic">... silence (scene stable) ...</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
