import type { LessonDef } from "@/lib/lesson/catalog";
import { FADED_COUNT, MASTERY_SIZE, PRACTICE_COUNT, RETRY_NEW_COUNT, type LessonRun } from "@/lib/lesson/flow";
import { isHoldNote, readHold } from "@/lib/lesson/hold";
import { buildWorkedExample, type WorkedExample } from "@/lib/practice/example";
import { whyLine } from "@/lib/practice/feedback";
import { generateQuestion } from "@/lib/practice/generate";
import { hintLadder } from "@/lib/practice/hints";
import { answerShape, type AnswerShape } from "@/lib/practice/parts";
import type { Skill } from "@/lib/practice/skills";
import type { Question } from "@/lib/practice/types";
import type { ShowLevel, SupportMode } from "@/lib/practice/fade";
import { walkForSkill, type Walkthrough } from "@/lib/practice/walk";

export type LessonScreen =
  | {
      kind: "intro";
      eyebrow: string;
      title: string;
      summary: string;
      video: LessonDef["video"];
    }
  | {
      kind: "worked";
      eyebrow: string;
      title: string;
      lead: string | null;
      prompt: string;
      steps: string[];
      answer: string;
    }
  | {
      kind: "question";
      eyebrow: string;
      title: string;
      prompt: string;
      steps: string[];
      hint: string | null;
      responseHint: string | null;
      shape: AnswerShape;
      taskKey: string;
      progress: { index: number; total: number } | null;
      example: WorkedExample | null;
      guideSteps: string[];
      hold: "retry" | "correct" | "revealed" | null;
      why: string | null;
      solutionSteps: string[];
      solutionAnswer: string | null;
      draft: string;
      walk: Walkthrough | null;
      showLevel?: ShowLevel;
      walkMode?: SupportMode | null;
    }
  | {
      kind: "feedback";
      eyebrow: string;
      note: string;
      expected: string;
    }
  | {
      kind: "complete";
      eyebrow: string;
      title: string;
      sentence: string;
      nextReview: string | null;
    };

export type LessonTask = {
  prompt: string;
  answer: string;
  /** Steps already on the page before the child answers. */
  steps: string[];
  /** Full worked steps, shown only after the question is revealed. */
  worked: string[];
  hint: string | null;
  walk: Walkthrough | null;
};

export function lessonTask(run: LessonRun, skill: Skill): LessonTask | null {
  if ((run.feedbackNote && !isHoldNote(run.feedbackNote)) || run.stage === "intro" || run.stage === "complete") {
    return null;
  }
  if (run.stage === "worked" || run.stage === "retry-worked") return null;
  if (run.mode === "review" && run.reviewPhase === "worked") return null;

  if (run.mode === "review") {
    const slot = run.reviewPhase === "fresh" ? "review-fresh" : "review";
    return hideSteps(generated(skill.id, slot, run.generation, 0), false);
  }
  if (run.stage === "faded" && run.stepIndex === 0) {
    return {
      prompt: skill.examplePrompt,
      answer: skill.exampleAnswer,
      steps: skill.exampleSteps.slice(0, -1),
      worked: skill.exampleSteps,
      hint: skill.exampleSteps[0] ?? skill.summary,
      walk: walkForSkill(skill.id, skill.examplePrompt, skill.exampleAnswer),
    };
  }
  if (run.stage === "faded") {
    return hideSteps(generated(skill.id, "faded", run.generation, run.stepIndex), true);
  }
  if (run.stage === "retry-new") {
    return hideSteps(generated(skill.id, "retry", run.generation, run.stepIndex), true);
  }
  if (run.stage === "practice") {
    return hideSteps(generated(skill.id, "practice", run.generation, run.stepIndex), false);
  }
  if (run.stage === "mastery") {
    return hideSteps(generated(skill.id, "mastery", run.generation, run.masteryAsked), false);
  }
  return null;
}

