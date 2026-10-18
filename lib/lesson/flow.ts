import { addDays } from "@/lib/practice/dates";
import { classifyMistake } from "@/lib/practice/mistakes";
import type { LearnState } from "@/lib/practice/memory";

/** Five questions, and four correct is 80%. */
export const MASTERY_SIZE = 5;
export const MASTERY_PASS = 4;
export const FADED_COUNT = 2;
export const PRACTICE_COUNT = 3;
export const RETRY_NEW_COUNT = 2;

export const REVIEW_GAPS = [
  { gap: "day", days: 1 },
  { gap: "week", days: 7 },
  { gap: "month", days: 30 },
] as const;

export type ReviewGap = (typeof REVIEW_GAPS)[number]["gap"];

export type LessonStage =
  | "intro"
  | "worked"
  | "faded"
  | "practice"
  | "mastery"
  | "retry-worked"
  | "retry-new"
  | "complete";

export type ReviewPhase = "question" | "worked" | "fresh";

export type LessonRun = {
  skillId: string;
  stage: LessonStage;
  stepIndex: number;
  masteryCorrect: number;
  masteryAsked: number;
  generation: number;
  lastMistake: string | null;
  feedbackNote: string | null;
  feedbackExpected: string | null;
  mode: "learn" | "review";
  reviewPhase: ReviewPhase | null;
  missedInRound: boolean;
};

export type LessonEvent =
  | { type: "continue" }
  | { type: "answer"; correct: boolean; note: string | null; expected: string };

export type LessonStep = {
  run: LessonRun;
  review: "cleared" | "missed" | null;
  justCompleted: boolean;
};

const STAGES: LessonStage[] = [
  "intro",
  "worked",
  "faded",
  "practice",
  "mastery",
  "retry-worked",
  "retry-new",
  "complete",
];

export function freshRun(skillId: string): LessonRun {
  return {
    skillId,
    stage: "intro",
    stepIndex: 0,
    masteryCorrect: 0,
    masteryAsked: 0,
    generation: 0,
    lastMistake: null,
    feedbackNote: null,
    feedbackExpected: null,
    mode: "learn",
    reviewPhase: null,
    missedInRound: false,
  };
}

export function reviewDates(today: string): { gap: ReviewGap; dueOn: string }[] {
  return REVIEW_GAPS.map((item) => ({ gap: item.gap, dueOn: addDays(today, item.days) }));
}

export function reviewPlanDates(today: string): string[] {
  return reviewDates(today).map((item) => item.dueOn);
}

/** Specific note for a miss. The wording names the slip. */
export function explainMiss(prompt: string, expected: string, given: string): string {
  const note = classifyMistake(prompt, expected, given).note.trim();
  return note || "Redo one step at a time.";
}

export function reduceLesson(run: LessonRun, event: LessonEvent): LessonStep {
  if (run.feedbackNote) {
    if (event.type === "continue") {
      return { run: { ...run, feedbackNote: null, feedbackExpected: null }, review: null, justCompleted: false };
    }
    return { run, review: null, justCompleted: false };
  }
  if (run.mode === "review") return reduceReview(run, event);
  return reduceLearn(run, event);
}

/** A finished lesson opens a review when this skill is due. */
export function openReview(run: LessonRun, due: boolean): LessonRun {
  if (!due || run.feedbackNote || run.stage !== "complete" || run.mode === "review") return run;
  return { ...run, mode: "review", reviewPhase: "question" };
}

export function gapsToClose(
  plan: string[] | undefined,
  today: string,
  rows: { gap: ReviewGap; dueOn: string }[],
): ReviewGap[] {
  const remaining = new Set((plan ?? []).filter((date) => date >= today));
  return rows.filter((row) => row.dueOn <= today && !remaining.has(row.dueOn)).map((row) => row.gap);
}

export function asStage(value: string): LessonStage {
  return STAGES.includes(value as LessonStage) ? (value as LessonStage) : "intro";
}

export function asReviewPhase(value: string | null): ReviewPhase | null {
  if (value === "question" || value === "worked" || value === "fresh") return value;
  return null;
}

function missed(run: LessonRun, event: Extract<LessonEvent, { type: "answer" }>): LessonRun {
  if (event.correct) return run;
  return {
    ...run,
    feedbackNote: event.note ?? "Redo one step at a time.",
    feedbackExpected: event.expected,
    lastMistake: event.note ?? run.lastMistake,
    missedInRound: true,
  };
}

