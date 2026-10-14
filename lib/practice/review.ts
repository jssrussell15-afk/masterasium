import { addDays } from "@/lib/practice/dates";
import type { LearnState } from "@/lib/practice/memory";
import type { QuestionKind } from "@/lib/practice/types";

export const REVIEW_AFTER_DAYS = 14;
export const REVIEW_CLEAR_HITS = 2;

export function isReviewDue(learn: LearnState, today: string | undefined): boolean {
  if (learn.needsReview) return true;
  if (!today || !learn.reviewDueAt) return false;
  return learn.reviewDueAt <= today;
}

/**
 * A quiet retest is a review-turn question, a date-due skill, or a skill already flagged.
 * One miss flags it. Two later correct answers clear it and schedule the next retest.
 */
export function applyRetest(
  learn: LearnState,
  before: LearnState,
  input: { correct: boolean; kind: QuestionKind | null; today: string },
): void {
  const retest =
    input.kind === "review" ||
    (before.reviewDueAt != null && before.reviewDueAt <= input.today) ||
    before.needsReview === true;

  if (before.needsReview && input.correct) {
    const hits = (before.reviewHits ?? 0) + 1;
    if (hits >= REVIEW_CLEAR_HITS) {
      learn.needsReview = undefined;
      learn.reviewHits = undefined;
      learn.reviewDueAt = addDays(input.today, REVIEW_AFTER_DAYS);
    } else {
      learn.reviewHits = hits;
    }
    return;
  }

  if (!input.correct && retest) {
    learn.needsReview = true;
    learn.reviewHits = undefined;
  }
}
