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
 * Format a single narration cue.
 *
 * Rules from 02_AUDIO_UX.md:
 * - Count > 1: "two people, center"
 * - Drop zone_depth if "far"
 * - Drop zone_x if area_frac > 0.5 (object spans most of frame)
 * - Append "!" for NEW objects, "." for MOVED (TTS inflection)
 */
export function formatUtterance(
  group: UtteranceGroup,
  state?: UtteranceState,
): string {
  const parts: string[] = [];

  // Label with optional count and proper pluralization
  if (group.count > 1) {
    parts.push(
      `${numberWord(group.count)} ${pluralize(group.label, group.count)}`,
    );
  } else {
    parts.push(group.label);
  }

  // Zone X (skip if object spans > 50% of frame)
  if (group.area_frac <= 0.5) {
    parts.push(group.zone_x);
  }

  // Depth (skip if "far")
  if (group.zone_depth !== "far") {
    parts.push(group.zone_depth);
  }

  let text = parts.join(", ");

  // Tone markers for TTS inflection
  if (state === "NEW") text += "!";
  else if (state === "MOVED") text += ".";

  return text;
}

/**
 * Format a full "describe now" summary.
 * Example: "Three objects in view. Person, center, near. Chair, left."
 */
export function formatDescribeNow(groups: UtteranceGroup[]): string {
  if (groups.length === 0) return "Nothing in view.";

  const totalCount = groups.reduce((sum, g) => sum + g.count, 0);
  const countWord =
    totalCount === 1
      ? "One object"
      : `${numberWord(totalCount).charAt(0).toUpperCase() + numberWord(totalCount).slice(1)} objects`;

  const items = groups.map((g) => formatUtterance(g));
  return `${countWord} in view. ${items.join(". ")}.`;
}
