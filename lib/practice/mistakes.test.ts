import { describe, expect, it } from "vitest";
import { classifyMistake, noteMistake } from "@/lib/practice/mistakes";
import { emptyCard } from "@/lib/practice/scheduler";
import { packStoredAnswer, unpackStoredAnswer } from "@/lib/practice/stored-answer";

describe("mistake notes", () => {
  it("names an off-by-one and a missing remainder", () => {
    expect(classifyMistake("4 + 3 = ?", "7", "6").type).toBe("off-by-one");
    expect(classifyMistake("8 ÷ 3 = ?", "2 R 2", "2").note).toMatch(/remainder/i);
  });

  it("counts repeated mistakes without dropping the fsrs payload", () => {
    const card = { ...emptyCard("g1-add-10"), fsrs: { due: "later" } };
    const first = noteMistake(card, "off-by-one");
    expect(first.count).toBe(1);
    expect(first.card.fsrs).toEqual({ mistakes: { "off-by-one": 1 }, fsrs: { due: "later" } });

    const second = noteMistake(first.card, "off-by-one");
    expect(second.count).toBe(2);
    expect(second.card.fsrs).toEqual({ mistakes: { "off-by-one": 2 }, fsrs: { due: "later" } });
  });
});

describe("stored answers", () => {
  it("packs steps with the answer and still reads a plain answer", () => {
    const packed = packStoredAnswer("7", ["Start at 4.", "4 + 3 = 7."]);
    expect(unpackStoredAnswer(packed)).toEqual({
      answer: "7",
      steps: ["Start at 4.", "4 + 3 = 7."],
    });
    expect(unpackStoredAnswer("7")).toEqual({ answer: "7", steps: [] });
  });
});
