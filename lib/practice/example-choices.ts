import { answersMatch } from "@/lib/practice/answers";
import { practiceChoices } from "@/lib/practice/choices";
import type { WorkedExample } from "@/lib/practice/example";

const NUMBER_TOKEN = /\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?(?:\s*\/\s*\d+)?/g;

/** Numbers a child can see in the example: the prompt, the steps, the answer, and place-chart digits. */
export function numbersInExample(example: WorkedExample): string[] {
  const text = [example.prompt, example.answer, ...example.steps].join(" ");
  const tokens: string[] = text.match(NUMBER_TOKEN) ?? [];
  for (const visual of example.visuals ?? []) {
    if (visual?.kind === "place-chart") tokens.push(...visual.digits);
  }
  return tokens;
}

export function exampleOverlapsChoices(example: WorkedExample, choices: readonly string[]): boolean {
  const tokens = numbersInExample(example);
  return choices.some((choice) => tokens.some((token) => answersMatch(choice, token)));
}

/**
 * Prefer examples whose numbers are not already sitting on the answer tiles.
 * When every usable example collides, rebuild the distractors and keep the live answer.
 */
export function alignExamplesWithChoices(input: {
  pool: readonly WorkedExample[];
  choices: string[] | null;
  grade: number;
  prompt: string;
  answer: string;
  seed: string;
}): { examples: WorkedExample[]; choices: string[] | null } {
  const pool = input.pool.filter(
    (example) => !answersMatch(example.answer, input.answer) && !exampleOverlapsChoices(example, [input.answer]),
  );
  const choices = input.choices;
  if (!choices || choices.length < 2) return { examples: pool, choices };

  const safe = pool.filter((example) => !exampleOverlapsChoices(example, choices));
  if (safe.length >= 2) return { examples: safe, choices };
  if (choicesStayWithTheQuestion(input.prompt)) {
    return { examples: safe.length > 0 ? safe : pool, choices };
  }

  for (const kept of exampleSubsets(pool)) {
    const rebuilt = practiceChoices(input.grade, input.prompt, input.answer, input.seed, blockedNumbers(kept, input.answer));
    if (!rebuilt || !rebuilt.some((choice) => answersMatch(choice, input.answer))) continue;
    if (kept.every((example) => !exampleOverlapsChoices(example, rebuilt))) {
      return { examples: kept, choices: rebuilt };
    }
  }
  return { examples: safe.length > 0 ? safe : pool, choices };
}

function choicesStayWithTheQuestion(prompt: string): boolean {
  return /which number is (?:greater|smaller|greatest|least)/i.test(prompt) || /even or odd/i.test(prompt);
}

function blockedNumbers(examples: readonly WorkedExample[], answer: string): string[] {
  const blocked: string[] = [];
  for (const example of examples) {
    for (const token of numbersInExample(example)) {
      if (answersMatch(token, answer)) continue;
      if (blocked.some((item) => answersMatch(item, token))) continue;
      blocked.push(token);
    }
  }
  return blocked;
}

function exampleSubsets(pool: readonly WorkedExample[]): WorkedExample[][] {
  const sets: WorkedExample[][] = [];
  if (pool.length >= 3) sets.push([...pool]);
  if (pool.length < 2) return sets;
  for (let start = 0; start < pool.length; start += 1) {
    for (let end = start + 1; end < pool.length; end += 1) {
      const left = pool[start];
      const right = pool[end];
      if (left && right) sets.push([left, right]);
    }
  }
  return sets;
}
