import { describe, expect, it } from "vitest";
import { exampleIsCorrect } from "@/lib/practice/example";
import { workedExamplePool } from "@/lib/practice/example-pool";
import { mentionsAnswer, takeNextExample } from "@/lib/practice/example-rotation";
import { generateQuestion } from "@/lib/practice/generate";
import { skillsForGrade } from "@/lib/practice/skills";

function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function numberKey(prompt: string): string {
  return (prompt.match(/\d+(?:\.\d+)?/g) ?? []).join(",");
}

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

const BRANCHES = [
  ["g1-count", "What number comes just after 14?", "15"],
  ["g1-count", "What number comes just before 14?", "13"],
  ["g1-add-10", "4 + 3 = ?", "7"],
  ["g1-sub-10", "8 − 3 = ?", "5"],
  ["g1-compare", "Which number is greater, 9 or 14?", "14"],
  ["g1-share", "Share 8 stickers equally among 2 children. How many stickers does each child get?", "4"],
  ["g1-place", "In 47, what is the value of the tens digit?", "40"],
  ["g1-place", "In 47, what is the value of the ones digit?", "7"],
  ["g1-patterns", "What comes next: 2, 4, 6, 8, ?", "10"],
  ["g1-measure", "A pencil is 6 paperclips long. A crayon is 4 paperclips long. How many paperclips longer is the pencil?", "2"],
  ["g5-mult", "8 × 12 = ?", "96"],
  ["g5-mult", "6 × 7 = ?", "42"],
  ["g5-div-rem", "29 ÷ 6 = ?", "4 R 5"],
  ["g5-frac", "3/8 + 2/8 = ?", "5/8"],
  ["g5-frac", "5/8 − 2/8 = ?", "3/8"],
  ["g5-place", "In 54,083, what is the value of the ten-thousands digit?", "50000"],
  ["g5-place", "In 54,083, what is the value of the ones digit?", "3"],
  ["g5-equations", "n + 7 = 15. What is n?", "8"],
  ["g5-decimals", "0.40 + 0.25 = ?", "0.65"],
  ["g5-decimals", "0.40 − 0.25 = ?", "0.15"],
  ["g5-area", "A triangle has base 8 cm and height 5 cm. What is its area in square centimetres?", "20"],
  ["g5-area", "A parallelogram has base 9 cm and height 4 cm. What is its area in square centimetres?", "36"],
  ["g5-volume", "A rectangular prism is 4 cm by 3 cm by 2 cm. What is its volume in cubic centimetres?", "24"],
] as const;

