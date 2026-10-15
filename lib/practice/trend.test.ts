import { describe, expect, it } from "vitest";
import { weeklyAccuracy } from "@/lib/practice/trend";

describe("weekly accuracy", () => {
  it("buckets the last four weeks ending today", () => {
    const weeks = weeklyAccuracy(
      [
        { date: "2026-09-17", correct: true },
        { date: "2026-09-23", correct: false },
        { date: "2026-10-01", correct: true },
        { date: "2026-10-14", correct: true },
        { date: "2026-10-14", correct: false },
        { date: "2026-09-16", correct: true },
      ],
      "2026-10-14",
    );
    expect(weeks.map((week) => week.label)).toEqual(["Sep 17", "Sep 24", "Oct 1", "Oct 8"]);
    expect(weeks.map((week) => [week.attempted, week.correct])).toEqual([
      [2, 1],
      [0, 0],
      [1, 1],
      [2, 1],
    ]);
  });
});
