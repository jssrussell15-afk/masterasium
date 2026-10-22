import { CATALOG, type Worked } from "@/lib/practice/bank";
import type { Question } from "@/lib/practice/types";
import { walkForSkill } from "@/lib/practice/walk";

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