function reduceLearn(run: LessonRun, event: LessonEvent): LessonStep {
  if (run.stage === "intro" && event.type === "continue") {
    return { run: { ...run, stage: "worked", stepIndex: 0 }, review: null, justCompleted: false };
  }
  if (run.stage === "worked" && event.type === "continue") {
    return { run: { ...run, stage: "faded", stepIndex: 0 }, review: null, justCompleted: false };
  }
  if (run.stage === "retry-worked" && event.type === "continue") {
    return {
      run: { ...run, stage: "retry-new", stepIndex: 0, generation: run.generation + 1 },
      review: null,
      justCompleted: false,
    };
  }
  if (event.type !== "answer") return { run, review: null, justCompleted: false };

  if (run.stage === "faded") {
    return { run: advance(missed({ ...run }, event), FADED_COUNT, "practice"), review: null, justCompleted: false };
  }
  if (run.stage === "practice") {
    const next = advance(missed({ ...run }, event), PRACTICE_COUNT, "mastery");
    if (next.stage === "mastery") {
      return {
        run: { ...next, masteryAsked: 0, masteryCorrect: 0, stepIndex: 0 },
        review: null,
        justCompleted: false,
      };
    }
    return { run: next, review: null, justCompleted: false };
  }
  if (run.stage === "retry-new") {
    const next = advance(missed({ ...run }, event), RETRY_NEW_COUNT, "mastery");
    if (next.stage === "mastery") {
      return {
        run: { ...next, masteryAsked: 0, masteryCorrect: 0, stepIndex: 0 },
        review: null,
        justCompleted: false,
      };
    }
    return { run: next, review: null, justCompleted: false };
  }
  if (run.stage === "mastery") return scoreMastery(run, event);
  return { run, review: null, justCompleted: false };
}

function advance(run: LessonRun, limit: number, nextStage: LessonStage): LessonRun {
  const step = run.stepIndex + 1;
  if (step >= limit) return { ...run, stage: nextStage, stepIndex: 0 };
  return { ...run, stepIndex: step };
}

function scoreMastery(run: LessonRun, event: Extract<LessonEvent, { type: "answer" }>): LessonStep {
  const asked = run.masteryAsked + 1;
  const correct = run.masteryCorrect + (event.correct ? 1 : 0);
  const marked = missed(
    { ...run, masteryAsked: asked, masteryCorrect: correct, stepIndex: run.stepIndex + 1 },
    event,
  );
  if (asked < MASTERY_SIZE) return { run: marked, review: null, justCompleted: false };
  if (correct >= MASTERY_PASS) {
    return {
      run: {
        ...marked,
        stage: "complete",
        mode: "learn",
        reviewPhase: null,
        ...(event.correct ? { feedbackNote: null, feedbackExpected: null } : {}),
      },
      review: null,
      justCompleted: true,
    };
  }
  return {
    run: {
      ...marked,
      stage: "retry-worked",
      stepIndex: 0,
      masteryAsked: 0,
      masteryCorrect: 0,
    },
    review: null,
    justCompleted: false,
  };
}

function reduceReview(run: LessonRun, event: LessonEvent): LessonStep {
  const phase = run.reviewPhase ?? "question";
  if (phase === "worked") {
    if (event.type !== "continue") return { run, review: null, justCompleted: false };
    return {
      run: { ...run, reviewPhase: "fresh", generation: run.generation + 1 },
      review: null,
      justCompleted: false,
    };
  }
  if (event.type !== "answer") return { run, review: null, justCompleted: false };
  if (event.correct) {
    return {
      run: { ...run, mode: "learn", reviewPhase: null, feedbackNote: null, feedbackExpected: null },
      review: "cleared",
      justCompleted: false,
    };
  }
  if (phase === "question") {
    return {
      run: {
        ...missed(run, event),
        reviewPhase: "worked",
      },
      review: null,
      justCompleted: false,
    };
  }
  return {
    run: { ...missed(run, event), mode: "learn", reviewPhase: null },
    review: "missed",
    justCompleted: false,
  };
}

export function planFromLearn(learn: LearnState): string[] | undefined {
  return learn.reviewPlan;
}
