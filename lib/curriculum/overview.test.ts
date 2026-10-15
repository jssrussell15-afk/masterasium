import { describe, expect, it } from "vitest";
import { GRADE_INTROS, ontarioLine, ontarioSkillIds } from "@/lib/curriculum/ontario";
import { curriculumOverview } from "@/lib/curriculum/overview";
import { PROVINCES } from "@/lib/curriculum/provinces";
import { SKILLS } from "@/lib/practice/skills";

function oneSentence(value: string) {
  expect(value.endsWith(".")).toBe(true);
  expect(value.slice(0, -1)).not.toMatch(/[.!?]/);
}

describe("Ontario curriculum overview", () => {
  it("lists every practice skill once, in a strand, as one sentence", () => {
    const ids = ontarioSkillIds();
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.sort()).toEqual(SKILLS.map((skill) => skill.id).sort());
    for (const skill of SKILLS) {
      const line = ontarioLine(skill.id);
      expect(line).toBeTruthy();
      oneSentence(line!.line);
    }
  });

  it("gives each grade one intro sentence and only the strands that have skills", () => {
    for (let grade = 1; grade <= 8; grade += 1) {
      oneSentence(GRADE_INTROS[grade as 1]);
      const page = curriculumOverview("ontario", `grade-${grade}`);
      expect(page?.grade).toBe(grade);
      expect(page?.strands.length).toBeGreaterThan(0);
      const listed = page?.strands.flatMap((strand) => strand.skills) ?? [];
      expect(listed).toHaveLength(SKILLS.filter((skill) => skill.grade === grade).length);
      expect(page?.strands.every((strand) => strand.skills.length > 0)).toBe(true);
    }
  });

  it("publishes Ontario only and rejects other routes", () => {
    expect(PROVINCES.filter((province) => province.ready).map((province) => province.slug)).toEqual([
      "ontario",
    ]);
    expect(PROVINCES.some((province) => province.slug === "quebec")).toBe(false);
    expect(curriculumOverview("alberta", "grade-5")).toBeNull();
    expect(curriculumOverview("ontario", "grade-9")).toBeNull();
    expect(curriculumOverview("ontario", "5")).toBeNull();
  });
});
