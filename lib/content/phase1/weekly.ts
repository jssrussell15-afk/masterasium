import type { SkillSlug } from "@/lib/content/phase1/types";

export type WeeklyPuzzle = {
  week: 1 | 2 | 3 | 4;
  title: string;
  prompt: string;
  hint: string;
  solution: string;
  answer: string;
  skillSlug: SkillSlug;
  skillLabel: string;
  topic: string;
  kind: "logic" | "bar";
  solve: () => string[];
};

const START = Date.parse("2026-10-18T00:00:00Z");

export function weeklyIndex(isoDate: string): number {
  const day = Date.parse(`${isoDate}T00:00:00Z`);
  const weeks = Math.floor((day - START) / (7 * 24 * 60 * 60 * 1000));
  if (!Number.isFinite(weeks) || weeks < 0) return 0;
  return weeks % 4;
}

export function weeklyForDate(isoDate: string): WeeklyPuzzle {
  return WEEKLY_PUZZLES[weeklyIndex(isoDate)]!;
}

export const WEEKLY_PUZZLES: WeeklyPuzzle[] = [
  {
    week: 1,
    title: "The block tower",
    skillSlug: "g3-add-sub",
    skillLabel: "Adding and subtracting with regrouping",
    topic: "Weekly pyramid",
    kind: "logic",
    prompt:
      "Each block is the sum of the two blocks under it. The bottom row is 6, 5, and 4. What number is on the top block?",
    hint: "Add the two blocks that sit under a block. Do the middle row first.",
    solution: "The middle blocks are 11 and 9. 11 + 9 = 20.",
    answer: "20",
    solve: () => {
      const found: string[] = [];
      for (let top = 0; top <= 80; top += 1) {
        const midLeft = 6 + 5;
        const midRight = 5 + 4;
        if (midLeft + midRight === top) found.push(String(top));
      }
      return found;
    },
  },
  {
    week: 2,
    title: "The almost-magic square",
    skillSlug: "g3-add-sub",
    skillLabel: "Adding and subtracting with regrouping",
    topic: "Weekly magic square",
    kind: "logic",
    prompt:
      "This square uses 1 to 9 once. Each row, column, and diagonal adds to 15. The rows are 2, 7, blank; then 9, 5, 1; then blank, 3, 8. What is the top-right number?",
    hint: "Each row adds to 15. Fill the top row, then check a column.",
    solution: "2 + 7 + 6 = 15, so the top right is 6. 4 + 3 + 8 = 15, so the bottom left is 4.",
    answer: "6",
    solve: () => {
      const used = new Set([2, 7, 9, 5, 1, 3, 8]);
      const free = [1, 2, 3, 4, 5, 6, 7, 8, 9].filter((digit) => !used.has(digit));
      const found: string[] = [];
      for (const topRight of free) {
        for (const bottomLeft of free) {
          if (topRight === bottomLeft) continue;
          const sums = [
            2 + 7 + topRight,
            9 + 5 + 1,
            bottomLeft + 3 + 8,
            2 + 9 + bottomLeft,
            7 + 5 + 3,
            topRight + 1 + 8,
            2 + 5 + 8,
            topRight + 5 + bottomLeft,
          ];
          if (sums.every((sum) => sum === 15)) found.push(String(topRight));
        }
      }
      return [...new Set(found)];
    },
  },
  {
    week: 3,
    title: "Baskets of apples",
    skillSlug: "g3-mult",
    skillLabel: "Multiplication as equal groups",
    topic: "Weekly groups",
    kind: "bar",
    prompt:
      "There are 4 baskets with 6 apples in each basket. Then 2 more baskets with 6 apples are added. Then 5 apples are eaten. How many apples are left?",
    hint: "Find how many apples there are before anyone eats. Then take 5 away.",
    solution: "4 groups of 6 is 24. 2 more groups make 12 more. 24 + 12 = 36. 36 − 5 = 31.",
    answer: "31",
    solve: () => {
      const found: string[] = [];
      for (let left = 0; left <= 100; left += 1) {
        if (4 * 6 + 2 * 6 - 5 === left) found.push(String(left));
      }
      return found;
    },
  },
  {
    week: 4,
    title: "The hop on the line",
    skillSlug: "g3-fractions",
    skillLabel: "Fractions on a number line",
    topic: "Weekly fraction",
    kind: "logic",
    prompt:
      "A number line from 0 to 1 is split into 8 equal parts. A point is 6 hops from 0. What fraction is the point?",
    hint: "Count the equal spaces, not the tick marks. Half of 8 is 4, so you can also ask if the point is past halfway.",
    solution: "6 hops of 1/8 land on 6/8. 6/8 is more than 4/8, and 4/8 is the same as 1/2.",
    answer: "6/8",
    solve: () => {
      const found: string[] = [];
      for (let hops = 0; hops <= 8; hops += 1) {
        if (hops === 6) found.push(`${hops}/8`);
      }
      return found;
    },
  },
];

if (WEEKLY_PUZZLES.length !== 4) {
  throw new Error(`Expected 4 weekly puzzles, found ${WEEKLY_PUZZLES.length}.`);
}
