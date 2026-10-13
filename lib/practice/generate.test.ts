import { describe, expect, it } from "vitest";
import { answersMatch } from "@/lib/practice/answers";
import { generateQuestion } from "@/lib/practice/generate";
import { SKILLS, skillsForGrade } from "@/lib/practice/skills";

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
  it("has eight skills in each grade and unique ids", () => {
    expect(SKILLS).toHaveLength(64);
    expect(new Set(SKILLS.map((skill) => skill.id)).size).toBe(64);
    for (const grade of [1, 2, 3, 4, 5, 6, 7, 8] as const) {
      const skills = skillsForGrade(grade);
      expect(skills).toHaveLength(8);
      expect(skills[0]?.prerequisites).toEqual([]);
      for (let index = 1; index < skills.length; index += 1) {
        expect(skills[index]?.prerequisites).toEqual([skills[index - 1]?.id]);
      }
    }
  });

  it("builds a checkable question with steps for every skill", () => {
    for (const skill of SKILLS) {
      expect(skill.summary.length).toBeGreaterThan(20);
      expect(skill.examplePrompt.length).toBeGreaterThan(0);
      expect(skill.exampleSteps.length).toBeGreaterThan(0);
      expect(skill.exampleAnswer.length).toBeGreaterThan(0);
      const rng = mulberry32(skill.order * 17 + skill.grade);
      for (let i = 0; i < 15; i += 1) {
        const question = generateQuestion(skill.id, rng);
        expect(question.skillId).toBe(skill.id);
        expect(question.prompt.length).toBeGreaterThan(0);
        expect(question.steps.length).toBeGreaterThan(0);
        expect(question.answer.length).toBeGreaterThan(0);
        expect(answersMatch(question.answer, question.answer)).toBe(true);
      }
      const small = generateQuestion(skill.id, rng, { small: true });
      expect(small.steps.length).toBeGreaterThan(0);
      expect(answersMatch(small.answer, small.answer)).toBe(true);
    }
  });

  it("keeps Grade 1 addition and subtraction inside the skill limits", () => {
    const rng = mulberry32(4);
    for (let i = 0; i < 50; i += 1) {
      const within10 = generateQuestion("g1-add-10", rng);
      const [left, right] = numberInPrompt(within10.prompt);
      expect(left + right).toBeLessThanOrEqual(10);
      expect(Number(within10.answer)).toBe(left + right);

      const subtraction = generateQuestion("g1-sub-10", rng);
      const [start, take] = numberInPrompt(subtraction.prompt);
      expect(start).toBeLessThanOrEqual(10);
      expect(take).toBeLessThanOrEqual(start);
      expect(Number(subtraction.answer)).toBeGreaterThanOrEqual(0);
    }
  });

  it("asks for a place value, not an ambiguous digit", () => {
    const question = generateQuestion("g5-place", mulberry32(9));
    expect(question.prompt.toLowerCase()).toContain("value");
    expect(Number(question.answer)).toBeGreaterThanOrEqual(0);
    expect(question.steps.length).toBeGreaterThan(0);
  });
});