describe("grade 1 and 5 worked examples", () => {
  it("keeps at least two correct, different examples for every question type", () => {
    for (const [skillId, prompt, answer] of BRANCHES) {
      const grade = skillId.startsWith("g1-") ? 1 : 5;
      const pool = workedExamplePool({ skillId, livePrompt: prompt, liveAnswer: answer });
      expect(pool.length, skillId).toBeGreaterThanOrEqual(2);
      const keys = new Set<string>();
      for (const example of pool) {
        expect(example.prompt, skillId).not.toBe(prompt);
        expect(numberKey(example.prompt), skillId).not.toBe(numberKey(prompt));
        expect(exampleIsCorrect(example), `${skillId} ${example.prompt}`).toBe(true);
        expect(mentionsAnswer([example.prompt, example.answer, ...example.steps].join(" "), answer), example.prompt).toBe(false);
        expect(keys.has(example.key ?? example.prompt), example.prompt).toBe(false);
        keys.add(example.key ?? example.prompt);
        expect(example.visuals?.some(Boolean), skillId).toBe(true);
        for (const step of example.steps) {
          expect(step, step).toMatch(/^[A-Z]/);
          expect(step, step).toMatch(/[.!?]$/);
          expect(wordCount(step), step).toBeLessThanOrEqual(grade === 1 ? 14 : 18);
        }
      }
    }
  });

  it("rotates without repeating until every example has been shown", () => {
    const skills = [...skillsForGrade(1), ...skillsForGrade(5)];
    for (const skill of skills) {
      for (let seed = 1; seed <= 12; seed += 1) {
        const live = generateQuestion(skill.id, mulberry32(seed * 17 + skill.order));
        const pool = workedExamplePool({
          skillId: skill.id,
          livePrompt: live.prompt,
          liveAnswer: live.answer,
        });
        expect(pool.length, `${skill.id} seed ${seed}`).toBeGreaterThanOrEqual(2);
        let seen: string[] = [];
        const shown: string[] = [];
        for (let index = 0; index < pool.length; index += 1) {
          const next = takeNextExample(pool, seen);
          const key = next.example.key ?? next.example.prompt;
          expect(shown, skill.id).not.toContain(key);
          shown.push(key);
          seen = next.seen;
          expect(next.example.prompt).not.toBe(live.prompt);
          expect(exampleIsCorrect(next.example)).toBe(true);
        }
        const again = takeNextExample(pool, seen);
        expect(pool.some((item) => (item.key ?? item.prompt) === (again.example.key ?? again.example.prompt))).toBe(true);
      }
    }
  });

  it("uses the same multiplication method as the question on screen", () => {
    const split = workedExamplePool({ skillId: "g5-mult", livePrompt: "8 × 12 = ?", liveAnswer: "96" });
    expect(split.length).toBeGreaterThanOrEqual(2);
    for (const example of split) {
      expect(example.steps[0]).toMatch(/^Split /);
      expect(example.visuals?.[0]?.kind).toBe("area-split");
    }
    const tens = workedExamplePool({ skillId: "g5-mult", livePrompt: "10 × 6 = ?", liveAnswer: "60" });
    expect(tens.length).toBeGreaterThanOrEqual(2);
    for (const example of tens) {
      expect(example.steps[0]).toMatch(/groups of ten/);
    }
    const facts = workedExamplePool({ skillId: "g5-mult", livePrompt: "6 × 7 = ?", liveAnswer: "42" });
    expect(facts.length).toBeGreaterThanOrEqual(2);
    for (const example of facts) {
      expect(example.steps[0]).toMatch(/^Make /);
      expect(example.visuals?.[0]?.kind).toBe("array");
    }
  });

  it("names the denominator in every fraction example", () => {
    const prompts = [
      ["3/8 + 2/8 = ?", "5/8"],
      ["5/8 − 2/8 = ?", "3/8"],
      ["1/6 + 2/6 = ?", "3/6"],
      ["4/5 − 1/5 = ?", "3/5"],
    ] as const;
    for (const [prompt, answer] of prompts) {
      const pool = workedExamplePool({ skillId: "g5-frac", livePrompt: prompt, liveAnswer: answer });
      expect(pool.length).toBeGreaterThanOrEqual(2);
      for (const example of pool) {
        const denominator = example.prompt.match(/\/(\d+)/)?.[1];
        expect(denominator, example.prompt).toBeTruthy();
        expect(example.steps[0], example.prompt).toBe(`Both fractions are cut into ${denominator} equal parts.`);
        expect(example.steps.some((step) => step.includes(`${denominator}`)), example.steps.join(" ")).toBe(true);
      }
    }
    for (let seed = 1; seed <= 12; seed += 1) {
      const live = generateQuestion("g5-frac", mulberry32(seed * 17));
      const pool = workedExamplePool({
        skillId: "g5-frac",
        livePrompt: live.prompt,
        liveAnswer: live.answer,
      });
      for (const example of pool) {
        const denominator = example.prompt.match(/\/(\d+)/)?.[1];
        expect(example.steps[0]).toContain(`${denominator} equal parts`);
        expect(example.steps.join(" ")).not.toContain("same parts");
      }
    }
  });

  it("groups place values of 1,000 or more and still accepts a comparison", () => {
    const compare = workedExamplePool({
      skillId: "g1-compare",
      livePrompt: "Which number is greater, 9 or 14?",
      liveAnswer: "14",
    });
    expect(compare[0].steps[1]).toBe("On the line, 6 is farther right than 1.");
    expect(compare[0].steps[1]).toMatch(/^[A-Z]/);

    const place = workedExamplePool({
      skillId: "g5-place",
      livePrompt: "In 54,083, what is the value of the ten-thousands digit?",
      liveAnswer: "50000",
    });
    const steps = place[0].steps.join(" ");
    expect(steps).toContain("worth 10,000");
    expect(steps).not.toContain("10000");
    expect(mentionsAnswer(steps, "0")).toBe(false);
    expect(mentionsAnswer(steps, "10")).toBe(false);
    expect(mentionsAnswer("That is 1 ten-thousand, worth 10,000.", "10000")).toBe(true);
  });

  it("leaves other grades without this pool", () => {
    expect(workedExamplePool({ skillId: "g3-mult", livePrompt: "6 × 7 = ?", liveAnswer: "42" })).toEqual([]);
  });
});
