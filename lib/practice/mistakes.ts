import { normalizeAnswer } from "@/lib/practice/answers";
import { readMemory, writeMemory } from "@/lib/practice/memory";
import type { SkillCard } from "@/lib/practice/scheduler";

export type MistakeNote = {
  type: string;
  note: string;
};

function parseLoose(value: string): number | null {
  const cleaned = normalizeAnswer(value).replaceAll("−", "-").replace(/^\$/, "");
  if (!cleaned || cleaned.includes("r")) return null;
  if (cleaned.includes("/")) {
    const [left, right] = cleaned.split("/");
    const numerator = Number(left);
    const denominator = Number(right);
    if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator === 0) return null;
    return numerator / denominator;
  }
  const number = Number(cleaned);
  return Number.isFinite(number) ? number : null;
}

function numbersIn(prompt: string): number[] {
  return (prompt.match(/-?\d+(?:\.\d+)?/g) ?? [])
    .map(Number)
    .filter((value) => Number.isFinite(value));
}

export function classifyMistake(prompt: string, expected: string, given: string): MistakeNote {
  const expectedRemainder = expected.match(/(\d+)\s*r\s*(\d+)/i);
  const givenRemainder = given.match(/(\d+)\s*r\s*(\d+)/i);
  if (expectedRemainder && !givenRemainder) {
    return {
      type: "remainder",
      note: "This division has a remainder. Write the quotient, then R, then the remainder.",
    };
  }
  if (expectedRemainder && givenRemainder && (expectedRemainder[1] !== givenRemainder[1] || expectedRemainder[2] !== givenRemainder[2])) {
    return {
      type: "remainder",
      note: "Check the leftover. The remainder must be smaller than the divisor.",
    };
  }
  if (expected.includes("/") && !given.includes("/")) {
    return {
      type: "fraction-form",
      note: "This answer is a fraction. Write it with a slash, such as 3/4.",
    };
  }

  const expectedNumber = parseLoose(expected);
  const givenNumber = parseLoose(given);
  if (expectedNumber == null || givenNumber == null) {
    return {
      type: "format",
      note: "Write the answer in the form the question asks for, with no extra words.",
    };
  }
  if (expectedNumber !== 0 && givenNumber === -expectedNumber) {
    return {
      type: "sign",
      note: "The sign is reversed. Check whether the result is positive or negative.",
    };
  }
  if (Math.abs(givenNumber - expectedNumber) === 1) {
    return {
      type: "off-by-one",
      note: "That answer is off by 1. Recount the last step.",
    };
  }

  const [left, right] = numbersIn(prompt);
  if (left != null && right != null) {
    if (givenNumber === left + right && expectedNumber !== left + right) {
      return {
        type: "added",
        note: "The numbers were added. This question uses a different operation.",
      };
    }
    if (givenNumber === left - right && expectedNumber !== left - right) {
      return {
        type: "subtracted",
        note: "The numbers were subtracted in the order they appear. Check the operation.",
      };
    }
    if (givenNumber === left * right && expectedNumber !== left * right) {
      return {
        type: "multiplied",
        note: "The numbers were multiplied. This question asks for a different operation.",
      };
    }
    if (right !== 0 && givenNumber === left / right && expectedNumber !== left / right) {
      return {
        type: "divided",
        note: "The numbers were divided. Check whether the question asks you to divide.",
      };
    }
  }

  return {
    type: "calculation",
    note: "The steps do not come out to that answer. Redo one step at a time.",
  };
}

/**
 * Mistake counts live beside the scheduler payload as `{ mistakes, fsrs, learn? }`.
 * A plain object from before that wrap is treated as the payload.
 * `learn` and any other wrapper keys already stored are kept.
 */
export function noteMistake(card: SkillCard, type: string): { card: SkillCard; count: number } {
  const memory = readMemory(card.fsrs);
  const mistakes = { ...memory.mistakes };
  const count = (mistakes[type] ?? 0) + 1;
  mistakes[type] = count;
  return {
    count,
    card: {
      ...card,
      fsrs: writeMemory(card.fsrs, { mistakes }),
    },
  };
}
