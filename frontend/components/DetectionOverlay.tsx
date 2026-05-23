"use client";

import { useEffect, useRef } from "react";
import { Detection } from "@/lib/types";

interface DetectionOverlayProps {
  detections: Detection[];
  width: number;
  height: number;
  highlightLabel?: string | null;
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

const CORNER_RADIUS = 6;

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.arcTo(x + w, y, x + w, y + radius, radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.arcTo(x + w, y + h, x + w - radius, y + h, radius);
  ctx.lineTo(x + radius, y + h);
  ctx.arcTo(x, y + h, x, y + h - radius, radius);
  ctx.lineTo(x, y + radius);
  ctx.arcTo(x, y, x + radius, y, radius);
  ctx.closePath();
}

export default function DetectionOverlay({
  detections,
  width,
  height,
  highlightLabel,
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

      const isHighlighted =
        highlightLabel != null &&
        det.label.toLowerCase().includes(highlightLabel.toLowerCase());
      const color = labelColor(det.label);

      // Draw rounded box (thick + bright if highlighted)
      ctx.strokeStyle = isHighlighted ? "#facc15" : color;
      ctx.lineWidth = isHighlighted ? 4 : 2;
      roundedRect(ctx, px1, py1, pw, ph, CORNER_RADIUS);
      ctx.stroke();

      // Draw label chip (class name only, no confidence)
      const text = det.label;
      ctx.font = "12px system-ui, sans-serif";
      const metrics = ctx.measureText(text);
      const chipH = 20;
      const chipW = metrics.width + 12;
      const chipX = px1;
      const chipY = py1 - chipH - 2;

      // Chip background with rounded corners
      ctx.fillStyle = isHighlighted ? "#facc15" : color;
      roundedRect(ctx, chipX, chipY, chipW, chipH, 4);
      ctx.fill();

      // Chip text
      ctx.fillStyle = "#000";
      ctx.fillText(text, chipX + 6, chipY + 14);
    }
  }, [detections, width, height, highlightLabel]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute top-0 left-0 w-full h-full pointer-events-none"
    />
  );
}
