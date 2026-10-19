import { addDays } from "@/lib/practice/dates";
import { PRACTICE_SET_SIZE } from "@/lib/practice/feedback";
import type { LearnState } from "@/lib/practice/memory";
import type { QuestionKind } from "@/lib/practice/types";

/** Days until the next recall. Index 0 is 1 day. A step past the last one stays at 30. */
export const RECALL_INTERVALS = [1, 3, 7, 14, 30] as const;

export const ON_RAMP_LINE = "Let's try this one together.";
export const ON_RAMP_HANDOFF = "Your turn: try one like it.";

export type RecallMark = "day" | "week" | "month";

export function isReviewDue(learn: LearnState, today: string | undefined): boolean {
  if (learn.needsReview) return true;
  if (!today || !learn.reviewDueAt) return false;
  return learn.reviewDueAt <= today;
}

export function intervalDays(step: number | undefined): number {
  const index = step == null ? 0 : Math.min(Math.max(step, 0), RECALL_INTERVALS.length - 1);
  return RECALL_INTERVALS[index] ?? RECALL_INTERVALS[0];
}

/** A success at 1, 7, or 30 days closes that skill_reviews row. 3 and 14 do not. */
export function gapForInterval(days: number): RecallMark | null {
  if (days === 1) return "day";
  if (days === 7) return "week";
  if (days === 30) return "month";
  return null;
}

/**
 * The first recall after a skill is confirmed.
 * Absent `recallStep` means this same 1-day interval.
 */
export function armFirstRecall(learn: LearnState, today: string): void {
  learn.recallStep = 0;
  learn.reviewDueAt = addDays(today, RECALL_INTERVALS[0]);
  learn.needsReview = undefined;
  learn.reviewHits = undefined;
  learn.reviewPlan = undefined;
  learn.recallMisses = undefined;
  learn.recallMark = undefined;
}

export function onRampCopy(step: string | null | undefined): {
  line: string;
  step: string | null;
  handoff: string;
} {
  const clean = step?.trim() ?? "";
  return {
    line: ON_RAMP_LINE,
    step: clean || null,
    handoff: ON_RAMP_HANDOFF,
  };
}

/**
 * Question numbers (1-based) inside one sitting that may be an earlier skill.
 * A 10-question sitting uses 3, 6, and 9. A shorter sitting allows one review
 * for every four questions, still starting on the current skill.
 * A focus mix on the same count keeps the mix and pushes the review forward.
 */
export function reviewQuestionsInSet(setStart: number, setSize: number = PRACTICE_SET_SIZE): number[] {
  if (!Number.isInteger(setSize) || setSize < 1) return [];
  const cap = setSize >= PRACTICE_SET_SIZE ? 3 : Math.floor(setSize / 4);
  const base = [3, 6, 9].filter((question) => question <= setSize).slice(0, cap);
  const assigned: number[] = [];
  for (const slot of base) {
    for (let question = slot; question <= setSize; question += 1) {
      const count = setStart + question - 1;
      const mixTurn = count > 0 && count % 4 === 3;
      const besideReview = assigned.includes(question - 1) || assigned.includes(question + 1);
      if (question === 1 || mixTurn || besideReview || assigned.includes(question)) continue;
      assigned.push(question);
      break;
    }
  }
  return assigned;
}

/**
 * Which due skill to weave, or null when this question stays on the current skill.
 * `sessionCount` is how many questions are already answered. Question 3 is count 2.
 */
export function reviewCandidateIndex(
  sessionCount: number,
  setSize: number = PRACTICE_SET_SIZE,
): number | null {
  if (!Number.isInteger(sessionCount) || sessionCount < 0) return null;
  if (!Number.isInteger(setSize) || setSize < 1) return null;
  const setStart = Math.floor(sessionCount / setSize) * setSize;
  const question = (sessionCount % setSize) + 1;
  const index = reviewQuestionsInSet(setStart, setSize).indexOf(question);
  return index >= 0 ? index : null;
}

/**
 * A due item updates the single next date on `learn`.
 * A first-try correct with no worked example climbs one interval.
 * A miss steps back one interval and asks for a quiet on-ramp.
 * Two misses in a row on that skill return the interval to 1 day.
 */
export function applyRetest(
  learn: LearnState,
  before: LearnState,
  input: { correct: boolean; kind: QuestionKind | null; today: string; showedExample?: boolean },
): void {
  const dueNow =
    before.needsReview === true ||
    (before.reviewDueAt != null && before.reviewDueAt <= input.today);
  if (!dueNow || input.kind === "check" || input.kind === "support") return;

  if (input.correct && input.showedExample) {
    learn.recallMisses = undefined;
    learn.reviewHits = undefined;
    if (before.needsReview) learn.needsReview = undefined;
    return;
  }

  if (!input.correct) {
    const misses = (before.recallMisses ?? 0) + 1;
    const step = before.recallStep ?? 0;
    learn.recallMisses = misses;
    learn.recallStep = misses >= 2 ? 0 : Math.max(0, step - 1);
    learn.needsReview = true;
    learn.reviewDueAt = input.today;
    learn.reviewHits = undefined;
    learn.reviewPlan = undefined;
    learn.recallMark = undefined;
    return;
  }

  learn.needsReview = undefined;
  learn.recallMisses = undefined;
  learn.reviewHits = undefined;
  learn.reviewPlan = undefined;
  learn.recallFreshOn = input.today;

  if (before.needsReview) {
    const step = before.recallStep ?? 0;
    learn.recallStep = step;
    learn.reviewDueAt = addDays(input.today, intervalDays(step));
    learn.recallMark = undefined;
    return;
  }

  if (before.recallStep == null) {
    learn.recallStep = 0;
    learn.reviewDueAt = addDays(input.today, RECALL_INTERVALS[0]);
    learn.recallMark = undefined;
    return;
  }

  const completed = before.recallStep;
  const advanced = Math.min(completed + 1, RECALL_INTERVALS.length - 1);
  learn.recallStep = advanced;
  learn.reviewDueAt = addDays(input.today, RECALL_INTERVALS[advanced] ?? RECALL_INTERVALS[0]);
  learn.recallMark = gapForInterval(RECALL_INTERVALS[completed] ?? 0) ?? undefined;
}
