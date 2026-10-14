import { isSupportedGrade, type SupportedGrade } from "@/lib/grades";

export type GradeAccess = {
  enrolled: SupportedGrade;
  working: SupportedGrade;
  nextUnlocked: boolean;
  requested: SupportedGrade | null;
};

/** Grades 1 through 8 stay visible. Finishing a grade is not required. */
export function selectorGrades(): SupportedGrade[] {
  return [1, 2, 3, 4, 5, 6, 7, 8];
}

export function nextEnrolledGrade(enrolled: SupportedGrade): SupportedGrade | null {
  const next = enrolled + 1;
  return isSupportedGrade(next) ? next : null;
}

export function gradeAccessFrom(input: {
  enrolled: number;
  working?: number | null;
  nextUnlocked?: boolean | null;
  requested?: number | null;
}): GradeAccess | null {
  if (!isSupportedGrade(input.enrolled)) return null;
  const working =
    input.working != null && isSupportedGrade(input.working) ? input.working : input.enrolled;
  const requested =
    input.requested != null && isSupportedGrade(input.requested) ? input.requested : null;
  return {
    enrolled: input.enrolled,
    working,
    nextUnlocked: Boolean(input.nextUnlocked),
    requested,
  };
}

/**
 * A kid can practice the enrolled grade, the grade they are already working in,
 * and the next grade when a parent has unlocked it. Any other grade needs approval.
 */
export function gradeIsOpen(access: GradeAccess, target: number): boolean {
  if (!isSupportedGrade(target)) return false;
  if (target === access.enrolled || target === access.working) return true;
  const next = nextEnrolledGrade(access.enrolled);
  return Boolean(access.nextUnlocked && next === target);
}
