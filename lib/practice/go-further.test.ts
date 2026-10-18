import { describe, expect, it } from "vitest";
import {
  DIGIT_PUZZLE_SUM,
  GO_FURTHER_SKILLS,
  GO_FURTHER_SIZE,
  buildGoFurtherSet,
  checkGoFurther,
  goFurtherOffered,
  parentGoFurtherLine,
  strategyMatches,
  wentFurtherLine,
  withGoFurtherTally,
  withinCoreRange,
  type GoFurtherQuestion,
  type GoFurtherResponse,
  type StrategyCard,
} from "@/lib/practice/go-further";
import { isMastered, type SkillCard } from "@/lib/practice/scheduler";

function card(attempted: number, correct: number, skillId = "g3-add-sub"): SkillCard {
  return { skillId, attempted, correct, streak: 0, fsrs: null };
}

function correctResponse(question: GoFurtherQuestion): GoFurtherResponse {
  if (question.kind === "compare") {
    const leftBigger = question.leftNum * question.rightDen > question.rightNum * question.leftDen;
    const reason = question.reasons.find((item) => item.right);
    if (!reason) throw new Error("missing reason");
    return { kind: "compare", side: leftBigger ? "left" : "right", reasonId: reason.id };
  }
  if (question.kind === "balance") return { kind: "balance", value: question.blank };
  if (question.kind === "true-false") {
    const reason = question.reasons.find((item) => item.right);
    if (!reason) throw new Error("missing reason");
    return { kind: "true-false", verdict: question.truth, reasonId: reason.id };
  }
  if (question.kind === "many-ways") {
    const valid = question.cards.filter((item) => strategyMatches(item.op, question.target));
    return { kind: "many-ways", cardIds: valid.slice(0, question.need).map((item) => item.id) };
  }
  if (question.kind === "bar") {
    return {
      kind: "bar",
      partA: question.partB,
      partB: question.partA,
      whole: question.whole,
      value: question.answer,
    };
  }
  return { kind: "pattern", value: question.answer };
}

function wrongResponse(question: GoFurtherQuestion): GoFurtherResponse {
  if (question.kind === "compare") {
    const right = question.reasons.find((item) => item.right);
    const wrong = question.reasons.find((item) => !item.right);
    if (!right || !wrong) throw new Error("reasons");
    const leftBigger = question.leftNum * question.rightDen > question.rightNum * question.leftDen;
    return { kind: "compare", side: leftBigger ? "left" : "right", reasonId: wrong.id };
  }
  if (question.kind === "balance") return { kind: "balance", value: `${question.blank}9` };
  if (question.kind === "true-false") {
    const wrong = question.reasons.find((item) => !item.right);
    if (!wrong) throw new Error("reasons");
    return { kind: "true-false", verdict: question.truth, reasonId: wrong.id };
  }
  if (question.kind === "many-ways") {
    const valid = question.cards.find((item) => strategyMatches(item.op, question.target));
    const invalid = question.cards.find((item) => !strategyMatches(item.op, question.target));
    if (!valid || !invalid) throw new Error("strategy mix");
    return { kind: "many-ways", cardIds: [valid.id, invalid.id] };
  }
  if (question.kind === "bar") {
    const distractor = question.chips.find((chip) => chip !== question.partA && chip !== question.partB && chip !== question.whole);
    return {
      kind: "bar",
      partA: question.partA,
      partB: question.partB,
      whole: distractor ?? question.partA,
      value: question.answer,
    };
  }
  return { kind: "pattern", value: question.answer === "1173" ? "1164" : `${question.answer}0` };
}

function hasToken(text: string, value: number): boolean {
  return new RegExp(`(^|\\D)${value}(\\D|$)`).test(text);
}

