import type { WorkedExample } from "@/lib/worksheets/types";

const KNOWN_PATTERNS = new Set([
  "remainder",
  "fraction-form",
  "sign",
  "off-by-one",
  "added",
  "subtracted",
  "multiplied",
  "divided",
]);

const EXAMPLES: Record<string, WorkedExample> = {
  "off-by-one": {
    prompt: "6 + 2 = ?",
    steps: ["Start at 6 and count on 2.", "7, 8. The sum is 8, which is one more than 7."],
    answer: "8",
  },
  added: {
    prompt: "9 − 4 = ?",
    steps: ["This is subtraction, so count back 4 from 9.", "8, 7, 6, 5. The difference is 5."],
    answer: "5",
  },
  subtracted: {
    prompt: "3 × 4 = ?",
    steps: ["This is multiplication: 3 groups of 4.", "4 + 4 + 4 = 12."],
    answer: "12",
  },
  multiplied: {
    prompt: "12 ÷ 3 = ?",
    steps: ["Split 12 into 3 equal groups.", "12 ÷ 3 = 4."],
    answer: "4",
  },
  divided: {
    prompt: "5 + 4 = ?",
    steps: ["This question asks you to add.", "5 + 4 = 9."],
    answer: "9",
  },
  sign: {
    prompt: "−3 + 8 = ?",
    steps: ["Start at −3 and move 8 to the right.", "−3 + 8 = 5."],
    answer: "5",
  },
  remainder: {
    prompt: "14 ÷ 4 = ?",
    steps: ["4 × 3 = 12, and 14 − 12 = 2 left over.", "The remainder is smaller than 4, so the answer is 3 R 2."],
    answer: "3 R 2",
  },
  "fraction-form": {
    prompt: "2/6 + 1/6 = ?",
    steps: ["The denominators match, so add the numerators.", "2 + 1 = 3, so the sum is 3/6."],
    answer: "3/6",
  },
  format: {
    prompt: "Write 3 tenths as a decimal.",
    steps: ["3 tenths means 3 in the tenths place.", "That decimal is 0.3."],
    answer: "0.3",
  },
  calculation: {
    prompt: "7 + 5 = ?",
    steps: ["Start at 7 and count on 5.", "8, 9, 10, 11, 12. The sum is 12."],
    answer: "12",
  },
};

export function isKnownPattern(type: string): boolean {
  return KNOWN_PATTERNS.has(type);
}

/** A known pattern is taught immediately. Any pattern is taught again on the second similar miss. */
export function shouldTeach(type: string, count: number): boolean {
  return isKnownPattern(type) || count >= 2;
}

export function exampleForMistake(type: string, fallback: WorkedExample | null): WorkedExample | null {
  return EXAMPLES[type] ?? fallback;
}
