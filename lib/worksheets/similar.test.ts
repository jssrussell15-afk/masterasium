import { describe, expect, it } from "vitest";
import { questionsFromSkill, questionsFromUpload } from "@/lib/worksheets/build";
import { hardenPrompt, splitPrompts } from "@/lib/worksheets/similar";

const zero = () => 0;

describe("hardenPrompt", () => {
  it("rewrites addition with slightly larger numbers and a recomputed answer", () => {
    const item = hardenPrompt("4 + 3 = ?", "easy", zero);
    expect(item?.prompt).toBe("5 + 4 = ?");
    expect(item?.answer).toBe("9");
  });

  it("rewrites subtraction, multiplication, division, and percent", () => {
    expect(hardenPrompt("9 - 4 = ?", "easy", zero)).toMatchObject({
      prompt: "10 - 5 = ?",
      answer: "5",
    });
    expect(hardenPrompt("3 x 4", "easy", zero)).toMatchObject({
      prompt: "4 x 5",
      answer: "20",
    });
    expect(hardenPrompt("20 ÷ 4", "easy", zero)).toMatchObject({
      prompt: "24 ÷ 4",
      answer: "6",
    });
    expect(hardenPrompt("25% of 80", "easy", zero)).toMatchObject({
      prompt: "25% of 100",
      answer: "25",
    });
  });

  it("leaves a slash fraction alone", () => {
    expect(hardenPrompt("Shade 3/4 of the bar.", "steady", zero)).toBeNull();
  });

  it("splits a numbered list into prompts", () => {
    expect(splitPrompts("1. 4 + 3 = ?\n2) 8 - 2 = ?")).toEqual(["4 + 3 = ?", "8 - 2 = ?"]);
  });
});

describe("worksheet questions", () => {
  it("pulls the requested number of answered questions from a skill", () => {
    let n = 0;
    const rng = () => {
      n += 1;
      return ((n * 17) % 100) / 100;
    };
    const items = questionsFromSkill("g1-add-10", "steady", 4, rng);
    expect(items).toHaveLength(4);
    for (const item of items) {
      expect(item.answer.length).toBeGreaterThan(0);
      expect(item.steps.length).toBeGreaterThan(0);
      expect(item.skillId).toBe("g1-add-10");
    }
  });

  it("rewrites an uploaded worksheet and tops up from the chosen topic", () => {
    const rewritten = questionsFromUpload("1. 4 + 3 = ?\n2. 8 - 2 = ?", "easy", 2, null, zero);
    expect(rewritten.items[0]).toMatchObject({ prompt: "5 + 4 = ?", answer: "9" });
    expect(rewritten.items[1]).toMatchObject({ prompt: "9 - 3 = ?", answer: "6" });
    expect(rewritten.note).toBeNull();

    let n = 0;
    const rng = () => {
      n += 1;
      return ((n * 17) % 100) / 100;
    };
    const topped = questionsFromUpload("1. 4 + 3 = ?", "easy", 4, "g1-add-10", rng);
    expect(topped.items).toHaveLength(4);
    expect(topped.items.every((item) => item.answer.length > 0)).toBe(true);
    expect(topped.note).toMatch(/topic you chose/);
  });
});
