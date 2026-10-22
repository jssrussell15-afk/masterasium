import { generateQuestion } from "@/lib/practice/generate";
import { skillById } from "@/lib/practice/skills";
import { hardenPrompt, splitPrompts } from "@/lib/worksheets/similar";
import type { Difficulty, PracticeItem, WorkedExample } from "@/lib/worksheets/types";

function skillExample(skillId: string | null): WorkedExample | null {
  if (!skillId) return null;
  const skill = skillById(skillId);
  if (!skill) return null;
  return {
    prompt: skill.examplePrompt,
    steps: skill.exampleSteps,
    answer: skill.exampleAnswer,
  };
}

export function questionsFromSkill(
  skillId: string,
  difficulty: Difficulty,
  count: number,
  rng: () => number = Math.random,
): PracticeItem[] {
  const example = skillExample(skillId);
  const items: PracticeItem[] = [];
  const seen = new Set<string>();
  const wanted = Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 0;
  // The easy pool for some skills is only a handful of prompts. Stop retrying
  // once those repeats are exhausted, even if the caller asked for more.
  const guardLimit = Math.min(wanted * 10, 200);
  let guard = 0;
  while (items.length < wanted && guard < guardLimit) {
    guard += 1;
    const question = generateQuestion(skillId, rng, { small: difficulty === "easy" });
    const harder = difficulty === "harder" ? hardenPrompt(question.prompt, "harder", rng) : null;
    const item: PracticeItem = harder
      ? { ...harder, skillId, example }
      : {
          prompt: question.prompt,
          answer: question.answer,
          steps: question.steps,
          skillId,
          example,
        };
    if (seen.has(item.prompt)) continue;
    seen.add(item.prompt);
    items.push(item);
  }
  return items;
}

export function questionsFromUpload(
  text: string,
  difficulty: Difficulty,
  count: number,
  skillId: string | null,
  rng: () => number = Math.random,
): { items: PracticeItem[]; note: string | null } {
  const example = skillExample(skillId);
  const items: PracticeItem[] = [];
  const seen = new Set<string>();
  for (const prompt of splitPrompts(text)) {
    if (items.length >= count) break;
    const built = hardenPrompt(prompt, difficulty, rng);
    if (!built || seen.has(built.prompt)) continue;
    seen.add(built.prompt);
    items.push({ ...built, example });
  }

  const parsed = items.length;
  if (skillId && items.length < count) {
    for (const extra of questionsFromSkill(skillId, difficulty === "easy" ? "steady" : difficulty, count, rng)) {
      if (items.length >= count) break;
      if (seen.has(extra.prompt)) continue;
      seen.add(extra.prompt);
      items.push(extra);
    }
  }

  if (parsed === 0 && items.length > 0) {
    return {
      items,
      note: "The file did not contain questions that could be rewritten, so this set uses the topic you chose.",
    };
  }
  if (parsed > 0 && parsed < items.length) {
    return {
      items,
      note: "Some uploaded lines were rewritten into similar, slightly harder questions. The rest come from the topic you chose.",
    };
  }
  if (parsed > 0) {
    return { items, note: null };
  }
  return { items: [], note: null };
}
