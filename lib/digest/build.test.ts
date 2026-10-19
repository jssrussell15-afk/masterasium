import { describe, expect, it } from "vitest";
import {
  buildDigestSummary,
  freshKeptLine,
  freshTopicsForWeek,
  renderDigestText,
  topicFromTitle,
  torontoDate,
  torontoDayStart,
} from "@/lib/digest/build";
import { buildSundayDigest, renderSundayDigestText } from "@/lib/digest/sunday";
import { buildParentProgress } from "@/lib/lesson/parent";

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

  it("keeps the placement lines ready for a later note", () => {
    const summary = buildDigestSummary({
      childFirstName: "Sam",
      grade: 2,
      date: "2026-10-19",
      attempted: 0,
      correct: 0,
      focusSkillId: "g2-add-sub",
      focusSkillTitle: "Addition and subtraction within 100",
      placementNote:
        "We started Sam on Addition and subtraction within 100 at grade 2, the strongest place to build from.",
      readyNote: "Sam looks ready for more in Measurement, so we'll mix some in.",
    });
    const text = renderDigestText(summary);
    expect(text).toContain("We started Sam on Addition and subtraction within 100 at grade 2");
    expect(text).toContain("Sam looks ready for more in Measurement, so we'll mix some in.");
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

  it("writes one quiet fresh line and keeps it off the daily draft", () => {
    expect(topicFromTitle("Fractions as equal parts")).toBe("fractions");
    expect(topicFromTitle("Time to the minute")).toBe("time");
    expect(freshKeptLine(["fractions"])).toBe("Kept fractions fresh.");
    expect(freshKeptLine(["fractions", "time"])).toBe("Kept fractions and time fresh.");
    expect(freshKeptLine(["fractions", "time", "place"])).toBe("Kept fractions and time fresh.");
    expect(freshKeptLine([])).toBeNull();
    expect(freshKeptLine(["fractions"])).not.toMatch(/\d|review|struggled/i);

    const topics = freshTopicsForWeek(
      [
        { title: "Fractions as equal parts", freshOn: "2026-10-16" },
        { title: "Time to the minute", freshOn: "2026-10-18" },
        { title: "Place value to 1,000", freshOn: "2026-10-01" },
        { title: "Multiplication facts to 10×10", freshOn: null },
      ],
      "2026-10-12",
      "2026-10-18",
    );
    expect(topics).toEqual(["fractions", "time"]);
    expect(freshTopicsForWeek([{ title: "Fractions as equal parts", freshOn: null }], "2026-10-12", "2026-10-18")).toEqual(
      [],
    );

    const summary = buildDigestSummary({
      childFirstName: "Maya",
      grade: 3,
      date: "2026-10-18",
      attempted: 4,
      correct: 4,
      focusSkillId: "g3-fractions",
      focusSkillTitle: "Fractions as equal parts",
    });
    expect(renderDigestText(summary)).not.toContain("Kept ");

    const progress = buildParentProgress({
      today: "2026-10-18",
      lessons: [],
      reviews: [],
      attempts: [],
      solved: null,
      repaired: null,
    });
    const text = renderSundayDigestText(buildSundayDigest("Maya", progress, freshKeptLine(topics)));
    expect(text).toContain("Kept fractions and time fresh.");
    expect(text.match(/Kept /g)).toHaveLength(1);
    expect(text).toContain("Coming up next");
    expect(text).not.toMatch(/struggled|review question/i);
    expect(renderSundayDigestText(buildSundayDigest("Maya", progress))).not.toContain("Kept ");
  });
});
