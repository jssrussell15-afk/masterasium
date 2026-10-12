import { describe, expect, it } from "vitest";
import { answersMatch } from "@/lib/practice/answers";
import { generateQuestion } from "@/lib/practice/generate";
import { SKILLS } from "@/lib/practice/skills";

function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function numberInPrompt(prompt: string): number[] {
  return prompt.match(/\d+/g)?.map(Number) ?? [];
}

describe("question generators", () => {
  it("builds a checkable question for every starter skill", () => {
    for (const skill of SKILLS) {
      const rng = mulberry32(skill.order * 17);
      for (let i = 0; i < 40; i += 1) {
        const question = generateQuestion(skill.id, rng);
        expect(question.skillId).toBe(skill.id);
        expect(question.prompt.length).toBeGreaterThan(0);
        expect(answersMatch(question.answer, question.answer)).toBe(true);
      }
    }
  });

  it("keeps Grade 1 addition and subtraction inside the skill limits", () => {
    const rng = mulberry32(4);
    for (let i = 0; i < 50; i += 1) {
      const within10 = generateQuestion("g1-add-within-10", rng);
      const [left, right] = numberInPrompt(within10.prompt);
      expect(left + right).toBeLessThanOrEqual(10);
      expect(Number(within10.answer)).toBe(left + right);

      const within20 = generateQuestion("g1-add-within-20", rng);
      const [a, b] = numberInPrompt(within20.prompt);
      expect(a + b).toBeLessThanOrEqual(20);

      const subtraction = generateQuestion("g1-sub-within-10", rng);
      const [start, take] = numberInPrompt(subtraction.prompt);
      expect(start).toBeLessThanOrEqual(10);
      expect(take).toBeLessThanOrEqual(start);
      expect(Number(subtraction.answer)).toBeGreaterThanOrEqual(0);
    }
  });

  it("asks for a place value, not an ambiguous digit", () => {
    const question = generateQuestion("g5-place-value", mulberry32(9));
    expect(question.prompt).toContain("place");
    expect(Number(question.answer)).toBeGreaterThanOrEqual(0);
  });
});
