const NUMBER_WORDS: Record<number, string> = {
  2: "two",
  3: "three",
  4: "four",
  5: "five",
  6: "six",
  7: "seven",
  8: "eight",
  9: "nine",
  10: "ten",
};

function numberWord(n: number): string {
  return NUMBER_WORDS[n] ?? String(n);
}

/** Irregular plurals for COCO class names. */
const IRREGULAR_PLURALS: Record<string, string> = {
  person: "people",
  knife: "knives",
  mouse: "mice",
};

function pluralize(label: string, count: number): string {
  if (count <= 1) return label;
  return IRREGULAR_PLURALS[label] ?? `${label}s`;
}

export type UtteranceState = "NEW" | "MOVED" | "STABLE";

export interface UtteranceGroup {
  label: string;
  zone_x: "left" | "center" | "right";
  zone_depth: "near" | "mid" | "far";
  count: number;
  area_frac: number;
}

/**
 * Format a single narration cue with natural pauses.
 *
 * Pause pattern:
 *   "person ,,, center, near"
 *   - Long pause (,,,) after the object label
 *   - Short pause (,) between position parts
 *
 * Rules:
 * - Count > 1: "two people ,,, center"
 * - Drop zone_depth if "far"
 * - Drop zone_x if area_frac > 0.5 (object spans most of frame)
 * - Append "!" for NEW objects, "." for MOVED (TTS inflection)
 */
export function formatUtterance(
  group: UtteranceGroup,
  state?: UtteranceState,
): string {
  // Label with optional count and proper pluralization
  let label: string;
  if (group.count > 1) {
    label = `${numberWord(group.count)} ${pluralize(group.label, group.count)}`;
  } else {
    label = group.label;
  }

  // Position parts (zone_x + depth) joined with short comma pauses
  const posParts: string[] = [];

  // Zone X (skip if object spans > 50% of frame)
  if (group.area_frac <= 0.5) {
    posParts.push(group.zone_x);
  }

  // Depth (skip if "far")
  if (group.zone_depth !== "far") {
    posParts.push(group.zone_depth);
  }

  // Build final text:
  // Long pause (,,,) after label, short pause (,) between position parts.
  // Triple comma creates ~500ms pause in Web Speech API voices.
  let text: string;
  if (posParts.length > 0) {
    text = `${label},,, ${posParts.join(", ")}`;
  } else {
    text = label;
  }

  // Tone markers for TTS inflection
  if (state === "NEW") text += "!";
  else if (state === "MOVED") text += ".";

  return text;
}

/**
 * Format a full "describe now" summary.
 * Pattern: "Two objects in view,,, person,,, center, near. chair,,, left."
 * - Long pause after "in view"
 * - Each item uses the standard formatUtterance rhythm
 * - Period between items creates a sentence-boundary pause
 */
export function formatDescribeNow(groups: UtteranceGroup[]): string {
  if (groups.length === 0) return "Nothing in view.";

  const totalCount = groups.reduce((sum, g) => sum + g.count, 0);
  const countWord =
    totalCount === 1
      ? "One object"
      : `${numberWord(totalCount).charAt(0).toUpperCase() + numberWord(totalCount).slice(1)} objects`;

  const items = groups.map((g) => formatUtterance(g));
  return `${countWord} in view.,,, ${items.join(". ")}.`;
}