export function buildLessonScreen(
  run: LessonRun,
  skill: Skill,
  lesson: LessonDef,
  extra: { nextReview: string | null; showLevel?: ShowLevel; walkMode?: SupportMode | null },
): LessonScreen {
  const hold = readHold(run.feedbackNote, run.feedbackExpected);
  if (run.feedbackNote && !hold) {
    return {
      kind: "feedback",
      eyebrow: skill.title,
      note: run.feedbackNote,
      expected: run.feedbackExpected ?? "",
    };
  }
  if (run.mode === "review" && run.reviewPhase === "worked") {
    return workedScreen(skill, "Let's look at that step again.", run.lastMistake);
  }
  if (run.mode === "review") {
    const task = lessonTask(run, skill);
    return questionScreen(skill, run.reviewPhase === "fresh" ? "Same idea, new numbers" : "A review", task, run, {
      showLevel: extra.showLevel,
      walkMode: extra.walkMode ?? null,
    });
  }
  if (run.stage === "intro") {
    return {
      kind: "intro",
      eyebrow: "Lesson",
      title: skill.title,
      summary: skill.summary,
      video: lesson.video,
    };
  }
  if (run.stage === "worked") return workedScreen(skill, "Watch this one.", null);
  if (run.stage === "retry-worked") {
    return workedScreen(skill, "Back to the step that slipped.", run.lastMistake);
  }
  if (run.stage === "complete") {
    return {
      kind: "complete",
      eyebrow: "Finished for today",
      title: skill.title,
      sentence: lesson.sentence,
      nextReview: extra.nextReview,
    };
  }
  const task = lessonTask(run, skill);
  const support = { showLevel: extra.showLevel, walkMode: extra.walkMode ?? null };
  const eyebrow =
    run.stage === "faded"
      ? "Your turn"
      : run.stage === "mastery"
        ? "Show what you know"
        : run.stage === "retry-new"
          ? "New numbers"
          : "Practice";
  return questionScreen(skill, eyebrow, task, run, support);
}

function workedScreen(skill: Skill, lead: string, mistake: string | null): LessonScreen {
  return {
    kind: "worked",
    eyebrow: skill.title,
    title: lead,
    lead: mistake,
    prompt: skill.examplePrompt,
    steps: skill.exampleSteps,
    answer: skill.exampleAnswer,
  };
}

function questionScreen(
  skill: Skill,
  eyebrow: string,
  task: LessonTask | null,
  run: LessonRun,
  support?: { showLevel?: ShowLevel; walkMode?: SupportMode | null },
): LessonScreen {
  const prompt = task?.prompt ?? skill.examplePrompt;
  const answer = task?.answer ?? skill.exampleAnswer;
  const worked = task?.worked ?? [];
  const hold = readHold(run.feedbackNote, run.feedbackExpected);
  const ladder = hintLadder({
    summary: skill.summary,
    firstStep: task?.hint ?? worked[0] ?? null,
    examplePrompt: skill.examplePrompt,
    exampleAnswer: skill.exampleAnswer,
    expected: answer,
    prompt,
  });
  const revealed = hold?.phase === "revealed";
  return {
    kind: "question",
    eyebrow,
    title: skill.title,
    prompt,
    steps: task?.steps ?? [],
    hint: ladder.hint,
    responseHint: skill.responseHint,
    shape: answerShape(prompt, answer),
    taskKey: `${run.mode}:${run.stage}:${run.reviewPhase ?? ""}:${run.generation}:${run.stepIndex}:${run.masteryAsked}:${prompt}`,
    progress: questionProgress(run),
    example: buildWorkedExample({ skillId: skill.id, livePrompt: prompt }),
    guideSteps: task?.steps ?? [],
    hold: hold?.phase ?? null,
    why: hold?.phase === "correct" ? whyLine(worked) : null,
    solutionSteps: revealed ? worked : [],
    solutionAnswer: revealed ? answer : null,
    draft: hold?.given ?? "",
    walk: task?.walk ? { steps: task.walk.steps, answer: revealed ? answer : "" } : null,
    ...(support?.showLevel ? { showLevel: support.showLevel } : {}),
    ...(support?.walkMode ? { walkMode: support.walkMode } : hold?.walkMode ? { walkMode: hold.walkMode } : {}),
  };
}

function questionProgress(run: LessonRun): { index: number; total: number } | null {
  if (run.mode === "review") return { index: 1, total: 1 };
  if (run.stage === "faded") return { index: run.stepIndex + 1, total: FADED_COUNT };
  if (run.stage === "practice") return { index: run.stepIndex + 1, total: PRACTICE_COUNT };
  if (run.stage === "mastery") return { index: run.masteryAsked + 1, total: MASTERY_SIZE };
  if (run.stage === "retry-new") return { index: run.stepIndex + 1, total: RETRY_NEW_COUNT };
  return null;
}

function hideSteps(question: Question, showPriorSteps: boolean): LessonTask {
  const steps = showPriorSteps ? question.steps.slice(0, -1) : [];
  return {
    prompt: question.prompt,
    answer: question.answer,
    steps,
    worked: question.steps,
    hint: showPriorSteps ? (question.steps[0] ?? null) : null,
    walk: question.walk ?? walkForSkill(question.skillId, question.prompt, question.answer),
  };
}

function generated(skillId: string, slot: string, generation: number, index: number): Question {
  return generateQuestion(skillId, mulberry32(hashSeed([skillId, slot, String(generation), String(index)])));
}

function hashSeed(parts: string[]): number {
  let hash = 2166136261;
  const text = parts.join("|");
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}
