import { generateQuestion } from "@/lib/practice/generate";
import {
  INTRO_GAP_DAYS,
  INTRO_PLACEHOLDER,
  INTRO_SECONDS,
  introStyle,
  type IntroBeat,
  type SkillIntro,
} from "@/lib/practice/intro-view";
import type { IntroCycle, LearnState } from "@/lib/practice/memory";
import { SUPPORT_QUESTIONS } from "@/lib/practice/rollback";
import type { Skill } from "@/lib/practice/skills";
import type { Question, QuestionKind } from "@/lib/practice/types";

export type IntroDueInput = {
  attempted: number;
  learn: LearnState;
  today: string;
  /** Toronto day of the latest attempt on this skill, or null when there is none. */
  lastAttempt: string | null;
  kind: QuestionKind;
  /**
   * Questions still left on the skill that rolled back.
   * Read only when `kind` is `support`. The first question of that cycle is 3.
   */
  supportLeft?: number;
};

const NUMBER_TOKEN = /\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?/g;
const NEAR_TRANSFER_TRIES = 40;

function daysBetween(earlier: string, later: string): number {
  const start = Date.parse(`${earlier}T00:00:00Z`);
  const end = Date.parse(`${later}T00:00:00Z`);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return 0;
  return Math.round((end - start) / 86_400_000);
}

/**
 * Why this intro would play. Null means practice starts on the question.
 * A skill already in progress, with no stored flag, stays quiet until a long gap or a new rollback.
 */
export function introCycleDue(input: IntroDueInput): IntroCycle | null {
  const seenToday =
    input.learn.introCycle === "rollback" && input.learn.introSeenAt === input.today;
  if (input.kind === "support" && input.supportLeft === SUPPORT_QUESTIONS && !seenToday) {
    return "rollback";
  }

  if (input.attempted === 0 && !input.learn.introSeenAt) return "new";

  if (input.lastAttempt && input.attempted > 0) {
    const gap = daysBetween(input.lastAttempt, input.today);
    const seen = input.learn.introSeenAt;
    if (gap >= INTRO_GAP_DAYS && (!seen || seen <= input.lastAttempt)) return "relearn";
  }

  return null;
}

/** Number tokens become `#`, so "4 + 3 = ?" and "8 + 1 = ?" share a shape. */
export function promptShape(prompt: string): string {
  return prompt.replace(NUMBER_TOKEN, "#");
}

/**
 * A question with the same shape as the worked example, and different numbers when the generator allows it.
 * Falls back to any other prompt from the generator so practice is never blocked.
 */
export function nearTransfer(
  skill: Skill,
  rng: () => number = Math.random,
  options?: { small?: boolean },
): Question {
  const target = promptShape(skill.examplePrompt);
  let different: Question | null = null;
  let last: Question | null = null;
  for (let attempt = 0; attempt < NEAR_TRANSFER_TRIES; attempt += 1) {
    const question = generateQuestion(skill.id, rng, options);
    last = question;
    if (question.prompt === skill.examplePrompt) continue;
    if (promptShape(question.prompt) === target) return question;
    if (!different) different = question;
  }
  return different ?? last ?? generateQuestion(skill.id, rng, options);
}

export function introContent(
  grade: number,
  example: {
    summary: string;
    examplePrompt: string;
    exampleSteps: string[];
    exampleAnswer: string;
  },
): { style: SkillIntro["style"]; beats: IntroBeat[] } {
  const style = introStyle(grade);
  const summary = example.summary.trim();
  const beats: IntroBeat[] = [];
  if (summary) beats.push({ caption: summary });
  if (example.examplePrompt) {
    beats.push({
      caption: "Here is one example.",
      prompt: example.examplePrompt,
      steps: example.exampleSteps,
      answer: example.exampleAnswer,
    });
  }
  return { style, beats };
}

const SKIP_CAPTION = new Set(["Here is one example.", "Follow the steps.", INTRO_PLACEHOLDER]);

/** Kid-facing intro copy. Null means practice should start on the question. */
export function introCardModel(
  intro: SkillIntro,
  livePrompt: string,
): {
  sentences: string[];
  example: { prompt: string; steps: string[]; answer: string } | null;
} | null {
  const sentences: string[] = [];
  for (const beat of intro.beats) {
    const line = beat.caption?.trim() ?? "";
    if (!line || SKIP_CAPTION.has(line) || /coming soon/i.test(line)) continue;
    if (sentences.includes(line)) continue;
    sentences.push(line);
    if (sentences.length === 2) break;
  }
  if (sentences.length === 0) return null;
  const beat = intro.beats.find((item) => item.prompt && item.prompt !== livePrompt);
  const example =
    beat?.prompt && beat.answer
      ? { prompt: beat.prompt, steps: beat.steps ?? [], answer: beat.answer }
      : null;
  return { sentences, example };
}

export function buildSkillIntro(skill: Skill, cycle: SkillIntro["cycle"]): SkillIntro {
  const content = introContent(skill.grade, skill);
  return {
    skillId: skill.id,
    cycle,
    seconds: INTRO_SECONDS,
    style: content.style,
    placeholder: INTRO_PLACEHOLDER,
    asset: null,
    beats: content.beats,
  };
}
