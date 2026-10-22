import { describe, expect, it } from "vitest";
import { validateQuestion } from "@/lib/practice/validate-question";

const prompt = "What is 6 + 2?";

describe("validateQuestion", () => {
  it("turns a choice question into a number when the answer is missing", () => {
    const result = validateQuestion({
      prompt,
      answer: "8",
      inputType: "choice",
      choices: ["6", "7", "9"],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.question.inputType).toBe("number");
    expect(result.question.choices).toBeNull();
    expect(result.repairs).toContain("Turned a broken choice question into a number.");
  });

  it("drops duplicate choices and keeps the question", () => {
    const result = validateQuestion({
      prompt,
      answer: "8",
      inputType: "choice",
      choices: ["8", "8", "7", "9"],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.question.inputType).toBe("choice");
    expect(result.question.choices).toEqual(["8", "7", "9"]);
    expect(result.repairs).toEqual(["Dropped duplicate choices."]);
  });

  it("repairs a single choice by asking for the number", () => {
    const result = validateQuestion({
      prompt,
      answer: "8",
      inputType: "choice",
      choices: ["8"],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.question.inputType).toBe("number");
    expect(result.question.choices).toBeNull();
    expect(result.repairs).toContain("Turned a broken choice question into a number.");
  });

  it("rejects a spelling word that is already in the prompt", () => {
    const result = validateQuestion({
      prompt: "Spell cat.",
      answer: "cat",
      inputType: "spelling",
      speak: "cat",
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reasons).toContain("A spelling answer cannot appear in the prompt.");
  });

  it("repairs duplicates that collapse to one tile", () => {
    const result = validateQuestion({
      prompt,
      answer: "8",
      inputType: "choice",
      choices: ["8", "8"],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.question.inputType).toBe("number");
    expect(result.repairs).toEqual([
      "Dropped duplicate choices.",
      "Turned a broken choice question into a number.",
    ]);
  });

  it("accepts a spelling word that is only spoken", () => {
    const result = validateQuestion({
      prompt: "Spell the word you hear.",
      answer: "kitten",
      inputType: "spelling",
      speak: "kitten",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.repairs).toEqual([]);
    expect(result.question.inputType).toBe("spelling");
  });
});
