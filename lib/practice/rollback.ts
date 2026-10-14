import type { LearnState } from "@/lib/practice/memory";

/** Consecutive misses before the next questions step back to an easier skill. */
export const ROLLBACK_MISSES = 3;
export const SUPPORT_QUESTIONS = 3;

export function shouldRollback(learn: LearnState): boolean {
  return (learn.supportLeft ?? 0) > 0 || (learn.missStreak ?? 0) >= ROLLBACK_MISSES;
}

export function armRollback(learn: LearnState): void {
  if ((learn.missStreak ?? 0) >= ROLLBACK_MISSES && !(learn.supportLeft && learn.supportLeft > 0)) {
    learn.supportLeft = SUPPORT_QUESTIONS;
  }
}

/** One support question spent. At zero the miss streak resets so the skill can be tried again. */
export function spendSupport(learn: LearnState): void {
  const left = Math.max(0, (learn.supportLeft ?? SUPPORT_QUESTIONS) - 1);
  learn.supportLeft = left > 0 ? left : undefined;
  if (left === 0) learn.missStreak = 0;
}
