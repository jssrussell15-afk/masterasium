import { addDays } from "@/lib/practice/dates";
import type { LearnState } from "@/lib/practice/memory";
import { REVIEW_AFTER_DAYS } from "@/lib/practice/review";

/** A short check, not a test. Four questions, pass at three correct. */
export const CHECK_SIZE = 4;
export const CHECK_PASS = 3;

export function lessonCheckOpen(learn: LearnState): boolean {
  return learn.lessonCheck === "due" || learn.lessonCheck === "active" || learn.lessonCheck === "retry";
}

/** Fold one check answer into learn state. Caller has already copied `learn`. */
export function advanceLessonCheck(
  learn: LearnState,
  before: LearnState,
  input: { correct: boolean; today: string },
): void {
  const starting = before.lessonCheck === "due" || before.lessonCheck == null;
  const asked = (starting ? 0 : (before.checkAsked ?? 0)) + 1;
  const got = (starting ? 0 : (before.checkCorrect ?? 0)) + (input.correct ? 1 : 0);

  if (asked >= CHECK_SIZE) {
    learn.checkAsked = undefined;
    learn.checkCorrect = undefined;
    if (got >= CHECK_PASS) {
      learn.lessonCheck = "passed";
      learn.reviewDueAt = addDays(input.today, REVIEW_AFTER_DAYS);
      learn.needsReview = undefined;
      learn.reviewHits = undefined;
    } else {
      learn.lessonCheck = "retry";
    }
    return;
  }

  learn.lessonCheck = "active";
  learn.checkAsked = asked;
  learn.checkCorrect = got || undefined;
}
