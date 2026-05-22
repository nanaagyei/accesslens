const NUMBER_WORDS: Record<number, string> = {
  2: "two",
  3: "three",
  4: "four",
  5: "five",
};

function numberWord(n: number): string {
  return NUMBER_WORDS[n] ?? String(n);
}

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
 */
export function formatUtterance(group: UtteranceGroup): string {
  const parts: string[] = [];

  // Label with optional count
  if (group.count > 1) {
    parts.push(`${numberWord(group.count)} ${group.label}s`);
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

  return parts.join(", ");
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
