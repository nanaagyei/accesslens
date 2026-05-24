"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

interface StatProps {
  value: string;
  label: string;
}

function Stat({ value, label }: StatProps) {
  return (
    <div className="text-center">
      <div className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-zinc-100">
        {value}
      </div>
      <div className="mt-2 text-sm sm:text-base text-zinc-500 font-mono">
        {label}
      </div>
    </div>
  );
}

export default function ProblemSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (prefersReduced) return;

    const ctx = gsap.context(() => {
      const stats = statsRef.current?.querySelectorAll(".stat-item");
      if (stats) {
        gsap.fromTo(
          stats,
          { opacity: 0, y: 40 },
          {
            opacity: 1,
            y: 0,
            duration: 0.7,
            stagger: 0.15,
            ease: "power2.out",
            scrollTrigger: {
              trigger: statsRef.current,
              start: "top 75%",
            },
          },
        );
      }
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="fade-section py-32 sm:py-48 px-8"
    >
      <div className="max-w-5xl mx-auto">
        <p className="text-2xl sm:text-3xl lg:text-4xl text-zinc-300 leading-relaxed max-w-3xl">
          285 million people worldwide live with visual impairments.
          Most assistive tech requires a cloud connection, leaking private
          visual data to third-party servers.
        </p>

        <div
          ref={statsRef}
          className="mt-20 grid grid-cols-1 sm:grid-cols-3 gap-12 sm:gap-8"
        >
          <div className="stat-item">
            <Stat value="285M" label="people with visual impairments" />
          </div>
          <div className="stat-item">
            <Stat value="0 bytes" label="sent to the cloud" />
          </div>
          <div className="stat-item">
            <Stat value="<130ms" label="detection to speech" />
          </div>
        </div>

        <div className="mt-20 border-t border-zinc-800 pt-12">
          <p className="text-lg text-zinc-500 max-w-2xl">
            We built AccessLens because privacy and accessibility should never
            be a tradeoff. Everything runs on Apple Silicon. Your camera feed
            never leaves your machine.
          </p>
        </div>
      </div>
    </section>
  );
}
