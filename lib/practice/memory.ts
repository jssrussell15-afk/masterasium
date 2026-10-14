/**
 * `skill_states.fsrs` holds three things without a schema change:
 * - `mistakes`: repeated-mistake counts
 * - `fsrs`: the untouched scheduler payload (`{ due }`, `{ stability }`, …)
 * - `learn`: lesson check, review, and rollback memory
 *
 * A plain payload from before this wrap is left as the payload.
 * Unknown payload keys are copied through.
 */

export type LessonCheck = "due" | "active" | "retry" | "passed";

export type LearnState = {
  lessonCheck?: LessonCheck;
  checkAsked?: number;
  checkCorrect?: number;
  reviewDueAt?: string;
  needsReview?: boolean;
  reviewHits?: number;
  missStreak?: number;
  supportLeft?: number;
};

export type SkillMemory = {
  mistakes: Record<string, number>;
  payload: unknown;
  learn: LearnState;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function positive(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : undefined;
}

function dateString(value: unknown): string | undefined {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : undefined;
}

export function readLearnFields(raw: Record<string, unknown>): LearnState {
  const lesson = raw.lessonCheck;
  const lessonCheck =
    lesson === "due" || lesson === "active" || lesson === "retry" || lesson === "passed"
      ? lesson
      : undefined;
  return {
    lessonCheck,
    checkAsked: positive(raw.checkAsked),
    checkCorrect: positive(raw.checkCorrect),
    reviewDueAt: dateString(raw.reviewDueAt),
    needsReview: raw.needsReview === true ? true : undefined,
    reviewHits: positive(raw.reviewHits),
    missStreak: positive(raw.missStreak),
    supportLeft: positive(raw.supportLeft),
  };
}

function numberMap(raw: Record<string, unknown>): Record<string, number> {
  const mistakes: Record<string, number> = {};
  for (const [key, count] of Object.entries(raw)) {
    if (typeof count === "number" && Number.isFinite(count)) mistakes[key] = count;
  }
  return mistakes;
}

export function cleanLearn(learn: LearnState): LearnState {
  const next: LearnState = {};
  if (learn.lessonCheck) next.lessonCheck = learn.lessonCheck;
  if (learn.checkAsked) next.checkAsked = learn.checkAsked;
  if (learn.checkCorrect) next.checkCorrect = learn.checkCorrect;
  if (learn.reviewDueAt) next.reviewDueAt = learn.reviewDueAt;
  if (learn.needsReview) next.needsReview = true;
  if (learn.reviewHits) next.reviewHits = learn.reviewHits;
  if (learn.missStreak) next.missStreak = learn.missStreak;
  if (learn.supportLeft) next.supportLeft = learn.supportLeft;
  return next;
}

function isWrapped(value: Record<string, unknown>): boolean {
  if (!("fsrs" in value)) return false;
  const hasMistakes = "mistakes" in value && isRecord(value.mistakes);
  const hasLearn = "learn" in value && isRecord(value.learn);
  return hasMistakes || hasLearn;
}

export function readMemory(fsrs: unknown): SkillMemory {
  if (!isRecord(fsrs) || !isWrapped(fsrs)) {
    return { mistakes: {}, payload: fsrs ?? null, learn: {} };
  }
  return {
    mistakes: isRecord(fsrs.mistakes) ? numberMap(fsrs.mistakes) : {},
    payload: fsrs.fsrs ?? null,
    learn: isRecord(fsrs.learn) ? readLearnFields(fsrs.learn) : {},
  };
}

export function readLearn(fsrs: unknown): LearnState {
  return readMemory(fsrs).learn;
}

/**
 * Replaces learn when `patch.learn` is passed. Omitting it keeps the current learn.
 * Mistake counts follow the same rule. The nested payload is never dropped.
 */
export function writeMemory(
  current: unknown,
  patch: { mistakes?: Record<string, number>; learn?: LearnState },
): unknown {
  const memory = readMemory(current);
  const mistakes = patch.mistakes ?? memory.mistakes;
  const learn = cleanLearn(patch.learn === undefined ? memory.learn : patch.learn);
  const hasMistakes = Object.keys(mistakes).length > 0;
  const hasLearn = Object.keys(learn).length > 0;
  if (!hasMistakes && !hasLearn) return memory.payload ?? null;
  const wrapped: Record<string, unknown> = { fsrs: memory.payload ?? null };
  if (hasMistakes) wrapped.mistakes = mistakes;
  if (hasLearn) wrapped.learn = learn;
  return wrapped;
}

export function writeLearn(current: unknown, learn: LearnState): unknown {
  return writeMemory(current, { learn });
}
