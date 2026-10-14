import type { QuestionKind } from "@/lib/practice/types";

/** The first questions of a new skill. After this, the question is solo. */
export const ASSIST_QUESTIONS = 3;

export type AssistPlan = {
  setup: string;
  firstStep: string | null;
};

function hidesAnswer(step: string, expected: string): boolean {
  const normalizedStep = step.toLowerCase().replace(/\s+/g, "");
  const normalizedExpected = expected.trim().toLowerCase().replace(/\s+/g, "");
  if (!normalizedExpected) return false;
  return normalizedStep.includes(normalizedExpected);
}

/**
 * Guided start for the first `ASSIST_QUESTIONS` attempts of a skill.
 * Review, lesson checks, and rollback questions are solo.
 * A first step that already contains the answer is left out.
 */
export function assistFor(input: {
  attempted: number;
  summary: string;
  firstStep: string | null;
  expected: string;
  kind: QuestionKind;
}): AssistPlan | null {
  if (input.kind !== "focus") return null;
  if (input.attempted < 0 || input.attempted >= ASSIST_QUESTIONS) return null;
  const step = input.firstStep?.trim() ?? "";
  return {
    setup: input.summary,
    firstStep: step && !hidesAnswer(step, input.expected) ? step : null,
  };
}