describe("go further", () => {
  it("appears only after the 10-question 80% bar, and only for the depth skills", () => {
    expect(goFurtherOffered("g3-add-sub", card(10, 8))).toBe(true);
    expect(goFurtherOffered("g3-add-sub", card(10, 7))).toBe(false);
    expect(goFurtherOffered("g3-add-sub", card(9, 9))).toBe(false);
    expect(goFurtherOffered("g3-time", card(10, 10, "g3-time"))).toBe(false);
    expect(isMastered(card(10, 8))).toBe(true);
  });

  it("checks each question type and leaves the skill card alone", () => {
    const mastered = card(10, 8);
    const before = { ...mastered };
    for (const skillId of GO_FURTHER_SKILLS) {
      for (let seed = 1; seed <= 12; seed += 1) {
        const set = buildGoFurtherSet(skillId, seed);
        expect(set).toHaveLength(GO_FURTHER_SIZE);
        expect(new Set(set.map((question) => question.kind))).toEqual(
          new Set(["compare", "balance", "true-false", "many-ways", "bar", "pattern"]),
        );
        const results: boolean[] = [];
        for (const question of set) {
          expect(question.skillId).toBe(skillId);
          expect(withinCoreRange(skillId, question.values)).toBe(true);
          expect(question.show.length).toBeGreaterThanOrEqual(3);
          expect(question.show.length).toBeLessThanOrEqual(4);
          for (const line of question.show) expect(line.split(/\s+/).filter(Boolean).length).toBeLessThanOrEqual(8);
          expect(question.hint.length).toBeGreaterThan(0);
          const good = checkGoFurther(question, correctResponse(question));
          const bad = checkGoFurther(question, wrongResponse(question));
          expect(good.correct, `${skillId} ${question.kind} seed ${seed}`).toBe(true);
          expect(bad.correct, `${skillId} ${question.kind} seed ${seed} miss`).toBe(false);
          results.push(good.correct);
          if (question.kind === "compare") {
            expect(question.leftNum * question.rightDen).not.toBe(question.rightNum * question.leftDen);
            const reason = question.reasons.find((item) => item.right);
            if (question.leftDen === 1 && question.rightDen === 1 && reason) {
              expect(hasToken(reason.text, question.leftNum)).toBe(false);
              expect(hasToken(reason.text, question.rightNum)).toBe(false);
            }
          }
          if (question.kind === "many-ways") {
            const valid = question.cards.filter((item: StrategyCard) => strategyMatches(item.op, question.target));
            expect(valid.length).toBeGreaterThanOrEqual(2);
            expect(question.cards.some((item) => !strategyMatches(item.op, question.target))).toBe(true);
          }
        }
        const packed = withGoFurtherTally(mastered, results);
        expect(packed.asked).toBe(GO_FURTHER_SIZE);
        expect(packed.correct).toBe(GO_FURTHER_SIZE);
        expect(packed.card).toBe(mastered);
      }
    }
    expect(mastered).toEqual(before);
    expect(isMastered(mastered)).toBe(true);
  });

  it("checks the digit puzzle by the biggest sum", () => {
    const puzzle = buildGoFurtherSet("g3-place", 1).find((question) => question.kind === "pattern");
    expect(puzzle && puzzle.kind === "pattern" ? puzzle.mode : "").toBe("digits");
    expect(checkGoFurther(puzzle!, { kind: "pattern", value: "1173" }).correct).toBe(true);
    expect(DIGIT_PUZZLE_SUM).toBe(biggestPairSum());
  });

  it("writes a quiet line for the child and one line for the parent", () => {
    expect(wentFurtherLine("g3-add-sub")).toBe("Went further on adding with regrouping");
    expect(wentFurtherLine("g3-time")).toBeNull();
    expect(parentGoFurtherLine(["g3-mult", "g3-add-sub", "g3-time"])).toBe(
      "Go further sets done: adding with regrouping, multiplication.",
    );
    expect(parentGoFurtherLine([])).toBeNull();
  });
});

function biggestPairSum(): number {
  const digits = [1, 2, 3, 4, 5, 6];
  let best = 0;
  const used = new Array<boolean>(7).fill(false);
  const pick = new Array<number>(6).fill(0);
  function walk(index: number) {
    if (index === 6) {
      const left = pick[0]! * 100 + pick[1]! * 10 + pick[2]!;
      const right = pick[3]! * 100 + pick[4]! * 10 + pick[5]!;
      best = Math.max(best, left + right);
      return;
    }
    for (const digit of digits) {
      if (used[digit]) continue;
      used[digit] = true;
      pick[index] = digit;
      walk(index + 1);
      used[digit] = false;
    }
  }
  walk(0);
  return best;
}
