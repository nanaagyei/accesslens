"use client";

import { useEffect, useRef } from "react";
import { Detection } from "@/lib/types";

interface DetectionOverlayProps {
  detections: Detection[];
  width: number;
  height: number;
}

/** Simple hash to generate a color per class label. */
function labelColor(label: string): string {
  let hash = 0;
  for (let i = 0; i < label.length; i++) {
    hash = label.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 70%, 60%)`;
}

export default function DetectionOverlay({
  detections,
  width,
  height,
}: DetectionOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = width;
    canvas.height = height;

    ctx.clearRect(0, 0, width, height);

    for (const det of detections) {
      const [x1, y1, x2, y2] = det.box;
      const px1 = x1 * width;
      const py1 = y1 * height;
      const pw = (x2 - x1) * width;
      const ph = (y2 - y1) * height;

      const color = labelColor(det.label);

      // Draw box
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.strokeRect(px1, py1, pw, ph);

      // Draw label background
      const text = `${det.label} ${Math.round(det.confidence * 100)}%`;
      ctx.font = "14px monospace";
      const metrics = ctx.measureText(text);
      const textH = 18;

      ctx.fillStyle = color;
      ctx.fillRect(px1, py1 - textH, metrics.width + 8, textH);

      // Draw label text
      ctx.fillStyle = "#000";
      ctx.fillText(text, px1 + 4, py1 - 4);
    }
  }, [detections, width, height]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute top-0 left-0 w-full h-full pointer-events-none"
    />
  );
}
