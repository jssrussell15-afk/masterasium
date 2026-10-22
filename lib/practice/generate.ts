import { CATALOG, type Worked } from "@/lib/practice/bank";
import type { Question } from "@/lib/practice/types";
import { walkForSkill } from "@/lib/practice/walk";

const BLUEPRINTS = new Map(CATALOG.map((blueprint) => [blueprint.id, blueprint]));

/** Random draws one question may take. Past this, the textbook example is used. */
export const QUESTION_DRAW_LIMIT = 64;

/** Thrown when a generator keeps asking for random numbers past the draw limit. */
export class QuestionDrawLimitError extends Error {
  constructor() {
    super("Question generator exceeded its draw budget.");
    this.name = "QuestionDrawLimitError";
  }
}

/** Counts calls to `rng` and throws once the budget is spent. */
export function withDrawBudget(rng: () => number, limit = QUESTION_DRAW_LIMIT): () => number {
  let draws = 0;
  return () => {
    draws += 1;
    if (draws > limit) throw new QuestionDrawLimitError();
    return rng();
  };
}

export function settleGenerated<T>(
  generate: (rng: () => number) => T,
  rng: () => number,
  fallback: T,
  limit = QUESTION_DRAW_LIMIT,
): T {
  try {
    return generate(withDrawBudget(rng, limit));
  } catch (error) {
    if (error instanceof QuestionDrawLimitError) return fallback;
    throw error;
  }
}

export function generateQuestion(
  skillId: string,
  rng: () => number = Math.random,
  options?: { small?: boolean },
): Question {
  const blueprint = BLUEPRINTS.get(skillId);
  if (!blueprint) {
    throw new Error(`No question generator for skill ${skillId}.`);
  }
  const worked = settleGenerated(
    (bounded) => blueprint.generate(bounded, options?.small ?? false),
    rng,
    blueprint.example,
  );
  return questionFromWorked(skillId, worked, blueprint.responseHint);
}

/** The skill's checked example, used when a generated question cannot be shown. */
export function workedExampleQuestion(skillId: string): Question {
  const blueprint = BLUEPRINTS.get(skillId);
  if (!blueprint) {
    throw new Error(`No question generator for skill ${skillId}.`);
  }
  return questionFromWorked(skillId, blueprint.example, blueprint.responseHint);
}

function questionFromWorked(skillId: string, worked: Worked, responseHint: string | null): Question {
  return {
    skillId,
    prompt: worked.prompt,
    answer: worked.answer,
    steps: worked.steps,
    responseHint,
    walk: worked.walk ?? walkForSkill(skillId, worked.prompt, worked.answer),
    ...(worked.inputType ? { inputType: worked.inputType } : {}),
    ...(worked.choices ? { choices: worked.choices } : {}),
    ...(worked.speak ? { speak: worked.speak } : {}),
  };
}
