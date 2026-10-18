import { describe, expect, it } from "vitest";
import {
  MOVE_AHEAD_NOTE,
  nextStrandSkills,
  openNextUp,
  strandIsSolid,
  strandSkills,
  type WeekReview,
} from "@/lib/practice/move-ahead";
import type { SkillCard } from "@/lib/practice/scheduler";

function mastered(skillId: string, correct = 8): SkillCard {
  return { skillId, attempted: 10, correct, streak: 0, fsrs: null };
}

function passed(ids: string[]): WeekReview[] {
  return ids.map((skillId) => ({ skillId, passed: true }));
}

const numberIds = strandSkills(3, "number").map((skill) => skill.id);

describe("let them move ahead", () => {
  it("keeps the next grade closed when the strand is not solid", () => {
    const cards = numberIds.map((id, index) => (index === 0 ? mastered(id) : mastered(id, 7)));
    expect(strandIsSolid({ grade: 3, strand: "number", cards, weekPassed: new Set(numberIds) })).toBe(false);
    const open = openNextUp({
      moveAhead: true,
      province: "ON",
      grade: 3,
      cards,
      weekPassed: passed(numberIds),
    });
    expect(open.map((skill) => skill.id)).not.toContain("g4-place");
    expect(open).toEqual([]);
  });

  it("opens the next grade's skills in that strand when the setting is on", () => {
    const cards = numberIds.map((id) => mastered(id));
    expect(strandIsSolid({ grade: 3, strand: "number", cards, weekPassed: new Set(numberIds) })).toBe(true);
    const expected = nextStrandSkills({ province: "ON", grade: 3, strand: "number" });
    expect(expected.map((skill) => skill.id)).toContain("g4-place");
    const open = openNextUp({
      moveAhead: true,
      province: "ON",
      grade: 3,
      cards,
      weekPassed: passed(numberIds),
    });
    expect(open.map((skill) => skill.id)).toEqual(expected.map((skill) => skill.id));
    expect(open.every((skill) => skill.note === "Next up")).toBe(true);
    expect(open.every((skill) => !skill.title.includes("Grade"))).toBe(true);
    expect(open.map((skill) => skill.id)).not.toContain("g4-mult");
  });

  it("stays closed when a week review is still open", () => {
    const cards = numberIds.map((id) => mastered(id));
    const reviews = passed(numberIds).map((review, index) => (index === 0 ? { ...review, passed: false } : review));
    expect(
      strandIsSolid({
        grade: 3,
        strand: "number",
        cards,
        weekPassed: new Set(reviews.filter((review) => review.passed).map((review) => review.skillId)),
      }),
    ).toBe(false);
    expect(
      openNextUp({ moveAhead: true, province: "ON", grade: 3, cards, weekPassed: reviews }),
    ).toEqual([]);
  });

  it("keeps the next grade closed while the setting is off", () => {
    const cards = numberIds.map((id) => mastered(id));
    const open = openNextUp({
      moveAhead: false,
      province: "ON",
      grade: 3,
      cards,
      weekPassed: passed(numberIds),
    });
    expect(open).toEqual([]);
  });

  it("keeps a mastered next-grade skill visible after the setting is turned off", () => {
    const cards = [...numberIds.map((id) => mastered(id)), mastered("g4-place")];
    const open = openNextUp({
      moveAhead: false,
      province: "ON",
      grade: 3,
      cards,
      weekPassed: passed(numberIds),
    });
    expect(open.map((skill) => skill.id)).toEqual(["g4-place"]);
    expect(open[0]?.title.includes("Grade")).toBe(false);
  });

  it("does not open skills for a province whose curriculum is not published", () => {
    const cards = numberIds.map((id) => mastered(id));
    expect(nextStrandSkills({ province: "NU", grade: 3, strand: "number" })).toEqual([]);
    const open = openNextUp({
      moveAhead: true,
      province: "NU",
      grade: 3,
      cards,
      weekPassed: passed(numberIds),
    });
    expect(open).toEqual([]);
  });

  it("uses one plain sentence for the setting", () => {
    expect(MOVE_AHEAD_NOTE).toBe("When a strand is solid, the next skills in that strand can open.");
  });
});
