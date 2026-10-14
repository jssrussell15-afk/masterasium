import { describe, expect, it } from "vitest";
import { answersMatch } from "@/lib/practice/answers";
import { answerShape, givenAnswer } from "@/lib/practice/parts";

describe("multi-part answers", () => {
  it("uses one field for an ordinary answer", () => {
    expect(answerShape("4 + 3 = ?", "7")).toEqual({ kind: "single" });
    expect(answerShape("What fraction is shaded?", "3/8")).toEqual({ kind: "single" });
    expect(givenAnswer("7", { answer: "7", remainder: "1" })).toBe("7");
  });

  it("asks for the quotient and the remainder, and grades both", () => {
    const shape = answerShape("17 ÷ 5 = ?", "3 R 2");
    expect(shape).toEqual({
      kind: "parts",
      id: "remainder",
      parts: [
        { name: "answer", label: "Answer", inputMode: "numeric" },
        { name: "remainder", label: "Remainder", inputMode: "numeric" },
      ],
    });

    const correct = givenAnswer("3 R 2", { answer: "3", remainder: "2" });
    expect(answersMatch("3 R 2", correct)).toBe(true);
    expect(answersMatch("3 R 2", givenAnswer("3 R 2", { answer: "03", remainder: "02" }))).toBe(true);
    expect(answersMatch("3 R 2", givenAnswer("3 R 2", { answer: "3", remainder: "" }))).toBe(false);
    expect(answersMatch("3 R 2", givenAnswer("3 R 2", { answer: "3", remainder: "1" }))).toBe(false);
    expect(answersMatch("3 R 2", givenAnswer("3 R 2", { answer: "", remainder: "2" }))).toBe(false);
  });
});
