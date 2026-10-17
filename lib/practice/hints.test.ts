import { describe, expect, it } from "vitest";
import { hintLadder } from "@/lib/practice/hints";

describe("hint ladder", () => {
  it("keeps the live answer out of the bubbles", () => {
    const ladder = hintLadder({
      summary: "The answer is 7.",
      firstStep: "7",
      examplePrompt: "4 + 3 = ?",
      exampleAnswer: "7",
      expected: "7",
      prompt: "4 + 3 = ?",
    });
    expect(ladder.hint).not.toContain("7");
    expect(ladder.example).not.toContain("4 + 3");
    expect(ladder.example).not.toContain("7");
    expect(ladder.hint.length).toBeGreaterThan(0);
  });

  it("shows a different worked example when the question is not the same", () => {
    const ladder = hintLadder({
      summary: "Put the numbers together and count the total.",
      firstStep: "Start at 8 and count on 1.",
      examplePrompt: "4 + 3 = ?",
      exampleAnswer: "7",
      expected: "9",
      prompt: "8 + 1 = ?",
    });
    expect(ladder.hint).toBe("Start at 8 and count on 1.");
    expect(ladder.example).toContain("4 + 3 = ?");
    expect(ladder.example).toContain("7");
  });
});
