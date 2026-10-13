import { CATALOG } from "@/lib/practice/bank";
import type { Question } from "@/lib/practice/types";

const BLUEPRINTS = new Map(CATALOG.map((blueprint) => [blueprint.id, blueprint]));

export function generateQuestion(
  skillId: string,
  rng: () => number = Math.random,
  options?: { small?: boolean },
): Question {
  const blueprint = BLUEPRINTS.get(skillId);
  if (!blueprint) {
    throw new Error(`No question generator for skill ${skillId}.`);
  }
  const worked = blueprint.generate(rng, options?.small ?? false);
  return {
    skillId,
    prompt: worked.prompt,
    answer: worked.answer,
    steps: worked.steps,
    responseHint: blueprint.responseHint,
  };
}
