import { describe, it, expect } from "vitest";
import { formatUtterance, formatDescribeNow, type UtteranceGroup } from "../format";

function makeGroup(overrides: Partial<UtteranceGroup> = {}): UtteranceGroup {
  return {
    label: "person",
    zone_x: "center",
    zone_depth: "near",
    count: 1,
    area_frac: 0.08,
    ...overrides,
  };
}

describe("formatUtterance", () => {
  it("formats a single object with zone and depth", () => {
    expect(formatUtterance(makeGroup())).toBe("person, center, near");
  });

  it("appends ! for NEW state", () => {
    expect(formatUtterance(makeGroup(), "NEW")).toBe("person, center, near!");
  });

  it("appends . for MOVED state", () => {
    expect(formatUtterance(makeGroup(), "MOVED")).toBe("person, center, near.");
  });

  it("no marker for STABLE state", () => {
    expect(formatUtterance(makeGroup(), "STABLE")).toBe("person, center, near");
  });

  it("drops depth when far", () => {
    expect(formatUtterance(makeGroup({ zone_depth: "far" }))).toBe(
      "person, center",
    );
  });

  it("drops zone_x when area > 0.5", () => {
    expect(formatUtterance(makeGroup({ area_frac: 0.6 }))).toBe(
      "person, near",
    );
  });

  // Pluralization
  it("pluralizes person to people", () => {
    expect(formatUtterance(makeGroup({ count: 2 }))).toBe(
      "two people, center, near",
    );
  });

  it("pluralizes knife to knives", () => {
    expect(formatUtterance(makeGroup({ label: "knife", count: 3 }))).toBe(
      "three knives, center, near",
    );
  });

  it("pluralizes mouse to mice", () => {
    expect(formatUtterance(makeGroup({ label: "mouse", count: 2 }))).toBe(
      "two mice, center, near",
    );
  });

  it("pluralizes regular nouns with s", () => {
    expect(formatUtterance(makeGroup({ label: "chair", count: 4 }))).toBe(
      "four chairs, center, near",
    );
  });

  // Number words up to 10
  it("uses word for count 6", () => {
    expect(formatUtterance(makeGroup({ label: "chair", count: 6 }))).toBe(
      "six chairs, center, near",
    );
  });

  it("uses word for count 10", () => {
    expect(formatUtterance(makeGroup({ label: "chair", count: 10 }))).toBe(
      "ten chairs, center, near",
    );
  });

  it("uses digit string for count > 10", () => {
    expect(formatUtterance(makeGroup({ label: "chair", count: 12 }))).toBe(
      "12 chairs, center, near",
    );
  });
});

describe("formatDescribeNow", () => {
  it("returns nothing in view for empty scene", () => {
    expect(formatDescribeNow([])).toBe("Nothing in view.");
  });

  it("formats a single object summary", () => {
    const result = formatDescribeNow([makeGroup()]);
    expect(result).toBe("One object in view. person, center, near.");
  });

  it("formats multiple objects", () => {
    const groups = [
      makeGroup({ label: "person", zone_x: "center" }),
      makeGroup({ label: "chair", zone_x: "left", zone_depth: "far" }),
    ];
    const result = formatDescribeNow(groups);
    expect(result).toBe("Two objects in view. person, center, near. chair, left.");
  });

  it("includes count-merged groups correctly", () => {
    const groups = [
      makeGroup({ label: "person", count: 2, zone_x: "center" }),
      makeGroup({ label: "laptop", zone_x: "right" }),
    ];
    const result = formatDescribeNow(groups);
    expect(result).toBe(
      "Three objects in view. two people, center, near. laptop, right, near.",
    );
  });
});
