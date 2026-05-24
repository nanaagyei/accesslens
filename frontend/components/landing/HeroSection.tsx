"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import dynamic from "next/dynamic";

const WebGLBackground = dynamic(() => import("./WebGLBackground"), {
  ssr: false,
});

export default function HeroSection() {
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const subtitleRef = useRef<HTMLParagraphElement>(null);
  const badgeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (prefersReduced) return;

    const tl = gsap.timeline({ delay: 0.3 });

    tl.fromTo(
      badgeRef.current,
      { opacity: 0, y: -20 },
      { opacity: 1, y: 0, duration: 0.6, ease: "power2.out" },
    )
      .fromTo(
        headlineRef.current,
        { opacity: 0, y: 40 },
        { opacity: 1, y: 0, duration: 0.8, ease: "power3.out" },
        "-=0.2",
      )
      .fromTo(
        subtitleRef.current,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.6, ease: "power2.out" },
        "-=0.3",
      );

    return () => {
      tl.kill();
    };
  }, []);

  return (
    <section className="relative h-screen flex items-center justify-center overflow-hidden">
      {/* WebGL Background */}
      <div className="absolute inset-0 z-0 opacity-40">
        <WebGLBackground />
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-4xl mx-auto px-8 text-center">
        <div ref={badgeRef} className="opacity-0 mb-8">
          <span className="inline-block px-4 py-1.5 border border-zinc-700 rounded-full text-xs font-mono text-zinc-400 tracking-wider uppercase">
            On-device AI for accessibility
          </span>
        </div>

        <h1
          ref={headlineRef}
          className="opacity-0 text-5xl sm:text-7xl lg:text-8xl font-bold tracking-tight leading-[0.9] mb-8"
        >
          See the world.
          <br />
          <span className="text-zinc-400">Hear it described.</span>
        </h1>

        <p
          ref={subtitleRef}
          className="opacity-0 text-lg sm:text-xl text-zinc-400 max-w-2xl mx-auto leading-relaxed"
        >
          Real-time scene narration for blind and low-vision users.
          Runs entirely on your device. No cloud. No data leaves your Mac.
        </p>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-12 left-1/2 -translate-x-1/2 z-10">
        <div className="flex flex-col items-center gap-2 text-zinc-600">
          <span className="text-xs font-mono tracking-wider uppercase">
            Scroll
          </span>
          <div className="w-px h-8 bg-zinc-700 animate-pulse" />
        </div>
      </div>
    </section>
  );
}
