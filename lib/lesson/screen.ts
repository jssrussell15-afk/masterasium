import type { LessonDef } from "@/lib/lesson/catalog";
import type { LessonRun } from "@/lib/lesson/flow";
import { generateQuestion } from "@/lib/practice/generate";
import { answerShape, type AnswerShape } from "@/lib/practice/parts";
import type { Skill } from "@/lib/practice/skills";
import type { Question } from "@/lib/practice/types";

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
  steps: string[];
  hint: string | null;
};

export function lessonTask(run: LessonRun, skill: Skill): LessonTask | null {
  if (run.feedbackNote || run.stage === "intro" || run.stage === "complete") return null;
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
      hint: skill.exampleSteps[0] ?? skill.summary,
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
  extra: { nextReview: string | null },
): LessonScreen {
  if (run.feedbackNote) {
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
    return questionScreen(skill, run.reviewPhase === "fresh" ? "Same idea, new numbers" : "A review", task, run);
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
  const eyebrow =
    run.stage === "faded"
      ? "Your turn"
      : run.stage === "mastery"
        ? "Show what you know"
        : run.stage === "retry-new"
          ? "New numbers"
          : "Practice";
  return questionScreen(skill, eyebrow, task, run);
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
): LessonScreen {
  const prompt = task?.prompt ?? skill.examplePrompt;
  const answer = task?.answer ?? skill.exampleAnswer;
  return {
    kind: "question",
    eyebrow,
    title: skill.title,
    prompt,
    steps: task?.steps ?? [],
    hint: task?.hint ?? null,
    responseHint: skill.responseHint,
    shape: answerShape(prompt, answer),
    taskKey: `${run.mode}:${run.stage}:${run.reviewPhase ?? ""}:${run.generation}:${run.stepIndex}:${run.masteryAsked}:${prompt}`,
  };
}

function hideSteps(question: Question, showPriorSteps: boolean): LessonTask {
  const steps = showPriorSteps ? question.steps.slice(0, -1) : [];
  return {
    prompt: question.prompt,
    answer: question.answer,
    steps,
    hint: showPriorSteps ? (question.steps[0] ?? null) : null,
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
