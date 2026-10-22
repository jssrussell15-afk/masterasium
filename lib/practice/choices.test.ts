import { describe, expect, it } from "vitest";
import { answersMatch, normalizeAnswer } from "@/lib/practice/answers";
import { CATALOG } from "@/lib/practice/bank";
import { practiceChoices } from "@/lib/practice/choices";
import { generateQuestion } from "@/lib/practice/generate";
import { resolveInput } from "@/lib/practice/input-type";
import { validateQuestion } from "@/lib/practice/validate-question";

function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

const TYPED = new Set(["text", "spelling"]);

describe("grade 1–2 choices", () => {
  it("uses the prompt numbers, place-value mistakes, and generator words", () => {
    expect(practiceChoices(2, "Which number is greatest: 69, 74, 38?", "74", "compare")?.slice().sort()).toEqual([
      "38",
      "69",
      "74",
    ]);
    expect(practiceChoices(1, "In 77, what is the value of the tens digit?", "70", "place")?.slice().sort()).toEqual([
      "7",
      "70",
      "77",
    ]);
    expect(practiceChoices(2, "Is 11 even or odd?", "odd", "even")?.slice().sort()).toEqual(["even", "odd"]);
    const fraction = practiceChoices(
      2,
      "A bar is split into 3 equal parts and 1 part is shaded. What fraction is shaded?",
      "1/3",
      "fraction",
    );
    expect(fraction).toContain("1/3");
    expect(fraction).toContain("2/3");
    expect(fraction?.some((choice) => !choice.endsWith("/3"))).toBe(true);
    expect(practiceChoices(1, "What number comes just after 0?", "0", "zero")?.every((choice) => !choice.startsWith("-"))).toBe(
      true,
    );
    expect(practiceChoices(3, "47 + 25 = ?", "72", "later")).toBeNull();
  });

  it.each(CATALOG.filter((blueprint) => blueprint.grade <= 2).map((blueprint) => [blueprint.id, blueprint.grade] as const))(
    "%s keeps one fair answer across 500 seeds",
    (skillId, grade) => {
      const positions = [0, 0, 0];
      let three = 0;
      for (let seed = 0; seed < 500; seed += 1) {
        const question = generateQuestion(skillId, mulberry32(seed * 7919 + grade), { small: seed % 2 === 0 });
        const resolved = resolveInput({
          grade,
          prompt: question.prompt,
          answer: question.answer,
          declared: question.inputType,
          choices: question.choices,
          seed: `q-${seed}`,
        });
        if (TYPED.has(resolved.inputType)) {
          expect(resolved.choices).toBeNull();
          continue;
        }
        const choices = resolved.choices ?? [];
        expect(resolved.inputType).toBe("choice");
        expect(choices.length).toBeGreaterThanOrEqual(2);
        expect(choices.length).toBeLessThanOrEqual(4);
        expect(new Set(choices.map((choice) => normalizeAnswer(choice))).size).toBe(choices.length);
        expect(choices.filter((choice) => answersMatch(question.answer, choice))).toHaveLength(1);
        expect(choices.every((choice) => !choice.startsWith("-"))).toBe(true);
        const verdict = validateQuestion({
          ...question,
          inputType: resolved.inputType,
          choices: resolved.choices,
          speak: question.speak,
        });
        expect(verdict.ok, question.prompt).toBe(true);
        if (choices.length === 3) {
          three += 1;
          const index = choices.findIndex((choice) => answersMatch(question.answer, choice));
          positions[index] = (positions[index] ?? 0) + 1;
        }
      }
      if (three >= 50) {
        for (const count of positions) {
          const share = count / three;
          expect(share).toBeGreaterThanOrEqual(0.2);
          expect(share).toBeLessThanOrEqual(0.45);
        }
        expect(positions[1]! / three).toBeLessThan(0.45);
      }
    },
  );
});
