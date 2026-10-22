import { addDays } from "@/lib/practice/dates";
import type { LearnState } from "@/lib/practice/memory";
import type { QuestionKind } from "@/lib/practice/types";

/** 1 is the full walk. 4 leaves the card quiet until the child taps Show me. */
export type ShowLevel = 1 | 2 | 3 | 4;

export type SupportMode = "guided" | "faded";

/** One instruction in the caption bar. The steps themselves carry the numbers. */
export const FILL_CAPTION = "Fill in the missing numbers.";

/** @deprecated Use FILL_CAPTION. Kept so older imports still read the one instruction. */
export const FILL_LINE = FILL_CAPTION;

export type StepLine = {
  index: number;
  /** Words before the missing number. Empty when the step is complete. */
  lead: string;
  /** The number the child fills. Null when this step is shown finished. */
  blank: string | null;
  /** Words after the missing number, or the whole finished step. */
  rest: string;
};

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
  const captions = Array.from({ length: stepCount }, () => ({ caption: "" }));
  return stepLines(prompt, captions, answer)
    .filter((line): line is StepLine & { blank: string } => line.blank != null)
    .map((line) => ({ index: line.index, expect: line.blank }));
}

/**
 * One line per shown step. A blank is a missing number inside that step's words.
 * Finished steps keep their numbers visible.
 */
export function stepLines(prompt: string, steps: { caption: string }[], answer: string): StepLine[] {
  if (!answer) return [];
  const add = prompt.match(/^(\d+) \+ (\d+) = \?$/);
  if (add) return additionLines(Number(add[1]), Number(add[2]), steps, answer);
  const sub = prompt.match(/^(\d+) − (\d+) = \?$/);
  if (sub) return subtractionLines(Number(sub[1]), Number(sub[2]), steps, answer);
  return genericLines(steps, answer);
}

/** Listen reads every step. A missing number is spoken as "blank". */
export function spokenSteps(lines: StepLine[]): string {
  return lines
    .map((line) => {
      const body = line.blank == null ? `${line.lead}${line.rest}` : `${line.lead}blank${line.rest}`;
      const clean = body.replace(/\s+/g, " ").trim();
      if (!clean) return "";
      return /[.?!]$/.test(clean) ? clean : `${clean}.`;
    })
    .filter(Boolean)
    .join(" ");
}

/** A short example blanks the answer inside its own last line. */
export function exampleLines(steps: string[], answer: string): StepLine[] {
  if (!answer) return [];
  const last = Math.max(steps.length - 1, 0);
  if (steps.length === 0) return [splitOut("", answer, 0)];
  return steps.map((caption, index) => (index === last ? splitOut(caption, answer, index) : filled(index, caption)));
}

/** A short example blanks its last step. Earlier lines stay filled. */
export function exampleBlanks(stepCount: number, answer: string): FillBlank[] {
  if (!answer) return [];
  if (stepCount < 1) return [{ index: 0, expect: answer }];
  return [{ index: stepCount - 1, expect: answer }];
}

function additionLines(left: number, right: number, steps: { caption: string }[], answer: string): StepLine[] {
  const ones = (left % 10) + (right % 10);
  const tens = digit(left, 10) + digit(right, 10);
  const trade = steps.find((step) => /trade/i.test(step.caption))?.caption ?? "";
  const tensTrade = /tens/i.test(trade) || (!trade && ones < 10 && tens >= 10);
  const lines: StepLine[] = [onesLine(0, left % 10, right % 10, ones, answer)];

  if (tensTrade) {
    lines.push(
      filled(1, `Add the tens: ${digit(left, 10)} + ${digit(right, 10)} = ${tens} tens, so trade 10 tens for a hundred.`),
    );
  } else if (ones >= 10) {
    lines.push(filled(1, trade || "Trade 10 ones for a ten."));
    const next = steps.find((step) => /next place/i.test(step.caption));
    if (next) lines.push(filled(2, next.caption));
  } else if (trade) {
    lines.push(filled(1, trade));
  }

  lines.push({ index: Math.max(steps.length - 1, lines.length), lead: `So ${left} + ${right} = `, blank: answer, rest: "" });
  return lines;
}

function subtractionLines(start: number, take: number, steps: { caption: string }[], answer: string): StepLine[] {
  const borrowed = start % 10 < take % 10;
  const onesHave = borrowed ? 10 + (start % 10) : start % 10;
  const ones = onesHave - (take % 10);
  const stem = (steps[0]?.caption || "Check the ones place.").replace(/[.?!]$/, "");
  const lines: StepLine[] = [
    {
      index: 0,
      lead: `${stem}: ${onesHave} − ${take % 10} = `,
      blank: String(ones) === answer ? null : String(ones),
      rest: "",
    },
  ];
  if (lines[0].blank == null) {
    lines[0] = filled(0, `${stem}: ${onesHave} − ${take % 10} = ${ones}.`);
  }
  const trade = steps.find((step) => /trade/i.test(step.caption));
  if (trade) lines.push(filled(1, trade.caption));
  lines.push({ index: Math.max(steps.length - 1, lines.length), lead: `So ${start} − ${take} = `, blank: answer, rest: "" });
  return lines;
}

function genericLines(steps: { caption: string }[], answer: string): StepLine[] {
  if (steps.length === 0) return [splitOut("", answer, 0)];
  const last = steps.length - 1;
  return steps.map((step, index) => (index === last ? splitOut(step.caption, answer, index) : filled(index, step.caption)));
}

function onesLine(index: number, left: number, right: number, ones: number, answer: string): StepLine {
  const lead = `Add the ones: ${left} + ${right} = `;
  if (String(ones) === answer) return filled(index, `${lead}${ones}.`);
  return { index, lead, blank: String(ones), rest: "" };
}

function filled(index: number, text: string): StepLine {
  return { index, lead: "", blank: null, rest: text };
}

function splitOut(caption: string, expect: string, index: number): StepLine {
  const clean = caption.replace(/\s+/g, " ").trim();
  const at = clean.lastIndexOf(expect);
  if (at >= 0) {
    return { index, lead: clean.slice(0, at), blank: expect, rest: clean.slice(at + expect.length) };
  }
  const stem = clean.replace(/[.?!]$/, "");
  return { index, lead: stem ? `${stem}: ` : "", blank: expect, rest: "" };
}

function digit(value: number, place: number): number {
  return Math.floor(value / place) % 10;
}

/** Days before today, for tests and gap checks. */
export function daysAgo(today: string, days: number): string {
  return addDays(today, -days);
}
