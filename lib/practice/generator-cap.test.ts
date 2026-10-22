import { describe, expect, it } from "vitest";
import { practiceChoices } from "@/lib/practice/choices";
import { buildWorkedExample } from "@/lib/practice/example";
import {
  QUESTION_DRAW_LIMIT,
  QuestionDrawLimitError,
  generateQuestion,
  settleGenerated,
  withDrawBudget,
} from "@/lib/practice/generate";
import { planNextQuestion } from "@/lib/practice/learning";
import { emptyCard, recordAttempt, type SkillCard } from "@/lib/practice/scheduler";
import { SKILLS } from "@/lib/practice/skills";
import { sessionStreak } from "@/lib/practice/streak";
import { questionsFromSkill } from "@/lib/worksheets/build";

function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function counting(rng: () => number, ceiling: number): { rng: () => number; calls: () => number } {
  let calls = 0;
  return {
    rng: () => {
      calls += 1;
      if (calls > ceiling) throw new Error(`rng budget exceeded at ${calls}`);
      return rng();
    },
    calls: () => calls,
  };
}

describe("generator draw caps", () => {
  it("stops a generator that keeps drawing and uses the textbook example", () => {
    const rng = withDrawBudget(() => 0, 4);
    expect(() => {
      for (;;) rng();
    }).toThrow(QuestionDrawLimitError);

    let draws = 0;
    const result = settleGenerated(
      (bounded) => {
        for (;;) {
          draws += 1;
          bounded();
        }
      },
      () => 0,
      "textbook",
      8,
    );
    expect(result).toBe("textbook");
    expect(draws).toBe(9);
    expect(() =>
      settleGenerated(() => {
        throw new Error("boom");
      }, Math.random, "textbook"),
    ).toThrow("boom");
  });

  it("finishes every skill when the random source is stuck or not a number", () => {
    const sources = [() => 0, () => 0.5, () => 0.999999, () => Number.NaN];
    const started = Date.now();
    for (const skill of SKILLS) {
      for (const small of [false, true]) {
        for (const source of sources) {
          const counted = counting(source, QUESTION_DRAW_LIMIT + 1);
          const question = generateQuestion(skill.id, counted.rng, { small });
          expect(counted.calls()).toBeLessThanOrEqual(QUESTION_DRAW_LIMIT);
          expect(question.prompt.length).toBeGreaterThan(0);
          expect(question.answer.length).toBeGreaterThan(0);
          expect(question.steps.length).toBeGreaterThan(0);
        }
      }
    }
    expect(Date.now() - started).toBeLessThan(5_000);
  });

  it("orders three different numbers without spinning when every draw is the same", () => {
    for (const source of [() => 0, () => 0.5, () => 0.999999, () => Number.NaN]) {
      for (const small of [false, true]) {
        const counted = counting(source, 40);
        const question = generateQuestion("g2-compare", counted.rng, { small });
        const numbers = question.prompt.match(/\d+/g)?.map(Number) ?? [];
        expect(counted.calls()).toBeLessThanOrEqual(16);
        expect(new Set(numbers).size).toBe(3);
        expect(question.answer).toBe(String(Math.max(...numbers)));
      }
    }
  });

  it("builds grade 1 sittings that include equal sharing inside a draw budget", () => {
    const started = Date.now();
    let shared = 0;
    for (let seed = 0; seed < 40; seed += 1) {
      const rng = mulberry32(seed);
      let cards: SkillCard[] = [];
      for (let index = 0; index < 10; index += 1) {
        const forceShare = index === seed % 10;
        const plan = planNextQuestion({
          grade: 1,
          cards,
          sessionCount: index,
          today: "2026-10-20",
          requestedSkillId: forceShare ? "g1-share" : undefined,
          explicit: forceShare && seed % 2 === 0,
          coachSmall: forceShare && seed % 2 === 1,
        });
        if (plan.skillId === "g1-share") shared += 1;
        const counted = counting(rng, QUESTION_DRAW_LIMIT);
        const question = generateQuestion(plan.skillId, counted.rng, { small: plan.small });
        expect(counted.calls()).toBeLessThanOrEqual(32);
        expect(question.answer.length).toBeGreaterThan(0);
        if (plan.skillId === "g1-share") {
          const choices = practiceChoices(1, question.prompt, question.answer, `share-${seed}-${index}`);
          expect(choices).toContain(question.answer);
          expect(new Set(choices).size).toBe(choices?.length);
          const example = buildWorkedExample({
            skillId: "g1-share",
            livePrompt: question.prompt,
            small: plan.small,
          });
          if (example) {
            expect(example.prompt).not.toBe(question.prompt);
            expect(example.answer.length).toBeGreaterThan(0);
          }
        }
        const card = cards.find((item) => item.skillId === plan.skillId) ?? emptyCard(plan.skillId);
        cards = cards
          .filter((item) => item.skillId !== plan.skillId)
          .concat(recordAttempt(card, seed % 3 !== 0));
      }
    }
    expect(shared).toBe(40);
    expect(Date.now() - started).toBeLessThan(5_000);
  });

  it("gives tiles for equal-sharing answers of 1, 2, and 3", () => {
    const prompt = "Share 6 stickers equally among 3 children. How many stickers does each child get?";
    for (const answer of ["1", "2", "3"]) {
      const choices = practiceChoices(1, prompt, answer, `answer-${answer}`);
      expect(choices).toEqual(expect.arrayContaining([answer]));
      expect(choices).toHaveLength(3);
      expect(new Set(choices).size).toBe(3);
    }
  });

  it("stops asking for another easy sharing question once the prompts repeat", () => {
    const started = Date.now();
    const items = questionsFromSkill("g1-share", "easy", 10, () => 0);
    expect(items).toHaveLength(1);
    expect(items[0]?.prompt).toContain("Share");
    expect(questionsFromSkill("g1-share", "easy", Number.POSITIVE_INFINITY, () => 0.5)).toEqual([]);
    expect(Date.now() - started).toBeLessThan(1_000);
  });

  it("stops a streak walk when the calendar day does not move", () => {
    expect(sessionStreak(["not-a-date"], "not-a-date")).toEqual({
      days: 1,
      includesToday: true,
      milestone: null,
    });
    expect(sessionStreak(["2026-10-20", "2026-10-19", "2026-10-18"], "2026-10-20").days).toBe(3);
  });
});
