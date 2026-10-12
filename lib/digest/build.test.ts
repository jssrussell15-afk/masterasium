import { describe, expect, it } from "vitest";
import {
  buildDigestSummary,
  renderDigestText,
  torontoDate,
  torontoDayStart,
} from "@/lib/digest/build";

describe("daily digest draft", () => {
  it("uses the Toronto calendar day", () => {
    expect(torontoDate(new Date("2026-01-15T15:00:00.000Z"))).toBe("2026-01-15");
    expect(torontoDayStart(new Date("2026-01-15T15:00:00.000Z")).toISOString()).toBe(
      "2026-01-15T05:00:00.000Z",
    );
    expect(torontoDate(new Date("2026-01-15T03:00:00.000Z"))).toBe("2026-01-14");
    expect(torontoDayStart(new Date("2026-07-15T15:00:00.000Z")).toISOString()).toBe(
      "2026-07-15T04:00:00.000Z",
    );
  });

  it("includes attempts, accuracy, and the focus skill", () => {
    const summary = buildDigestSummary({
      childFirstName: "Maya",
      grade: 1,
      date: "2026-10-12",
      attempted: 8,
      correct: 6,
      focusSkillId: "g1-add-within-10",
      focusSkillTitle: "Add within 10",
    });
    const text = renderDigestText(summary);
    expect(summary.accuracy).toBeCloseTo(0.75);
    expect(text).toContain("Questions attempted: 8");
    expect(text).toContain("Accuracy: 75%");
    expect(text).toContain("Current focus: Add within 10");
    expect(text).toContain("No email was sent.");
  });

  it("leaves accuracy blank when nothing was attempted", () => {
    const summary = buildDigestSummary({
      childFirstName: "Sam",
      grade: 5,
      date: "2026-10-12",
      attempted: 0,
      correct: 0,
      focusSkillId: "g5-place-value",
      focusSkillTitle: "Place value to 100 000",
    });
    expect(summary.accuracy).toBeNull();
    expect(renderDigestText(summary)).toContain("Accuracy: n/a");
  });
});
