/**
 * `skill_states.fsrs` holds three things without a schema change:
 * - `mistakes`: repeated-mistake counts
 * - `fsrs`: the untouched scheduler payload (`{ due }`, `{ stability }`, …)
 * - `learn`: lesson check, review, rollback, and topic-intro memory
 *
 * A plain payload from before this wrap is left as the payload.
 * Unknown payload keys are copied through.
 */

export type LessonCheck = "due" | "active" | "retry" | "passed";

/** Why the topic intro last played. A later answer must keep these fields. */
export type IntroCycle = "new" | "relearn" | "rollback";

export type LearnState = {
  lessonCheck?: LessonCheck;
  checkAsked?: number;
  checkCorrect?: number;
  reviewDueAt?: string;
  needsReview?: boolean;
  reviewHits?: number;
  missStreak?: number;
  supportLeft?: number;
  introSeenAt?: string;
  introCycle?: IntroCycle;
  /**
   * Legacy list of dates. New recalls store one `reviewDueAt` and `recallStep` instead.
   * Kept so older cards still round-trip.
   */
  reviewPlan?: string[];
  /** A lesson is in progress, so the 10-question bar must not open the next skill yet. */
  lessonHold?: boolean;
  /**
   * Index into 1, 3, 7, 14, 30. Absent means the next success is due in 1 day.
   * Zero is stored: it is the 1-day interval, not "missing".
   */
  recallStep?: number;
  /** Review misses in a row. Two returns the interval to 1 day. Not a streak. */
  recallMisses?: number;
  /** Toronto day of the latest first-try review recall. Parent digest only. */
  recallFreshOn?: string;
  /** skill_reviews gap to mark done after a success at 1, 7, or 30 days. */
  recallMark?: "day" | "week" | "month";
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

function introCycle(value: unknown): IntroCycle | undefined {
  return value === "new" || value === "relearn" || value === "rollback" ? value : undefined;
}

function recallStep(value: unknown): number | undefined {
  if (typeof value !== "number" || !Number.isInteger(value)) return undefined;
  if (value < 0 || value > 4) return undefined;
  return value;
}

function recallMark(value: unknown): "day" | "week" | "month" | undefined {
  if (value === "day" || value === "week" || value === "month") return value;
  return undefined;
}

function dateList(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const dates = value.filter(
    (item): item is string => typeof item === "string" && /^\d{4}-\d{2}-\d{2}$/.test(item),
  );
  return dates.length > 0 ? dates : undefined;
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
    introSeenAt: dateString(raw.introSeenAt),
    introCycle: introCycle(raw.introCycle),
    reviewPlan: dateList(raw.reviewPlan),
    lessonHold: raw.lessonHold === true ? true : undefined,
    recallStep: recallStep(raw.recallStep),
    recallMisses: positive(raw.recallMisses),
    recallFreshOn: dateString(raw.recallFreshOn),
    recallMark: recallMark(raw.recallMark),
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
  if (learn.introSeenAt) next.introSeenAt = learn.introSeenAt;
  if (learn.introCycle) next.introCycle = learn.introCycle;
  if (learn.reviewPlan && learn.reviewPlan.length > 0) next.reviewPlan = learn.reviewPlan;
  if (learn.lessonHold) next.lessonHold = true;
  if (learn.recallStep != null) next.recallStep = learn.recallStep;
  if (learn.recallMisses) next.recallMisses = learn.recallMisses;
  if (learn.recallFreshOn) next.recallFreshOn = learn.recallFreshOn;
  if (learn.recallMark) next.recallMark = learn.recallMark;
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
