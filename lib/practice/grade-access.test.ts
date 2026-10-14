import { describe, expect, it } from "vitest";
import { skillsForGrade } from "@/lib/practice/skills";
import { describeCatalog } from "@/lib/practice/scheduler";
import {
  gradeAccessFrom,
  gradeIsOpen,
  nextEnrolledGrade,
  selectorGrades,
  type GradeAccess,
} from "@/lib/practice/grade-access";

function access(partial: Partial<GradeAccess> & Pick<GradeAccess, "enrolled">): GradeAccess {
  return {
    working: partial.working ?? partial.enrolled,
    nextUnlocked: partial.nextUnlocked ?? false,
    requested: partial.requested ?? null,
    enrolled: partial.enrolled,
  };
}

describe("grade access", () => {
  it("lists every grade even when no skill is mastered", () => {
    expect(selectorGrades()).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    const catalog = describeCatalog({ working: 3 }, []);
    expect(new Set(catalog.map((skill) => skill.grade))).toEqual(new Set(selectorGrades()));
    expect(catalog.every((skill) => skill.status === "not-started")).toBe(true);
    expect(catalog.filter((skill) => skill.grade === 3)).toHaveLength(skillsForGrade(3).length);
    expect(catalog.find((skill) => skill.current)?.grade).toBe(3);
  });

  it("opens the enrolled grade and the grade already being worked", () => {
    const row = access({ enrolled: 4, working: 2 });
    expect(gradeIsOpen(row, 4)).toBe(true);
    expect(gradeIsOpen(row, 2)).toBe(true);
    expect(gradeIsOpen(row, 5)).toBe(false);
    expect(gradeIsOpen(row, 3)).toBe(false);
  });

  it("opens the next grade only after a parent unlocks it", () => {
    const locked = access({ enrolled: 4, nextUnlocked: false });
    const unlocked = access({ enrolled: 4, nextUnlocked: true });
    expect(nextEnrolledGrade(4)).toBe(5);
    expect(gradeIsOpen(locked, 5)).toBe(false);
    expect(gradeIsOpen(unlocked, 5)).toBe(true);
    expect(gradeIsOpen(unlocked, 6)).toBe(false);
  });

  it("has no next grade after Grade 8", () => {
    const row = access({ enrolled: 8, nextUnlocked: true });
    expect(nextEnrolledGrade(8)).toBeNull();
    expect(gradeIsOpen(row, 8)).toBe(true);
    expect(gradeIsOpen(row, 1)).toBe(false);
  });

  it("falls back to the enrolled grade when the working grade is missing", () => {
    expect(
      gradeAccessFrom({
        enrolled: 6,
        working: null,
        nextUnlocked: false,
        requested: 9,
      }),
    ).toEqual({
      enrolled: 6,
      working: 6,
      nextUnlocked: false,
      requested: null,
    });
    expect(gradeAccessFrom({ enrolled: 0 })).toBeNull();
  });
});
