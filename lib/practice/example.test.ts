import { describe, expect, it } from "vitest";
import { buildWorkedExample, exampleIsCorrect } from "@/lib/practice/example";
import { generateQuestion } from "@/lib/practice/generate";
import { SKILLS } from "@/lib/practice/skills";

function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

describe("worked examples", () => {
  it("rejects an example whose arithmetic does not match", () => {
    expect(
      exampleIsCorrect({
        prompt: "2 + 2 = ?",
        answer: "5",
        steps: ["2 + 2 = 5."],
      }),
    ).toBe(false);
    expect(
      exampleIsCorrect({
        prompt: "4 + 3 = ?",
        answer: "7",
        steps: ["Start at 4 and count on 3.", "4 + 3 = 7."],
      }),
    ).toBe(true);
  });

  it("builds a deterministic example with different numbers for each skill that can", () => {
    const hidden: string[] = [];
    for (const skill of SKILLS) {
      const live = generateQuestion(skill.id, mulberry32(skill.order * 19 + skill.grade));
      const example = buildWorkedExample({ skillId: skill.id, livePrompt: live.prompt });
      const again = buildWorkedExample({ skillId: skill.id, livePrompt: live.prompt });
      expect(again).toEqual(example);
      if (!example) {
        hidden.push(skill.id);
        continue;
      }
      expect(example.prompt).not.toBe(live.prompt);
      expect(example.steps.length).toBeGreaterThan(0);
      expect(exampleIsCorrect(example)).toBe(true);
      const liveNumbers = live.prompt.match(/\d+(?:\.\d+)?/g)?.join(",") ?? "";
      const exampleNumbers = example.prompt.match(/\d+(?:\.\d+)?/g)?.join(",") ?? "";
      if (liveNumbers) expect(exampleNumbers).not.toBe(liveNumbers);
    }
    expect(hidden).not.toContain("g1-add-10");
    expect(hidden).not.toContain("g1-sub-10");
    expect(hidden).not.toContain("g3-mult");
  });
});
