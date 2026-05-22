/** Detection from the backend. */
export interface Detection {
  label: string;
  confidence: number;
  box: [number, number, number, number]; // [x1, y1, x2, y2] normalized 0-1
  zone_x: "left" | "center" | "right";
  zone_depth: "near" | "mid" | "far";
  area_frac: number;
}

/** Server response for a processed frame. */
export interface DetectionResponse {
  frame_id: number;
  detections: Detection[];
  infer_ms: number;
  server_ts: number;
}
