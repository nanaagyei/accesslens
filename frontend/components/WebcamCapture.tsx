"use client";

import { useEffect, useRef, useCallback } from "react";
import { WSClient } from "@/lib/ws";
import { Detection, DetectionResponse } from "@/lib/types";

interface WebcamCaptureProps {
  onDetections: (detections: Detection[], inferMs: number) => void;
  onConnectionChange: (connected: boolean) => void;
  paused?: boolean;
}

export default function WebcamCapture({
  onDetections,
  onConnectionChange,
  paused = false,
}: WebcamCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wsRef = useRef<WSClient | null>(null);
  const frameIdRef = useRef(0);
  const inFlightRef = useRef(false);
  const inFlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const captureIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pausedRef = useRef(paused);
  pausedRef.current = paused;

  const handleMessage = useCallback(
    (response: DetectionResponse) => {
      inFlightRef.current = false;
      if (inFlightTimerRef.current) {
        clearTimeout(inFlightTimerRef.current);
        inFlightTimerRef.current = null;
      }
      onDetections(response.detections, response.infer_ms);
    },
    [onDetections],
  );

  const captureAndSend = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ws = wsRef.current;
    if (!video || !canvas || !ws) return;

    // Skip if paused (tab hidden) or in-flight
    if (pausedRef.current || inFlightRef.current) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = 640;
    canvas.height = 480;
    ctx.drawImage(video, 0, 0, 640, 480);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const id = frameIdRef.current++;
        inFlightRef.current = true;

        // Timeout: release in-flight guard after 300ms
        inFlightTimerRef.current = setTimeout(() => {
          inFlightRef.current = false;
        }, 300);

        ws.sendFrame(id, blob, 640, 480);
      },
      "image/jpeg",
      0.7,
    );
  }, []);

  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480 },
        });
        if (!mounted) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }

        // Connect WebSocket
        const ws = new WSClient(
          "ws://127.0.0.1:8000/ws",
          handleMessage,
          onConnectionChange,
        );
        wsRef.current = ws;
        ws.connect();

        // Start capture loop at ~10 FPS
        captureIntervalRef.current = setInterval(captureAndSend, 100);
      } catch (err) {
        console.error("Failed to init webcam:", err);
      }
    }

    init();

    return () => {
      mounted = false;
      if (captureIntervalRef.current) clearInterval(captureIntervalRef.current);
      if (inFlightTimerRef.current) clearTimeout(inFlightTimerRef.current);
      if (wsRef.current) wsRef.current.close();
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [handleMessage, onConnectionChange, captureAndSend]);

  return (
    <>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-contain"
      />
      {/* Offscreen canvas for JPEG encoding */}
      <canvas ref={canvasRef} className="hidden" />
    </>
  );
}
