import { addDays } from "@/lib/practice/dates";
import type { LearnState } from "@/lib/practice/memory";
import type { QuestionKind } from "@/lib/practice/types";

/** 1 is the full walk. 4 leaves the card quiet until the child taps Show me. */
export type ShowLevel = 1 | 2 | 3 | 4;

export type SupportMode = "guided" | "faded";

export const FILL_LINE = "You fill this step.";

const GAP_STEP_DAYS = 14;
const GAP_RESET_DAYS = 30;
const YOUNG_DAYS = 2;

export type FillBlank = { index: number; expect: string };

export function isShowLevel(value: unknown): value is ShowLevel {
  return value === 1 || value === 2 || value === 3 || value === 4;
}

/** A walk skill starts on the full example. Any other skill starts on one hint. */
export function defaultShowLevel(hasWalk: boolean): ShowLevel {
  return hasWalk ? 1 : 3;
}

export function resolvedShowLevel(stored: number | undefined, hasWalk: boolean): ShowLevel {
  return isShowLevel(stored) ? stored : defaultShowLevel(hasWalk);
}

/** Correct answers in a row required before support steps down. Level 4 stays. */
export function showDownBar(grade: number, level: ShowLevel): number | null {
  if (level >= 4) return null;
  const young = grade <= 2;
  if (level === 1) return young ? 5 : 3;
  if (level === 2) return young ? 8 : 5;
  return young ? 12 : 8;
}

export function clipKidLine(text: string): string {
  const words = text.replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
  if (words.length <= 15) return words.join(" ");
  return words.slice(0, 15).join(" ");
}

export function kidWordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function moveDown(level: ShowLevel): ShowLevel {
  if (level === 1) return 2;
  if (level === 2) return 3;
  if (level === 3) return 4;
  return 4;
}

function moveUp(level: ShowLevel): ShowLevel {
  if (level === 4) return 3;
  if (level === 3) return 2;
  if (level === 2) return 1;
  return 1;
}

function dayNumber(isoDate: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!match) return null;
  return Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

/** Whole Toronto days from earlier to later. Negative when later is first. */
export function daysSince(earlier: string, later: string): number | null {
  const start = dayNumber(earlier);
  const end = dayNumber(later);
  if (start == null || end == null) return null;
  return Math.round((end - start) / 86400000);
}

/**
 * On the next appearance, 14 quiet days step support up one.
 * 30 quiet days return to the full example. The same day does this once.
 */
export function applyShowGap(
  learn: LearnState,
  input: { lastDay: string | null; today: string; hasWalk: boolean },
): LearnState {
  if (!input.lastDay || learn.showGapOn === input.today) return learn;
  const gap = daysSince(input.lastDay, input.today);
  if (gap == null || gap < GAP_STEP_DAYS) return learn;
  const level = resolvedShowLevel(learn.showLevel, input.hasWalk);
  const next = gap >= GAP_RESET_DAYS ? 1 : moveUp(level);
  return { ...learn, showLevel: next, showGapOn: input.today };
}

export type ShowAttemptInput = {
  grade: number;
  hasWalk: boolean;
  /** First-try correct. Show me and a miss are both false. */
  correct: boolean;
  showedHow: boolean;
  kind: QuestionKind | null;
  today: string;
  /** consecutive_correct after this finished item. */
  streak: number;
  /** Same id on a replay leaves the level where it is. */
  attemptId?: string;
};

/**
 * Step support down after a clean run, and up after misses.
 * A gap already counted today blocks a second step up.
 * One finished item moves the level by at most one.
 */
export function applyShowOnAttempt(learn: LearnState, input: ShowAttemptInput): LearnState {
  if (input.attemptId && learn.showAttempt === input.attemptId) return learn;

  const level = resolvedShowLevel(learn.showLevel, input.hasWalk);
  let showDays = learn.showDays ?? 0;
  if (learn.showDay !== input.today) showDays += 1;

  const showMisses = input.correct ? 0 : (learn.showMisses ?? 0) + 1;
  const gapToday = learn.showGapOn === input.today;
  const reviewMiss = !input.correct && input.kind === "review";
  const twoMisses = !input.correct && showMisses >= 2;

  let next = level;
  if (!gapToday && (reviewMiss || twoMisses)) {
    next = moveUp(level);
  } else if (input.correct && !input.showedHow) {
    const bar = showDownBar(input.grade, level);
    const youngHold = input.grade <= 2 && level === 1 && showDays < YOUNG_DAYS;
    if (bar != null && input.streak >= bar && !youngHold) next = moveDown(level);
  }

  return {
    ...learn,
    showLevel: next,
    showDays,
    showDay: input.today,
    showMisses: showMisses > 0 ? showMisses : undefined,
    showAttempt: input.attemptId,
    showGapOn: learn.showGapOn,
  };
}

/**
 * A first miss opens the full example only at level 1.
 * Two misses open that full example at any level.
 * Show me at level 2 or higher opens the partly filled example.
 */
export function supportAfterCheck(input: {
  level: ShowLevel;
  intent: "check" | "show-me" | "show-how";
  phase: "retry" | "correct" | "revealed" | "answering";
}): { promote: boolean; mode: SupportMode | null } {
  const firstMiss = input.intent === "check" && input.phase === "retry" && input.level === 1;
  const secondMiss = input.intent === "check" && input.phase === "revealed";
  const asked = input.intent === "show-me";
  if (!firstMiss && !secondMiss && !asked) return { promote: false, mode: null };
  if (firstMiss || secondMiss || input.level === 1) {
    return { promote: firstMiss, mode: "guided" };
  }
  return { promote: false, mode: "faded" };
}

/** Last one or two steps the child fills. The final blank is always the answer. */
export function walkBlanks(prompt: string, stepCount: number, answer: string): FillBlank[] {
  if (stepCount < 1 || !answer) return [];
  const last = stepCount - 1;
  const blanks: FillBlank[] = [{ index: last, expect: answer }];
  if (stepCount >= 4) {
    const mid = intermediateExpect(prompt, answer);
    if (mid) blanks.unshift({ index: last - 1, expect: mid });
  }
  return blanks;
}

/** A short example blanks its last step. Earlier lines stay filled. */
export function exampleBlanks(stepCount: number, answer: string): FillBlank[] {
  if (!answer) return [];
  if (stepCount < 1) return [{ index: 0, expect: answer }];
  return [{ index: stepCount - 1, expect: answer }];
}

function intermediateExpect(prompt: string, answer: string): string | null {
  const add = prompt.match(/^(\d+) \+ (\d+) = \?$/);
  if (add) return different(String((Number(add[1]) % 10) + (Number(add[2]) % 10)), answer);
  const sub = prompt.match(/^(\d+) − (\d+) = \?$/);
  if (sub) {
    const start = Number(sub[1]);
    const take = Number(sub[2]);
    const ones = (start % 10 < take % 10 ? 10 + (start % 10) : start % 10) - (take % 10);
    return different(String(ones), answer);
  }
  const later = prompt.match(/(\d+) minutes later/);
  if (later) return different(later[1] ?? "", answer);
  const parts = prompt.match(/fraction is (\d+) parts/);
  if (parts) return different(parts[1] ?? "", answer);
  return null;
}

function different(value: string, answer: string): string | null {
  if (!value || value === answer) return null;
  return value;
}

/** Days before today, for tests and gap checks. */
export function daysAgo(today: string, days: number): string {
  return addDays(today, -days);
}
