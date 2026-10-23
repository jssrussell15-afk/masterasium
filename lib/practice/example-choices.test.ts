import { describe, expect, it } from "vitest";
import { answersMatch } from "@/lib/practice/answers";
import { practiceChoices } from "@/lib/practice/choices";
import { alignExamplesWithChoices, exampleOverlapsChoices } from "@/lib/practice/example-choices";
import { workedExamplePool } from "@/lib/practice/example-pool";
import { takeNextExample } from "@/lib/practice/example-rotation";
import { generateQuestion } from "@/lib/practice/generate";
import { resolveInput } from "@/lib/practice/input-type";
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

describe("worked examples stay off the answer choices", () => {
  it("keeps counting distractors next to the answer", () => {
    for (let seed = 0; seed < 40; seed += 1) {
      const choices = practiceChoices(1, "What number comes just after 1?", "2", `count-${seed}`);
      expect(choices, `seed ${seed}`).toEqual(expect.arrayContaining(["2"]));
      expect(choices?.some((choice) => answersMatch(choice, "2"))).toBe(true);
      for (const choice of choices ?? []) {
        const number = Number(choice);
        expect(number, choice).toBeGreaterThanOrEqual(0);
        expect(number, choice).toBeLessThanOrEqual(20);
        expect(Math.abs(number - 2), choice).toBeLessThanOrEqual(2);
      }
      expect(choices).not.toContain("12");
    }
  });

  it.each([...skillsForGrade(1), ...skillsForGrade(5)].map((skill) => [skill.id, skill.grade] as const))(
    "%s never puts an example number on the choices",
    (skillId, grade) => {
      for (let seed = 1; seed <= 24; seed += 1) {
        const live = generateQuestion(skillId, mulberry32(seed * 17 + skillId.length));
        const resolved = resolveInput({
          grade,
          prompt: live.prompt,
          answer: live.answer,
          declared: live.inputType,
          choices: live.choices,
          seed: `${skillId}:${seed}`,
        });
        const pool = workedExamplePool({
          skillId,
          livePrompt: live.prompt,
          liveAnswer: live.answer,
        });
        const aligned = alignExamplesWithChoices({
          pool,
          choices: resolved.choices,
          grade,
          prompt: live.prompt,
          answer: live.answer,
          seed: `${skillId}:${seed}`,
        });
        expect(aligned.examples.length, `${live.prompt} seed ${seed}`).toBeGreaterThanOrEqual(2);

        let seen: string[] = [];
        const shown: string[] = [];
        for (let index = 0; index < aligned.examples.length; index += 1) {
          const next = takeNextExample(aligned.examples, seen);
          const key = next.example.key ?? next.example.prompt;
          expect(shown, live.prompt).not.toContain(key);
          shown.push(key);
          seen = next.seen;
          expect(answersMatch(next.example.answer, live.answer), next.example.prompt).toBe(false);
          if (grade <= 2) {
            const choices = aligned.choices ?? [];
            expect(choices.some((choice) => answersMatch(choice, live.answer)), live.prompt).toBe(true);
            expect(exampleOverlapsChoices(next.example, choices), `${live.prompt} :: ${next.example.prompt}`).toBe(false);
            if (skillId === "g1-count") {
              const answer = Number(live.answer);
              for (const choice of choices) {
                const number = Number(choice);
                expect(number).toBeGreaterThanOrEqual(0);
                expect(number).toBeLessThanOrEqual(20);
                expect(Math.abs(number - answer)).toBeLessThanOrEqual(3);
              }
            }
          } else {
            expect(aligned.choices, live.prompt).toBeNull();
          }
        }
        const again = takeNextExample(aligned.examples, seen);
        expect(aligned.examples.some((item) => (item.key ?? item.prompt) === (again.example.key ?? again.example.prompt))).toBe(
          true,
        );
      }
    },
  );
});
