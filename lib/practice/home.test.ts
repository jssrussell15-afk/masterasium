import { describe, expect, it } from "vitest";
import { studentHome } from "@/lib/practice/home";
import { writeLearn } from "@/lib/practice/memory";
import { emptyCard } from "@/lib/practice/scheduler";
import { skillsForGrade } from "@/lib/practice/skills";
import { allowsScratchpad } from "@/lib/practice/surface";

describe("student home", () => {
  it("fills recommended practice when nothing has been assigned beyond the path", () => {
    const home = studentHome({ grade: 2, cards: [], attempts: [], today: "2026-10-15" });
    const skills = skillsForGrade(2);
    expect(home.assigned.map((skill) => skill.id)).toEqual([skills[0]?.id]);
    expect(home.assigned[0]?.note).toBe("Next in this grade");
    expect(home.recommended.length).toBeGreaterThan(0);
    expect(home.recommended.map((skill) => skill.id)).not.toContain(skills[0]?.id);
    expect(home.recent).toEqual([]);
  });

  it("puts a review skill on the assigned list and keeps recent practice separate", () => {
    const skills = skillsForGrade(3);
    const review = skills[2];
    expect(review).toBeDefined();
    if (!review) return;
    const home = studentHome({
      grade: 3,
      cards: [
        {
          ...emptyCard(review.id),
          attempted: 4,
          correct: 1,
          fsrs: writeLearn(null, { needsReview: true }),
        },
      ],
      attempts: [
        { skillId: review.id, correct: false, date: "2026-10-14", at: "2026-10-14T15:00:00.000Z" },
        { skillId: skills[0]?.id ?? review.id, correct: true, date: "2026-10-15", at: "2026-10-15T12:00:00.000Z" },
      ],
      today: "2026-10-15",
    });
    expect(home.assigned.map((skill) => skill.id)).toContain(review.id);
    expect(home.recommended.map((skill) => skill.id)).not.toContain(review.id);
    expect(home.recent[0]?.note).toBe("Practiced today");
    expect(home.recent.map((skill) => skill.id)).toContain(review.id);
  });
});

describe("scratchpad", () => {
  it("stays off paper grades and turns on from grade 4", () => {
    expect(allowsScratchpad(1)).toBe(false);
    expect(allowsScratchpad(3)).toBe(false);
    expect(allowsScratchpad(4)).toBe(true);
    expect(allowsScratchpad(8)).toBe(true);
  });
});
