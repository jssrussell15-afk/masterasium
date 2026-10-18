import type { Difficulty } from "@/lib/content/model";
import type { SkillSlug } from "@/lib/content/phase1/types";

export type PuzzleFamily = "pyramid" | "magic" | "digits" | "balance" | "next";

export type HandPuzzle = {
  id: string;
  title: string;
  family: PuzzleFamily;
  skillSlug: SkillSlug;
  skillLabel: string;
  topic: string;
  difficulty: Difficulty;
  prompt: string;
  answer: string;
  steps: string[];
  attention: string | null;
  /** Every distinct answer the search can find. */
  solve: () => string[];
};

function range(low: number, high: number): number[] {
  const values: number[] = [];
  for (let value = low; value <= high; value += 1) values.push(value);
  return values;
}

function permutations(digits: number[]): number[][] {
  if (digits.length === 0) return [[]];
  const found: number[][] = [];
  digits.forEach((digit, index) => {
    const rest = digits.filter((_value, restIndex) => restIndex !== index);
    for (const tail of permutations(rest)) found.push([digit, ...tail]);
  });
  return found;
}

const REGROUP = "Adding and subtracting with regrouping";
const PLACE = "Comparing numbers and place value";
const MULT = "Multiplication as equal groups";

export const HAND_PUZZLES: HandPuzzle[] = [
  {
    id: "pyramid-top",
    title: "Pyramid top",
    family: "pyramid",
    skillSlug: "g3-add-sub",
    skillLabel: REGROUP,
    topic: "Number pyramid",
    difficulty: 1,
    prompt: "Each block is the sum of the two blocks under it. The bottom row is 4, 7, and 2. What number goes on top?",
    answer: "20",
    steps: ["Middle: 11 and 9.", "Top: 11 + 9 = 20."],
    attention: null,
    solve: () => {
      const bottom = [4, 7, 2];
      const found = range(0, 80).filter((top) => {
        const midLeft = bottom[0]! + bottom[1]!;
        const midRight = bottom[1]! + bottom[2]!;
        return midLeft + midRight === top;
      });
      return found.map(String);
    },
  },
  {
    id: "pyramid-missing",
    title: "Missing pyramid brick",
    family: "pyramid",
    skillSlug: "g3-add-sub",
    skillLabel: REGROUP,
    topic: "Number pyramid",
    difficulty: 2,
    prompt:
      "Each block is the sum of the two blocks under it. The top is 20. The bottom left is 4 and the bottom middle is 7. The middle left is 11. What is the bottom right?",
    answer: "2",
    steps: ["Middle right is 20 − 11 = 9.", "9 − 7 = 2."],
    attention: null,
    solve: () => {
      return range(0, 30)
        .filter((right) => {
          const midLeft = 4 + 7;
          const midRight = 7 + right;
          return midLeft === 11 && midLeft + midRight === 20;
        })
        .map(String);
    },
  },
  {
    id: "magic-one",
    title: "Magic square cell",
    family: "magic",
    skillSlug: "g3-add-sub",
    skillLabel: REGROUP,
    topic: "Magic square",
    difficulty: 1,
    prompt: "In this magic square each row adds to 15. The middle row is 9, 5, and a blank. The blank is a digit from 1 to 9, and it is not 9 or 5. What is the blank?",
    answer: "1",
    steps: ["9 + 5 + blank = 15.", "The blank is 1."],
    attention: null,
    solve: () => {
      const used = new Set([2, 7, 6, 9, 5, 4, 3, 8]);
      return range(1, 9)
        .filter((digit) => !used.has(digit) && 9 + 5 + digit === 15)
        .map(String);
    },
  },
  {
    id: "magic-two",
    title: "Two magic blanks",
    family: "magic",
    skillSlug: "g3-add-sub",
    skillLabel: REGROUP,
    topic: "Magic square",
    difficulty: 3,
    prompt:
      "A magic square uses 1 to 9 once. Each row adds to 15. The rows are 2, 7, blank; then 9, 5, 1; then blank, 3, 8. What is the top-right number?",
    answer: "6",
    steps: ["2 + 7 + 6 = 15.", "4 + 3 + 8 = 15.", "The top right is 6."],
    attention: "The bottom-left cell is 4. The question asks only for the top right.",
    solve: () => {
      const used = new Set([2, 7, 9, 5, 1, 3, 8]);
      const free = range(1, 9).filter((digit) => !used.has(digit));
      const found: string[] = [];
      for (const topRight of free) {
        for (const bottomLeft of free) {
          if (topRight === bottomLeft) continue;
          const rows = [2 + 7 + topRight, 9 + 5 + 1, bottomLeft + 3 + 8];
          const cols = [2 + 9 + bottomLeft, 7 + 5 + 3, topRight + 1 + 8];
          const diags = [2 + 5 + 8, topRight + 5 + bottomLeft];
          if ([...rows, ...cols, ...diags].every((sum) => sum === 15)) found.push(String(topRight));
        }
      }
      return [...new Set(found)];
    },
  },
  {
    id: "digits-largest-sum",
    title: "Largest digit sum",
    family: "digits",
    skillSlug: "g3-place",
    skillLabel: PLACE,
    topic: "Digit placement",
    difficulty: 2,
    prompt: "Use 2, 5, and 8 once. Make a two-digit number plus a one-digit number. What is the largest sum you can make?",
    answer: "87",
    steps: ["85 + 2 = 87.", "82 + 5 = 87.", "The largest sum is 87."],
    attention: "Two placements tie at 87. The question asks for the sum, so the answer is still one number.",
    solve: () => {
      let best = -1;
      const sums = new Set<number>();
      for (const [a, b, c] of permutations([2, 5, 8])) {
        const sum = a! * 10 + b! + c!;
        sums.add(sum);
        if (sum > best) best = sum;
      }
      return [...sums].filter((sum) => sum === best).map(String);
    },
  },
  {
    id: "digits-equation",
    title: "One true equation",
    family: "digits",
    skillSlug: "g3-add-sub",
    skillLabel: REGROUP,
    topic: "Digit placement",
    difficulty: 1,
    prompt: "Use 1, 4, and 5 once to make a true addition equation. What number is on the right of the equals sign?",
    answer: "5",
    steps: ["1 + 4 = 5.", "4 + 1 = 5.", "The right side is 5."],
    attention: "The two addends can swap. The number on the right does not change.",
    solve: () => {
      const rights = new Set<number>();
      for (const [a, b, c] of permutations([1, 4, 5])) {
        if (a! + b! === c) rights.add(c!);
      }
      return [...rights].map(String);
    },
  },
  {
    id: "balance-add",
    title: "Balance the pans",
    family: "balance",
    skillSlug: "g3-add-sub",
    skillLabel: REGROUP,
    topic: "Balance",
    difficulty: 1,
    prompt: "The pans balance. Blank + 6 = 9 + 4. What number is the blank?",
    answer: "7",
    steps: ["9 + 4 = 13.", "13 − 6 = 7."],
    attention: null,
    solve: () => range(0, 40).filter((value) => value + 6 === 9 + 4).map(String),
  },
  {
    id: "balance-groups",
    title: "Groups on a pan",
    family: "balance",
    skillSlug: "g3-mult",
    skillLabel: MULT,
    topic: "Balance",
    difficulty: 2,
    prompt: "Two equal groups of the blank balance 8 + 6. What number is the blank?",
    answer: "7",
    steps: ["8 + 6 = 14.", "Two groups of 7 make 14."],
    attention: null,
    solve: () => range(0, 40).filter((value) => value * 2 === 8 + 6).map(String),
  },
  {
    id: "next-plus",
    title: "Count on by 3",
    family: "next",
    skillSlug: "g3-add-sub",
    skillLabel: REGROUP,
    topic: "What comes next",
    difficulty: 1,
    prompt: "14, 17, 20, 23. Each number is 3 more than the one before. What comes next?",
    answer: "26",
    steps: ["23 + 3 = 26."],
    attention: null,
    solve: () => range(0, 100).filter((value) => value === 23 + 3).map(String),
  },
  {
    id: "next-double",
    title: "Doubling pattern",
    family: "next",
    skillSlug: "g3-mult",
    skillLabel: MULT,
    topic: "What comes next",
    difficulty: 2,
    prompt: "2, 4, 8, 16. Each number is double the one before. What comes next?",
    answer: "32",
    steps: ["16 + 16 = 32."],
    attention: null,
    solve: () => range(0, 100).filter((value) => value === 16 * 2).map(String),
  },
  {
    id: "magic-row",
    title: "One row of a magic square",
    family: "magic",
    skillSlug: "g3-add-sub",
    skillLabel: REGROUP,
    topic: "Magic square",
    difficulty: 1,
    prompt: "A magic row adds to 15. The row is 8, 1, and a missing digit. The missing digit is not 8 or 1. What is it?",
    answer: "6",
    steps: ["8 + 1 = 9.", "15 − 9 = 6."],
    attention: null,
    solve: () => range(0, 9).filter((digit) => digit !== 8 && digit !== 1 && 8 + 1 + digit === 15).map(String),
  },
  {
    id: "digits-largest",
    title: "Largest two-digit number",
    family: "digits",
    skillSlug: "g3-place",
    skillLabel: PLACE,
    topic: "Digit placement",
    difficulty: 1,
    prompt: "Use the digits 3 and 6 once. What is the largest number you can make?",
    answer: "63",
    steps: ["63 is larger than 36."],
    attention: null,
    solve: () => {
      const made = permutations([3, 6]).map(([tens, ones]) => tens! * 10 + ones!);
      const best = Math.max(...made);
      return [...new Set(made.filter((value) => value === best))].map(String);
    },
  },
  {
    id: "balance-cat",
    title: "Cat and books",
    family: "balance",
    skillSlug: "g3-add-sub",
    skillLabel: REGROUP,
    topic: "Balance",
    difficulty: 2,
    prompt: "A cat and one book balance two books. One book is 3 kilograms. How many kilograms is the cat?",
    answer: "3",
    steps: ["A cat and a book match two books.", "The cat matches one book.", "The cat is 3 kilograms."],
    attention: null,
    solve: () => range(0, 20).filter((cat) => cat + 3 === 3 + 3).map(String),
  },
  {
    id: "next-squares",
    title: "Square numbers",
    family: "next",
    skillSlug: "g3-mult",
    skillLabel: MULT,
    topic: "What comes next",
    difficulty: 3,
    prompt: "1, 4, 9, 16. These are 1×1, 2×2, 3×3, and 4×4. What comes next?",
    answer: "25",
    steps: ["5 × 5 = 25."],
    attention: null,
    solve: () => range(0, 100).filter((value) => value === 5 * 5).map(String),
  },
  {
    id: "digits-box",
    title: "Digit in the box",
    family: "digits",
    skillSlug: "g3-place",
    skillLabel: PLACE,
    topic: "Digit placement",
    difficulty: 2,
    prompt: "4☐ + 25 = 73. The box is one digit. What digit goes in the box?",
    answer: "8",
    steps: ["73 − 25 = 48.", "The box is 8."],
    attention: null,
    solve: () => range(0, 9).filter((digit) => 40 + digit + 25 === 73).map(String),
  },
];

if (HAND_PUZZLES.length !== 15) {
  throw new Error(`Expected 15 puzzles, found ${HAND_PUZZLES.length}.`);
}
