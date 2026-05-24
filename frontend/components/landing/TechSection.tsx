"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

function ArchNode({
  label,
  sublabel,
  className = "",
}: {
  label: string;
  sublabel?: string;
  className?: string;
}) {
  return (
    <div
      className={`arch-node border border-zinc-700 rounded-lg px-5 py-4 bg-zinc-900/50 ${className}`}
    >
      <div className="text-sm font-semibold text-zinc-200">{label}</div>
      {sublabel && (
        <div className="text-xs font-mono text-zinc-500 mt-1">{sublabel}</div>
      )}
    </div>
  );
}

export default function TechSection() {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (prefersReduced) return;

    const ctx = gsap.context(() => {
      const nodes = sectionRef.current?.querySelectorAll(".arch-node");
      if (nodes) {
        gsap.fromTo(
          nodes,
          { opacity: 0, scale: 0.9 },
          {
            opacity: 1,
            scale: 1,
            duration: 0.5,
            stagger: 0.1,
            ease: "power2.out",
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
        <div className="mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
            Built for privacy. Optimized for speed.
          </h2>
          <p className="mt-4 text-zinc-500 text-lg max-w-2xl">
            Every component runs locally. The architecture is designed for
            sub-130ms latency from camera frame to spoken word.
          </p>
        </div>

        {/* Architecture diagram */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-center">
          <ArchNode label="Camera" sublabel="640x480 @ 10fps" />
          <div className="hidden sm:flex items-center justify-center">
            <svg width="40" height="12" viewBox="0 0 40 12" className="text-zinc-600">
              <path
                d="M0 6h32M32 6l-4-4M32 6l-4 4"
                stroke="currentColor"
                strokeWidth="1.5"
                fill="none"
              />
            </svg>
          </div>
          <ArchNode label="YOLO26 MLX" sublabel="Apple Silicon GPU" />
          <div className="hidden sm:flex items-center justify-center">
            <svg width="40" height="12" viewBox="0 0 40 12" className="text-zinc-600">
              <path
                d="M0 6h32M32 6l-4-4M32 6l-4 4"
                stroke="currentColor"
                strokeWidth="1.5"
                fill="none"
              />
            </svg>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-center mt-4">
          <ArchNode label="Spatial Zones" sublabel="left/center/right + near/mid/far" />
          <div className="hidden sm:flex items-center justify-center">
            <svg width="40" height="12" viewBox="0 0 40 12" className="text-zinc-600">
              <path
                d="M0 6h32M32 6l-4-4M32 6l-4 4"
                stroke="currentColor"
                strokeWidth="1.5"
                fill="none"
              />
            </svg>
          </div>
          <ArchNode label="Priority Narrator" sublabel="anti-spam + interrupt rules" />
          <div className="hidden sm:flex items-center justify-center">
            <svg width="40" height="12" viewBox="0 0 40 12" className="text-zinc-600">
              <path
                d="M0 6h32M32 6l-4-4M32 6l-4 4"
                stroke="currentColor"
                strokeWidth="1.5"
                fill="none"
              />
            </svg>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-center mt-4">
          <ArchNode label="Web Speech API" sublabel="native TTS, no network" />
        </div>

        {/* Privacy badges */}
        <div className="mt-16 flex flex-wrap gap-4">
          {[
            "Zero cloud dependencies",
            "No data exfiltration",
            "Works offline",
            "Apple Silicon optimized",
            "Open source",
          ].map((badge) => (
            <span
              key={badge}
              className="arch-node px-4 py-2 border border-zinc-800 rounded-full text-xs font-mono text-zinc-400 tracking-wide"
            >
              {badge}
            </span>
          ))}
        </div>

        {/* Tech stack */}
        <div className="mt-16 grid grid-cols-2 sm:grid-cols-4 gap-6">
          {[
            { name: "MLX", role: "GPU inference" },
            { name: "YOLO26n", role: "Object detection" },
            { name: "FastAPI", role: "WebSocket server" },
            { name: "Next.js", role: "Frontend runtime" },
            { name: "Web Speech", role: "Text-to-speech" },
            { name: "WebSocket", role: "Frame transport" },
            { name: "Python 3.13", role: "Backend" },
            { name: "TypeScript", role: "Frontend" },
          ].map((tech) => (
            <div key={tech.name} className="arch-node p-4 border border-zinc-800 rounded-lg">
              <div className="text-sm font-semibold text-zinc-200">
                {tech.name}
              </div>
              <div className="text-xs text-zinc-600 mt-1">{tech.role}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
