import type { Difficulty } from "@/lib/content/model";
import {
  barSteps,
  closestLabel,
  corruptLines,
  countFactorPairs,
  expectedClosed,
  explainPack,
  greaterSum,
  roundTo,
} from "@/lib/content/rules";
import { addBand, factorBand, fractionBand, randInt } from "@/lib/content/phase1/random";
import type { Built, TemplateDef } from "@/lib/content/phase1/types";

type Rng = () => number;

const REGROUP = "Adding and subtracting with regrouping";
const PLACE = "Comparing numbers and place value";
const MULT = "Multiplication as equal groups";
const FRACTIONS = "Fractions on a number line";
const MISSING = "Missing-number equations";

const OPEN_UNIQUE = "Unique up to order. A child may swap the two numbers.";
const OPEN_MANY = "Many answers fit. A person should try two that work and one that does not.";
const ESTIMATE_NOTE = "The estimate rounds each number first. Check that this is the rounding you want taught.";
const EXPLAIN_NOTE = "The right reason was adapted from the explanation templates. Check that it matches these numbers.";
const MISTAKE_NOTE = "Check that a child can see the one false line, and that the other lines still look true.";

function pickSumDiff(rng: Rng, difficulty: Difficulty): { big: number; small: number } {
  for (let attempt = 0; attempt < 500; attempt += 1) {
    let big: number;
    let small: number;
    if (difficulty === 3) {
      big = randInt(rng, 500, 900);
      const high = Math.min(499, 1000 - big);
      if (high < 100) continue;
      small = randInt(rng, 100, high);
    } else {
      const band = addBand(difficulty);
      big = randInt(rng, band.min, band.max);
      const high = Math.min(band.max, 1000 - big);
      if (high < band.min) continue;
      small = randInt(rng, band.min, high);
    }
    if (big <= small || big + small > 1000) continue;
    if ((big % 10) + (small % 10) < 10) continue;
    return { big, small };
  }
  throw new Error("No regrouping pair in range.");
}

function pickFactors(rng: Rng, difficulty: Difficulty): { left: number; right: number } {
  const band = factorBand(difficulty);
  for (let attempt = 0; attempt < 300; attempt += 1) {
    const left = randInt(rng, band.min, band.max);
    const right = randInt(rng, band.min, band.max);
    if (Math.max(left, right) < band.floor) continue;
    if (left * right > 100) continue;
    if (countFactorPairs(left * right, band.min, band.max) !== 1) continue;
    return { left: Math.min(left, right), right: Math.max(left, right) };
  }
  throw new Error("No unique factor pair in range.");
}

function pickRoundable(rng: Rng, low: number, high: number, place: 10 | 100): number {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    const value = randInt(rng, low, high);
    if (value % place !== place / 2) return value;
  }
  throw new Error("No number to round.");
}

function distinctDigits(value: number): boolean {
  const text = String(value);
  return new Set(text).size === text.length;
}

function closed(
  rule: string,
  slots: Record<string, string | number>,
  prompt: string,
  bandValues: number[],
  extra: Partial<Built> = {},
): Built {
  return {
    prompt,
    answer: expectedClosed(rule, slots),
    slots,
    rule,
    bandValues,
    openEnded: false,
    ...extra,
  };
}

function openBuilt(
  rule: string,
  slots: Record<string, string | number>,
  prompt: string,
  answer: string,
  bandValues: number[],
  openEnded: boolean,
): Built {
  return { prompt, answer, slots, rule, bandValues, openEnded };
}

export const PHASE1_TEMPLATES: TemplateDef[] = [
  {
    id: "regroup-sum-diff",
    skillSlug: "g3-add-sub",
    skillLabel: REGROUP,
    topic: "Regrouping",
    kind: "open",
    spread: "Explore 10–99, Stretch 100–499, Puzzle one addend 500–900. Sums stay at or under 1,000.",
    attention: OPEN_UNIQUE,
    band: addBand,
    fill: (difficulty, rng) => {
      const pair = pickSumDiff(rng, difficulty);
      const sum = pair.big + pair.small;
      const diff = pair.big - pair.small;
      return openBuilt(
        "sum-diff",
        { sum, diff },
        `Name two numbers that add to ${sum} and differ by ${diff}.`,
        `${pair.big} and ${pair.small}`,
        [pair.big, pair.small],
        false,
      );
    },
  },
  {
    id: "regroup-ones-trade",
    skillSlug: "g3-add-sub",
    skillLabel: REGROUP,
    topic: "Regrouping",
    kind: "open",
    spread: "Explore 12–40 added to 28. Stretch 100–180 added to 146. Puzzle 500–560 added to 508.",
    attention: OPEN_MANY,
    band: addBand,
    fill: (difficulty, rng) => {
      const spec =
        difficulty === 1
          ? { addTo: 28, low: 12, high: 40 }
          : difficulty === 2
            ? { addTo: 146, low: 100, high: 180 }
            : { addTo: 508, low: 500, high: 560 };
      const need = 10 - (spec.addTo % 10);
      let sample = spec.low;
      for (let attempt = 0; attempt < 40; attempt += 1) {
        const value = randInt(rng, spec.low, spec.high);
        if (value % 10 >= need) {
          sample = value;
          break;
        }
      }
      return openBuilt(
        "ones-trade",
        spec,
        `Name a number from ${spec.low} to ${spec.high}. When you add it to ${spec.addTo}, you trade ones for a ten.`,
        String(sample),
        [sample, spec.addTo],
        true,
      );
    },
  },
  {
    id: "regroup-bar",
    skillSlug: "g3-add-sub",
    skillLabel: REGROUP,
    topic: "Regrouping",
    kind: "bar",
    spread: "Explore two steps under 100. Stretch two steps from 100–400. Puzzle three steps, with a start at 500–620.",
    attention: null,
    band: addBand,
    fill: (difficulty, rng) => {
      for (let attempt = 0; attempt < 400; attempt += 1) {
        if (difficulty === 1) {
          const a = randInt(rng, 18, 70);
          const b = randInt(rng, 18, 40);
          const take = randInt(rng, 5, 12);
          if ((a % 10) + (b % 10) < 10 || a + b - take <= 0) continue;
          const slots = { p0: a, p1: b, take };
          return closed("bar", slots, `Sam has ${a} marbles. He gets ${b} more. Then he gives ${take} away. How many are left?`, [a, b], {
            steps: barSteps([a, b], take, ["Has", "Gets"]),
          });
        }
        if (difficulty === 2) {
          const a = randInt(rng, 120, 360);
          const b = randInt(rng, 110, 250);
          const take = randInt(rng, 20, 80);
          if ((a % 10) + (b % 10) < 10 || a + b > 1000 || a + b - take <= 0) continue;
          const slots = { p0: a, p1: b, take };
          return closed("bar", slots, `Sam has ${a} marbles. He gets ${b} more. Then he gives ${take} away. How many are left?`, [a, b], {
            steps: barSteps([a, b], take, ["Has", "Gets"]),
          });
        }
        const a = randInt(rng, 500, 620);
        const b = randInt(rng, 100, 160);
        const c = randInt(rng, 100, 140);
        const take = randInt(rng, 20, 50);
        if ((a % 10) + (b % 10) < 10 || a + b + c > 1000 || a + b + c - take <= 0) continue;
        const slots = { p0: a, p1: b, p2: c, take };
        return closed(
          "bar",
          slots,
          `Sam has ${a} marbles. He gets ${b} more. Then he gets ${c} more. Then he gives ${take} away. How many are left?`,
          [a, b, c],
          { steps: barSteps([a, b, c], take, ["Has", "Gets", "Gets more"]) },
        );
      }
      throw new Error("No bar story in range.");
    },
  },
  {
    id: "regroup-estimate",
    skillSlug: "g3-add-sub",
    skillLabel: REGROUP,
    topic: "Regrouping",
    kind: "estimate",
    spread: "Explore nearest ten, 10–99. Stretch nearest ten, 100–499. Puzzle nearest hundred, with a start at 500–900.",
    attention: ESTIMATE_NOTE,
    band: addBand,
    fill: (difficulty, rng) => {
      const place: 10 | 100 = difficulty === 3 ? 100 : 10;
      for (let attempt = 0; attempt < 80; attempt += 1) {
        const a =
          difficulty === 1
            ? pickRoundable(rng, 16, 80, 10)
            : difficulty === 2
              ? pickRoundable(rng, 110, 360, 10)
              : pickRoundable(rng, 520, 760, 100);
        const b =
          difficulty === 1
            ? pickRoundable(rng, 16, 50, 10)
            : difficulty === 2
              ? pickRoundable(rng, 110, 240, 10)
              : pickRoundable(rng, 120, 240, 100);
        if ((a % 10) + (b % 10) < 10) continue;
        if (roundTo(a, place) + roundTo(b, place) > 1000 || a + b > 1000) continue;
        const how = place === 100 ? "hundred" : "ten";
        return closed(
          "rounded-sum",
          { a, b, place },
          `Round each number to the nearest ${how}. Then add. What is ${a} + ${b} about?`,
          [a, b],
        );
      }
      throw new Error("No estimate in range.");
    },
  },
  {
    id: "regroup-explain",
    skillSlug: "g3-add-sub",
    skillLabel: REGROUP,
    topic: "Regrouping",
    kind: "explain",
    spread: "Same addend bands as the regrouping open item. Every fill trades ones.",
    attention: EXPLAIN_NOTE,
    band: addBand,
    fill: (difficulty, rng) => {
      const pair = pickSumDiff(rng, difficulty);
      const slots = { a: pair.small, b: pair.big };
      const pack = explainPack("explain-add", slots);
      return closed("explain-add", slots, pack.prompt, [pair.small, pair.big], { choices: pack.choices });
    },
  },
  {
    id: "regroup-mistake",
    skillSlug: "g3-add-sub",
    skillLabel: REGROUP,
    topic: "Regrouping",
    kind: "mistake",
    spread: "Explore spoils the trade line. Stretch spoils the ones sum. Puzzle spoils the final sum. Addends follow the regrouping bands.",
    attention: MISTAKE_NOTE,
    band: addBand,
    fill: (difficulty, rng) => {
      const pair = pickSumDiff(rng, difficulty);
      const slots = { a: pair.small, b: pair.big };
      const index = difficulty === 1 ? 1 : difficulty === 2 ? 0 : 3;
      const worked = corruptLines("add", slots, index);
      return {
        prompt: `Look at the work for ${pair.small} + ${pair.big}. Tap the line that is wrong. Then type the fix.`,
        answer: `${worked.wrongLine}: ${worked.fix}`,
        slots,
        rule: "mistake-add",
        lines: worked.lines,
        wrongLine: worked.wrongLine,
        fix: worked.fix,
        bandValues: [pair.small, pair.big],
        openEnded: false,
      };
    },
  },
  {
    id: "regroup-next",
    skillSlug: "g3-add-sub",
    skillLabel: REGROUP,
    topic: "Regrouping",
    kind: "logic",
    spread: "Explore step 2–5 under 100. Stretch step 10–20 from 100–200. Puzzle step 10–40 from 500–700.",
    attention: null,
    band: addBand,
    fill: (difficulty, rng) => {
      const step = difficulty === 1 ? randInt(rng, 2, 5) : difficulty === 2 ? randInt(rng, 1, 2) * 10 : randInt(rng, 1, 4) * 10;
      const start = difficulty === 1 ? randInt(rng, 12, 40) : difficulty === 2 ? randInt(rng, 100, 200) : randInt(rng, 500, 700);
      const shown = 4;
      const next = start + step * shown;
      const cap = difficulty === 1 ? 99 : difficulty === 2 ? 499 : 999;
      if (next > cap) {
        return closed(
          "next",
          { start: difficulty === 3 ? 500 : start, step: 10, shown },
          patternPrompt(difficulty === 3 ? 500 : start, 10, shown),
          [difficulty === 3 ? 500 : start],
        );
      }
      return closed("next", { start, step, shown }, patternPrompt(start, step, shown), [start]);
    },
  },
  {
    id: "regroup-larger",
    skillSlug: "g3-add-sub",
    skillLabel: REGROUP,
    topic: "Regrouping",
    kind: "logic",
    spread: "Explore both sums under 100. Stretch both sums from 100–499. Puzzle one addend is at least 500, and both sums stay at or under 1,000.",
    attention: null,
    band: addBand,
    fill: (difficulty, rng) => {
      for (let attempt = 0; attempt < 200; attempt += 1) {
        let a: number;
        let b: number;
        let c: number;
        let d: number;
        if (difficulty === 1) {
          a = randInt(rng, 18, 60);
          b = randInt(rng, 18, 40);
          c = randInt(rng, 18, 60);
          d = randInt(rng, 18, 40);
        } else if (difficulty === 2) {
          a = randInt(rng, 120, 300);
          b = randInt(rng, 110, 180);
          c = randInt(rng, 120, 300);
          d = randInt(rng, 110, 180);
        } else {
          a = randInt(rng, 520, 700);
          b = randInt(rng, 100, 200);
          c = randInt(rng, 180, 360);
          d = randInt(rng, 120, 240);
        }
        if (a + b > 1000 || c + d > 1000) continue;
        if ((a % 10) + (b % 10) < 10 && (c % 10) + (d % 10) < 10) continue;
        if (!greaterSum(a, b, c, d)) continue;
        return closed(
          "greater-sum",
          { a, b, c, d },
          `Which sum is greater: ${a} + ${b}, or ${c} + ${d}?`,
          [a, b, c, d],
          { choices: [`${a} + ${b}`, `${c} + ${d}`] },
        );
      }
      throw new Error("No larger-sum pair.");
    },
  },
  {
    id: "place-digit",
    skillSlug: "g3-place",
    skillLabel: PLACE,
    topic: "Place value",
    kind: "open",
    spread: "Explore a tens digit in 10–99. Stretch a hundreds digit in 100–499. Puzzle a hundreds digit in 500–999.",
    attention: OPEN_MANY,
    band: addBand,
    fill: (difficulty, rng) => {
      if (difficulty === 1) {
        const digit = randInt(rng, 1, 9);
        const sample = digit * 10 + randInt(rng, 0, 9);
        return openBuilt(
          "digit-place",
          { low: 10, high: 99, place: 10, digit },
          `Name a number from 10 to 99 that has ${digit} tens.`,
          String(sample),
          [sample],
          true,
        );
      }
      const digit = difficulty === 2 ? randInt(rng, 1, 4) : randInt(rng, 5, 9);
      const low = difficulty === 2 ? 100 : 500;
      const high = difficulty === 2 ? 499 : 999;
      const sample = digit * 100 + randInt(rng, 0, 9) * 10 + randInt(rng, 0, 9);
      return openBuilt(
        "digit-place",
        { low, high, place: 100, digit },
        `Name a number from ${low} to ${high} that has ${digit} hundreds.`,
        String(sample),
        [sample],
        true,
      );
    },
  },
  {
    id: "place-plus",
    skillSlug: "g3-place",
    skillLabel: PLACE,
    topic: "Place value",
    kind: "open",
    spread: "Explore 10 more, both numbers under 100. Stretch 100 more, both from 100–499. Puzzle 100 more, starting at 500–899.",
    attention: OPEN_MANY,
    band: addBand,
    fill: (difficulty, rng) => {
      const step = difficulty === 1 ? 10 : 100;
      const low = difficulty === 1 ? 10 : difficulty === 2 ? 100 : 500;
      const high = difficulty === 1 ? 99 : difficulty === 2 ? 499 : 999;
      const start = randInt(rng, low, high - step);
      const next = start + step;
      const how = step === 10 ? "10 more" : "100 more";
      const same = step === 10 ? "The ones digit stays the same." : "The tens and ones stay the same.";
      return openBuilt(
        "plus-step",
        { low, high, step },
        `Name two numbers from ${low} to ${high}. One is ${how} than the other. ${same}`,
        `${start} and ${next}`,
        [start, next],
        true,
      );
    },
  },
  {
    id: "place-bar",
    skillSlug: "g3-place",
    skillLabel: PLACE,
    topic: "Place value",
    kind: "bar",
    spread: "Explore tens and ones under 100. Stretch a number from 100–400, then more tens. Puzzle a number from 500–860, then more tens.",
    attention: null,
    band: addBand,
    fill: (difficulty, rng) => {
      if (difficulty === 1) {
        const tens = randInt(rng, 2, 6);
        const ones = randInt(rng, 0, 9);
        const more = randInt(rng, 1, 3);
        const start = tens * 10 + ones;
        const added = more * 10;
        if (start + added > 99) {
          return closed("bar", { p0: 40, p1: 6, p2: 20, take: 0 }, placePrompt(4, 6, 2, false), [46], {
            steps: barSteps([40, 6, 20], 0, ["Tens", "Ones", "More tens"]),
          });
        }
        return closed(
          "bar",
          { p0: tens * 10, p1: ones, p2: added, take: 0 },
          placePrompt(tens, ones, more, false),
          [start],
          { steps: barSteps([tens * 10, ones, added], 0, ["Tens", "Ones", "More tens"]) },
        );
      }
      const low = difficulty === 2 ? 120 : 520;
      const high = difficulty === 2 ? 360 : 860;
      const start = randInt(rng, low, high);
      const more = randInt(rng, 2, 4) * 10;
      const hundreds = Math.floor(start / 100) * 100;
      const rest = start - hundreds;
      return closed(
        "bar",
        { p0: hundreds, p1: rest, p2: more, take: 0 },
        `The number ${start} is ${Math.floor(start / 100)} hundreds and ${rest} more. Then ${more / 10} more tens are added. How many are there?`,
        [start],
        { steps: barSteps([hundreds, rest, more], 0, ["Hundreds", "Rest", "More tens"]) },
      );
    },
  },
  {
    id: "place-estimate",
    skillSlug: "g3-place",
    skillLabel: PLACE,
    topic: "Place value",
    kind: "estimate",
    spread: "Explore nearest ten under 100. Stretch nearest hundred from 100–499. Puzzle nearest hundred from 500–999.",
    attention: ESTIMATE_NOTE,
    band: addBand,
    fill: (difficulty, rng) => {
      if (difficulty === 1) {
        const n = pickRoundable(rng, 14, 96, 10);
        return closed("rounded-one", { n, place: 10 }, `Round ${n} to the nearest ten.`, [n]);
      }
      const n = pickRoundable(rng, difficulty === 2 ? 120 : 520, difficulty === 2 ? 480 : 960, 100);
      return closed("rounded-one", { n, place: 100 }, `Round ${n} to the nearest hundred.`, [n]);
    },
  },
  {
    id: "place-explain",
    skillSlug: "g3-place",
    skillLabel: PLACE,
    topic: "Place value",
    kind: "explain",
    spread: "Explore a tens digit under 100. Stretch a hundreds digit from 100–499. Puzzle a hundreds digit from 500–999.",
    attention: EXPLAIN_NOTE,
    band: addBand,
    fill: (difficulty, rng) => {
      for (let attempt = 0; attempt < 40; attempt += 1) {
        const n =
          difficulty === 1
            ? randInt(rng, 18, 97)
            : randInt(rng, difficulty === 2 ? 123 : 512, difficulty === 2 ? 498 : 987);
        if (!distinctDigits(n)) continue;
        const digit = difficulty === 1 ? Math.floor(n / 10) % 10 : Math.floor(n / 100);
        if (digit === 0) continue;
        const place = difficulty === 1 ? 10 : 100;
        const slots = { n, digit, place };
        const pack = explainPack("explain-place", slots);
        if (new Set(pack.choices).size !== 3) continue;
        return closed("explain-place", slots, pack.prompt, [n], { choices: pack.choices });
      }
      throw new Error("No place explanation.");
    },
  },
  {
    id: "place-mistake",
    skillSlug: "g3-place",
    skillLabel: PLACE,
    topic: "Place value",
    kind: "mistake",
    spread: "Explore a two-digit number. Stretch a number from 100–499. Puzzle a number from 500–999. Digits in the number are all different.",
    attention: MISTAKE_NOTE,
    band: addBand,
    fill: (difficulty, rng) => {
      for (let attempt = 0; attempt < 40; attempt += 1) {
        const n =
          difficulty === 1
            ? randInt(rng, 18, 97)
            : randInt(rng, difficulty === 2 ? 123 : 512, difficulty === 2 ? 498 : 987);
        if (!distinctDigits(n) || n % 10 === Math.floor(n / 10) % 10) continue;
        const slots = { n };
        const index = difficulty === 1 ? 0 : difficulty === 2 ? 1 : 2;
        const worked = corruptLines("place", slots, index);
        return {
          prompt: `Look at the work for ${n}. Tap the line that is wrong. Then type the fix.`,
          answer: `${worked.wrongLine}: ${worked.fix}`,
          slots,
          rule: "mistake-place",
          lines: worked.lines,
          wrongLine: worked.wrongLine,
          fix: worked.fix,
          bandValues: [n],
          openEnded: false,
        };
      }
      throw new Error("No place mistake.");
    },
  },
  {
    id: "place-largest",
    skillSlug: "g3-place",
    skillLabel: PLACE,
    topic: "Place value",
    kind: "logic",
    spread: "Explore two digits under 100. Stretch three digits that make at most 499. Puzzle three digits, and the largest number is at least 500.",
    attention: null,
    band: addBand,
    fill: (difficulty, rng) => {
      if (difficulty === 1) {
        const d0 = randInt(rng, 1, 8);
        let d1 = randInt(rng, 1, 9);
        if (d1 === d0) d1 = d0 === 9 ? 8 : d0 + 1;
        return closed("largest", { d0, d1 }, `Use the digits ${d0} and ${d1} once. What is the largest number you can make?`, [
          Math.max(d0, d1) * 10 + Math.min(d0, d1),
        ]);
      }
      const pool = difficulty === 2 ? [1, 2, 3, 4] : [5, 6, 7, 8, 9];
      const digits = shufflePick(rng, pool, 3);
      const largest = Number([...digits].sort((left, right) => right - left).join(""));
      return closed(
        "largest",
        { d0: digits[0]!, d1: digits[1]!, d2: digits[2]! },
        `Use the digits ${digits.join(", ")} once. What is the largest number you can make?`,
        [largest],
      );
    },
  },
  {
    id: "place-next",
    skillSlug: "g3-place",
    skillLabel: PLACE,
    topic: "Place value",
    kind: "logic",
    spread: "Explore count by 10 under 100. Stretch count by 10 or 20 from 100–200. Puzzle count by 10, 20, or 50 from 500–700.",
    attention: null,
    band: addBand,
    fill: (difficulty, rng) => {
      const step = difficulty === 1 ? 10 : difficulty === 2 ? randInt(rng, 1, 2) * 10 : [10, 20, 50][randInt(rng, 0, 2)]!;
      const start = difficulty === 1 ? randInt(rng, 10, 50) : difficulty === 2 ? randInt(rng, 100, 180) : randInt(rng, 500, 640);
      const cap = difficulty === 1 ? 99 : difficulty === 2 ? 499 : 999;
      const shown = 4;
      const safeStart = start + step * shown <= cap ? start : difficulty === 3 ? 500 : start;
      const safeStep = safeStart + step * shown <= cap ? step : 10;
      return closed("next", { start: safeStart, step: safeStep, shown }, patternPrompt(safeStart, safeStep, shown), [safeStart]);
    },
  },
  {
    id: "mult-factors",
    skillSlug: "g3-mult",
    skillLabel: MULT,
    topic: "Equal groups",
    kind: "open",
    spread: "Explore factors 2–5. Stretch factors 2–8, with one factor at least 6. Puzzle factors 2–10, with one factor at least 9. Products stay at or under 100.",
    attention: OPEN_UNIQUE,
    band: factorBand,
    fill: (difficulty, rng) => {
      const pair = pickFactors(rng, difficulty);
      const band = factorBand(difficulty);
      return openBuilt(
        "factor-pair",
        { product: pair.left * pair.right, min: band.min, max: band.max },
        `Name two numbers from ${band.min} to ${band.max} whose product is ${pair.left * pair.right}.`,
        `${pair.left} and ${pair.right}`,
        [pair.left, pair.right],
        false,
      );
    },
  },
  {
    id: "mult-bar",
    skillSlug: "g3-mult",
    skillLabel: MULT,
    topic: "Equal groups",
    kind: "bar",
    spread: "Explore one group, then some are eaten. Stretch two collections. Puzzle two collections, then some are eaten. Products stay at or under 100.",
    attention: null,
    band: factorBand,
    fill: (difficulty, rng) => {
      const band = factorBand(difficulty);
      for (let attempt = 0; attempt < 200; attempt += 1) {
        if (difficulty === 1) {
          const groups = randInt(rng, 2, 5);
          const size = randInt(rng, 2, 5);
          const product = groups * size;
          const take = randInt(rng, 1, product - 1);
          return closed(
            "bar",
            { p0: product, take },
            `There are ${groups} bags. Each bag has ${size} apples. Then ${take} apples are eaten. How many apples are left?`,
            [groups, size],
            { steps: barSteps([product], take, ["Apples"]) },
          );
        }
        const size = randInt(rng, band.min, band.max);
        const first = difficulty === 2 ? randInt(rng, 6, 8) : randInt(rng, 9, 10);
        const second = randInt(rng, 2, 3);
        const take = difficulty === 3 ? randInt(rng, 1, 5) : 0;
        if (first * size > 100 || second * size > 100 || first * size + second * size - take > 100) continue;
        if (first * size + second * size - take <= 0) continue;
        const slots = { p0: first * size, p1: second * size, take };
        const prompt =
          difficulty === 2
            ? `There are ${first} bags of ${size} apples. There are ${second} more bags of ${size} apples. How many apples are there?`
            : `There are ${first} bags of ${size} apples. There are ${second} more bags of ${size} apples. Then ${take} apples are eaten. How many are left?`;
        return closed("bar", slots, prompt, [first, second, size], {
          steps: barSteps([first * size, second * size], take, ["First bags", "More bags"]),
        });
      }
      throw new Error("No groups story.");
    },
  },
  {
    id: "mult-compare",
    skillSlug: "g3-mult",
    skillLabel: MULT,
    topic: "Equal groups",
    kind: "bar",
    spread: "Explore factors 2–5. Stretch one factor at least 6. Puzzle one factor at least 9. The two totals are different.",
    attention: null,
    band: factorBand,
    fill: (difficulty, rng) => {
      const band = factorBand(difficulty);
      for (let attempt = 0; attempt < 80; attempt += 1) {
        const g1 = randInt(rng, band.min, band.max);
        const n1 = randInt(rng, band.min, band.max);
        const g2 = randInt(rng, band.min, band.max);
        const n2 = randInt(rng, band.min, band.max);
        if (Math.max(g1, n1, g2, n2) < band.floor) continue;
        if (g1 * n1 > 100 || g2 * n2 > 100 || g1 * n1 === g2 * n2) continue;
        const slots = { g1, n1, g2, n2 };
        return closed(
          "more-groups",
          slots,
          `Which has more apples: ${g1} bags of ${n1}, or ${g2} bags of ${n2}?`,
          [g1, n1, g2, n2],
          { choices: [`${g1} bags of ${n1}`, `${g2} bags of ${n2}`] },
        );
      }
      throw new Error("No groups compare.");
    },
  },
  {
    id: "mult-estimate",
    skillSlug: "g3-mult",
    skillLabel: MULT,
    topic: "Equal groups",
    kind: "estimate",
    spread: "Explore 2–5 rows. Stretch 6–8 rows. Puzzle 9–10 rows. The other number is rounded to the nearest ten, and the estimate stays at or under 100.",
    attention: ESTIMATE_NOTE,
    band: factorBand,
    fill: (difficulty, rng) => {
      const groups = difficulty === 1 ? randInt(rng, 2, 5) : difficulty === 2 ? randInt(rng, 6, 8) : randInt(rng, 9, 10);
      const cap = Math.floor(100 / groups) * 10;
      const n = pickRoundable(rng, 12, Math.max(14, cap - 1), 10);
      if (groups * roundTo(n, 10) > 100) {
        return closed(
          "rounded-product",
          { g: groups, n: 12 },
          `There are ${groups} rows of 12 chairs. Round 12 to the nearest ten. About how many chairs?`,
          [groups],
        );
      }
      return closed(
        "rounded-product",
        { g: groups, n },
        `There are ${groups} rows of ${n} chairs. Round ${n} to the nearest ten. About how many chairs?`,
        [groups],
      );
    },
  },
  {
    id: "mult-explain",
    skillSlug: "g3-mult",
    skillLabel: MULT,
    topic: "Equal groups",
    kind: "explain",
    spread: "Explore factors 2–5. Stretch one factor at least 6. Puzzle one factor at least 9. The two factors are different.",
    attention: EXPLAIN_NOTE,
    band: factorBand,
    fill: (difficulty, rng) => {
      const band = factorBand(difficulty);
      for (let attempt = 0; attempt < 40; attempt += 1) {
        const g = randInt(rng, band.min, band.max);
        const n = randInt(rng, band.min, band.max);
        if (g === n || g * n > 100 || Math.max(g, n) < band.floor) continue;
        const slots = { g, n };
        const pack = explainPack("explain-groups", slots);
        return closed("explain-groups", slots, pack.prompt, [g, n], { choices: pack.choices });
      }
      throw new Error("No groups explanation.");
    },
  },
  {
    id: "mult-mistake",
    skillSlug: "g3-mult",
    skillLabel: MULT,
    topic: "Equal groups",
    kind: "mistake",
    spread: "Explore spoils the group count. Stretch spoils the group size. Puzzle spoils the total. Factors follow the equal-groups bands.",
    attention: MISTAKE_NOTE,
    band: factorBand,
    fill: (difficulty, rng) => {
      const band = factorBand(difficulty);
      const g = difficulty === 1 ? randInt(rng, 2, 5) : difficulty === 2 ? randInt(rng, 6, 8) : randInt(rng, 9, 10);
      let n = randInt(rng, 2, Math.min(band.max, Math.floor(100 / g)));
      if (n < 2) n = 2;
      const slots = { g, n };
      const index = difficulty === 1 ? 0 : difficulty === 2 ? 1 : 3;
      const worked = corruptLines("groups", slots, index);
      return {
        prompt: `Look at the work for ${g} groups of ${n}. Tap the line that is wrong. Then type the fix.`,
        answer: `${worked.wrongLine}: ${worked.fix}`,
        slots,
        rule: "mistake-groups",
        lines: worked.lines,
        wrongLine: worked.wrongLine,
        fix: worked.fix,
        bandValues: [g, n],
        openEnded: false,
      };
    },
  },
  {
    id: "mult-mistake-total",
    skillSlug: "g3-mult",
    skillLabel: MULT,
    topic: "Equal groups",
    kind: "mistake",
    spread: "Same factor bands. Explore spoils the total. Stretch spoils the size. Puzzle spoils the group count.",
    attention: MISTAKE_NOTE,
    band: factorBand,
    fill: (difficulty, rng) => {
      const band = factorBand(difficulty);
      const g = difficulty === 1 ? randInt(rng, 2, 5) : difficulty === 2 ? randInt(rng, 6, 8) : randInt(rng, 9, 10);
      const n = randInt(rng, 2, Math.max(2, Math.min(band.max, Math.floor(100 / g))));
      const slots = { g, n };
      const index = difficulty === 1 ? 3 : difficulty === 2 ? 1 : 0;
      const worked = corruptLines("groups", slots, index);
      return {
        prompt: `Look at the work for ${g} × ${n}. Tap the line that is wrong. Then type the fix.`,
        answer: `${worked.wrongLine}: ${worked.fix}`,
        slots,
        rule: "mistake-groups",
        lines: worked.lines,
        wrongLine: worked.wrongLine,
        fix: worked.fix,
        bandValues: [g, n],
        openEnded: false,
      };
    },
  },
  {
    id: "mult-next",
    skillSlug: "g3-mult",
    skillLabel: MULT,
    topic: "Equal groups",
    kind: "logic",
    spread: "Explore count by 2. Stretch count by 6. Puzzle count by 10. The next number stays at or under 100.",
    attention: null,
    band: factorBand,
    fill: (difficulty) => {
      const step = difficulty === 1 ? 2 : difficulty === 2 ? 6 : 10;
      const start = step * 2;
      const shown = 4;
      return closed(
        "next",
        { start, step, shown },
        `${listTerms(start, step, shown)} Each number adds one more group of ${step}. What comes next?`,
        [step],
      );
    },
  },
  {
    id: "frac-half",
    skillSlug: "g3-fractions",
    skillLabel: FRACTIONS,
    topic: "Fractions",
    kind: "open",
    spread: "Explore denominators 2–4. Stretch denominators 2–8. Puzzle denominators 2–12.",
    attention: OPEN_MANY,
    band: fractionBand,
    fill: (difficulty) => {
      const denMax = difficulty === 1 ? 4 : difficulty === 2 ? 8 : 12;
      const den = denMax;
      return openBuilt(
        "half",
        { denMax },
        `Name a fraction equal to 1/2. Use a bottom number from 2 to ${denMax}.`,
        `${den / 2}/${den}`,
        [den],
        true,
      );
    },
  },
  {
    id: "frac-bar",
    skillSlug: "g3-fractions",
    skillLabel: FRACTIONS,
    topic: "Fractions",
    kind: "bar",
    spread: "Explore a line split into 2–4 parts. Stretch 5–8 parts. Puzzle 9–12 parts. Two shade steps.",
    attention: null,
    band: fractionBand,
    fill: (difficulty, rng) => {
      const band = fractionBand(difficulty);
      const den = randInt(rng, Math.max(band.floor, 3), band.max);
      const first = 1;
      const more = randInt(rng, 1, den - first);
      const shaded = first + more;
      return closed(
        "fraction",
        { num: shaded, den },
        `A line has ${den} equal parts. You shade ${first} part. Then you shade ${more} more. What fraction is shaded?`,
        [den],
        { steps: [`First shade: ${first}`, `Then shade: ${more}`, `Shaded: ${shaded}/${den}`] },
      );
    },
  },
  {
    id: "frac-estimate",
    skillSlug: "g3-fractions",
    skillLabel: FRACTIONS,
    topic: "Fractions",
    kind: "estimate",
    spread: "Explore denominators 3–4. Stretch 5–8. Puzzle 9–12. The nearest mark is unique: 0, 1/2, or 1.",
    attention: ESTIMATE_NOTE,
    band: fractionBand,
    fill: (difficulty, rng) => {
      const band = fractionBand(difficulty);
      for (let attempt = 0; attempt < 40; attempt += 1) {
        const den = randInt(rng, Math.max(3, band.floor), band.max);
        const num = randInt(rng, 1, den - 1);
        if (!closestLabel(num, den)) continue;
        return closed("closest", { num, den }, `Is ${num}/${den} closer to 0, to 1/2, or to 1?`, [den], {
          choices: ["0", "1/2", "1"],
        });
      }
      throw new Error("No closest fraction.");
    },
  },
  {
    id: "frac-explain",
    skillSlug: "g3-fractions",
    skillLabel: FRACTIONS,
    topic: "Fractions",
    kind: "explain",
    spread: "Explore 3–4 equal parts. Stretch 5–8. Puzzle 9–12.",
    attention: EXPLAIN_NOTE,
    band: fractionBand,
    fill: (difficulty, rng) => {
      const band = fractionBand(difficulty);
      const den = randInt(rng, Math.max(3, band.floor), band.max);
      const hops = randInt(rng, 1, den - 1);
      const slots = { hops, den };
      const pack = explainPack("explain-fraction", slots);
      return closed("explain-fraction", slots, pack.prompt, [den], { choices: pack.choices });
    },
  },
  {
    id: "frac-explain-size",
    skillSlug: "g3-fractions",
    skillLabel: FRACTIONS,
    topic: "Fractions",
    kind: "explain",
    spread: "Explore 1/3 or 1/4. Stretch 1/5 to 1/8. Puzzle 1/9 to 1/12. Each is compared with 1/2.",
    attention: EXPLAIN_NOTE,
    band: fractionBand,
    fill: (difficulty, rng) => {
      const band = fractionBand(difficulty);
      const den = randInt(rng, Math.max(3, band.floor), band.max);
      const slots = { den };
      const pack = explainPack("explain-size", slots);
      return closed("explain-size", slots, pack.prompt, [den], { choices: pack.choices });
    },
  },
  {
    id: "frac-mistake",
    skillSlug: "g3-fractions",
    skillLabel: FRACTIONS,
    topic: "Fractions",
    kind: "mistake",
    spread: "Explore 3–4 parts. Stretch 5–8 parts. Puzzle 9–12 parts. The point is not exactly 1/2.",
    attention: MISTAKE_NOTE,
    band: fractionBand,
    fill: (difficulty, rng) => {
      const band = fractionBand(difficulty);
      for (let attempt = 0; attempt < 20; attempt += 1) {
        const den = randInt(rng, Math.max(3, band.floor), band.max);
        const hops = randInt(rng, 1, den - 1);
        if (hops * 2 === den) continue;
        const slots = { den, hops };
        const index = difficulty === 1 ? 2 : difficulty === 2 ? 1 : 0;
        const worked = corruptLines("fraction", slots, index);
        return {
          prompt: `A line has ${den} equal parts. The point is ${hops} hops along. Tap the line that is wrong. Then type the fix.`,
          answer: `${worked.wrongLine}: ${worked.fix}`,
          slots,
          rule: "mistake-fraction",
          lines: worked.lines,
          wrongLine: worked.wrongLine,
          fix: worked.fix,
          bandValues: [den],
          openEnded: false,
        };
      }
      throw new Error("No fraction mistake.");
    },
  },
  {
    id: "frac-next",
    skillSlug: "g3-fractions",
    skillLabel: FRACTIONS,
    topic: "Fractions",
    kind: "logic",
    spread: "Explore fourths. Stretch eighths. Puzzle twelfths. The top number goes up by 1.",
    attention: null,
    band: fractionBand,
    fill: (difficulty) => {
      const den = difficulty === 1 ? 4 : difficulty === 2 ? 8 : 12;
      const num = 3;
      return closed(
        "fraction",
        { num, den },
        `${num - 2}/${den}, ${num - 1}/${den}. The top number goes up by 1. What fraction comes next?`,
        [den],
      );
    },
  },
  {
    id: "frac-greater",
    skillSlug: "g3-fractions",
    skillLabel: FRACTIONS,
    topic: "Fractions",
    kind: "logic",
    spread: "Explore the same bottom number, 3 or 4. Stretch 5–8. Puzzle 9–12.",
    attention: null,
    band: fractionBand,
    fill: (difficulty, rng) => {
      const band = fractionBand(difficulty);
      const den = randInt(rng, Math.max(3, band.floor), band.max);
      let left = randInt(rng, 1, den - 1);
      let right = randInt(rng, 1, den - 1);
      if (left === right) right = left === den - 1 ? left - 1 : left + 1;
      return closed(
        "compare-frac",
        { left, right, den },
        `Which fraction is greater: ${left}/${den} or ${right}/${den}?`,
        [den],
        { choices: [`${left}/${den}`, `${right}/${den}`] },
      );
    },
  },
  {
    id: "miss-sum-diff",
    skillSlug: "g3-add-sub",
    skillLabel: REGROUP,
    topic: MISSING,
    kind: "open",
    spread: "Same bands as the regrouping sum-and-difference item. The pair is the only one.",
    attention: OPEN_UNIQUE,
    band: addBand,
    fill: (difficulty, rng) => {
      const pair = pickSumDiff(rng, difficulty);
      const sum = pair.big + pair.small;
      const diff = pair.big - pair.small;
      return openBuilt(
        "sum-diff",
        { sum, diff },
        `Name the two missing numbers. One box plus the other is ${sum}. The bigger minus the smaller is ${diff}.`,
        `${pair.big} and ${pair.small}`,
        [pair.big, pair.small],
        false,
      );
    },
  },
  {
    id: "miss-pair",
    skillSlug: "g3-add-sub",
    skillLabel: REGROUP,
    topic: MISSING,
    kind: "open",
    spread: "Explore two numbers from 10–30 that add to 40. Stretch 100–300 that add to 400. Puzzle 200–500 that add to 700.",
    attention: OPEN_MANY,
    band: addBand,
    fill: (difficulty, rng) => {
      const spec =
        difficulty === 1
          ? { low: 10, high: 30, sum: 40 }
          : difficulty === 2
            ? { low: 100, high: 300, sum: 400 }
            : { low: 200, high: 500, sum: 700 };
      const left = difficulty === 3 ? 200 : randInt(rng, spec.low, Math.floor(spec.sum / 2) - 1);
      const right = spec.sum - left;
      return openBuilt(
        "pair-sum",
        spec,
        `Name two different numbers from ${spec.low} to ${spec.high} that add to ${spec.sum}.`,
        `${left} and ${right}`,
        [left, right],
        true,
      );
    },
  },
  {
    id: "miss-bar",
    skillSlug: "g3-add-sub",
    skillLabel: REGROUP,
    topic: MISSING,
    kind: "bar",
    spread: "Explore a rope under 100. Stretch a rope from 200–400. Puzzle a rope from 600–900. Find the other piece, then cut a bit off.",
    attention: null,
    band: addBand,
    fill: (difficulty, rng) => {
      for (let attempt = 0; attempt < 40; attempt += 1) {
        const rope = difficulty === 1 ? randInt(rng, 36, 90) : difficulty === 2 ? randInt(rng, 240, 400) : randInt(rng, 640, 900);
        const piece =
          difficulty === 1 ? randInt(rng, 12, rope - 12) : difficulty === 2 ? randInt(rng, 100, 160) : randInt(rng, 200, 320);
        const cut = difficulty === 1 ? randInt(rng, 3, 8) : randInt(rng, 10, 30);
        const other = rope - piece;
        if (other <= cut || piece < 10) continue;
        return closed(
          "rope",
          { rope, piece, cut },
          `A rope is ${rope} cm. One piece is ${piece} cm. Then ${cut} cm is cut off the other piece. How long is that piece now?`,
          [rope, piece],
          { steps: [`Whole: ${rope}`, `One piece: ${piece}`, `Other piece: ${other}`, `Cut off: ${cut}`, `Left: ${other - cut}`] },
        );
      }
      throw new Error("No rope story.");
    },
  },
  {
    id: "miss-estimate",
    skillSlug: "g3-add-sub",
    skillLabel: REGROUP,
    topic: MISSING,
    kind: "estimate",
    spread: "Explore nearest ten under 100. Stretch nearest ten from 100–499. Puzzle nearest hundred, with a total of at least 500.",
    attention: ESTIMATE_NOTE,
    band: addBand,
    fill: (difficulty, rng) => {
      const place: 10 | 100 = difficulty === 3 ? 100 : 10;
      for (let attempt = 0; attempt < 60; attempt += 1) {
        const total =
          difficulty === 1
            ? pickRoundable(rng, 40, 96, 10)
            : difficulty === 2
              ? pickRoundable(rng, 220, 480, 10)
              : pickRoundable(rng, 620, 960, 100);
        const addendHigh = difficulty === 3 ? 300 : Math.floor(total / 2);
        const a =
          difficulty === 1
            ? pickRoundable(rng, 14, Math.max(16, addendHigh), 10)
            : difficulty === 2
              ? pickRoundable(rng, 100, Math.max(120, addendHigh), 10)
              : pickRoundable(rng, 120, 280, 100);
        if (a >= total) continue;
        const estimate = roundTo(total, place) - roundTo(a, place);
        if (estimate <= 0) continue;
        return closed(
          "rounded-blank",
          { a, total, place },
          `Blank + ${a} = ${total}. Round each number to the nearest ${place === 100 ? "hundred" : "ten"}. About what is the blank?`,
          [a, total],
        );
      }
      throw new Error("No blank estimate.");
    },
  },
  {
    id: "miss-explain",
    skillSlug: "g3-add-sub",
    skillLabel: REGROUP,
    topic: MISSING,
    kind: "explain",
    spread: "Explore totals under 100. Stretch totals from 200–499. Puzzle totals from 600–999. The blank is not the total.",
    attention: EXPLAIN_NOTE,
    band: addBand,
    fill: (difficulty, rng) => {
      for (let attempt = 0; attempt < 40; attempt += 1) {
        const total = difficulty === 1 ? randInt(rng, 24, 90) : difficulty === 2 ? randInt(rng, 220, 480) : randInt(rng, 620, 960);
        const a = difficulty === 1 ? randInt(rng, 11, total - 11) : difficulty === 2 ? randInt(rng, 100, 160) : randInt(rng, 180, 280);
        const blank = total - a;
        if (blank === a || blank <= 0 || a >= total) continue;
        const slots = { a, total };
        const pack = explainPack("explain-blank", slots);
        return closed("explain-blank", slots, pack.prompt, [a, total], { choices: pack.choices });
      }
      throw new Error("No blank explanation.");
    },
  },
  {
    id: "miss-mistake",
    skillSlug: "g3-add-sub",
    skillLabel: REGROUP,
    topic: MISSING,
    kind: "mistake",
    spread: "Explore under 100. Stretch from 200–499. Puzzle from 600–999. The false line says the blank is the total.",
    attention: MISTAKE_NOTE,
    band: addBand,
    fill: (difficulty, rng) => {
      const total = difficulty === 1 ? randInt(rng, 24, 90) : difficulty === 2 ? randInt(rng, 240, 460) : randInt(rng, 640, 920);
      const a = difficulty === 1 ? randInt(rng, 11, total - 8) : difficulty === 2 ? randInt(rng, 100, 160) : randInt(rng, 180, 260);
      const slots = { a, total };
      const worked = corruptLines("missing-add", slots, 1);
      return {
        prompt: `Look at the work for ${a} + ☐ = ${total}. Tap the line that is wrong. Then type the fix.`,
        answer: `${worked.wrongLine}: ${worked.fix}`,
        slots,
        rule: "mistake-missing-add",
        lines: worked.lines,
        wrongLine: worked.wrongLine,
        fix: worked.fix,
        bandValues: [a, total],
        openEnded: false,
      };
    },
  },
  {
    id: "miss-mistake-sub",
    skillSlug: "g3-add-sub",
    skillLabel: REGROUP,
    topic: MISSING,
    kind: "mistake",
    spread: "Explore under 100. Stretch from 120–499. Puzzle from 500–999. The ones need a trade, and the false line names the difference.",
    attention: MISTAKE_NOTE,
    band: addBand,
    fill: (difficulty, rng) => {
      for (let attempt = 0; attempt < 40; attempt += 1) {
        const start = difficulty === 1 ? randInt(rng, 24, 90) : difficulty === 2 ? randInt(rng, 140, 460) : randInt(rng, 540, 960);
        const taken = difficulty === 1 ? randInt(rng, 6, 18) : randInt(rng, 16, 40);
        if (taken >= start || start % 10 >= taken % 10) continue;
        const slots = { start, taken };
        const worked = corruptLines("missing-sub", slots, 1);
        return {
          prompt: `Look at the work for ☐ - ${taken} = ${start - taken}. Tap the line that is wrong. Then type the fix.`,
          answer: `${worked.wrongLine}: ${worked.fix}`,
          slots,
          rule: "mistake-missing-sub",
          lines: worked.lines,
          wrongLine: worked.wrongLine,
          fix: worked.fix,
          bandValues: [start],
          openEnded: false,
        };
      }
      throw new Error("No subtraction mistake.");
    },
  },
  {
    id: "miss-pattern",
    skillSlug: "g3-add-sub",
    skillLabel: REGROUP,
    topic: MISSING,
    kind: "logic",
    spread: "Explore step 2–5 under 100. Stretch step 10–20 from 100–200. Puzzle step 10–40 from 500–700.",
    attention: null,
    band: addBand,
    fill: (difficulty, rng) => {
      const step = difficulty === 1 ? randInt(rng, 2, 5) : difficulty === 2 ? randInt(rng, 1, 2) * 10 : randInt(rng, 1, 4) * 10;
      const cap = difficulty === 1 ? 99 : difficulty === 2 ? 499 : 999;
      let start = difficulty === 1 ? randInt(rng, 12, 36) : difficulty === 2 ? randInt(rng, 100, 180) : randInt(rng, 500, 640);
      let used = step;
      if (start + used * 3 > cap) {
        start = difficulty === 1 ? 12 : difficulty === 2 ? 100 : 500;
        used = difficulty === 1 ? 2 : 10;
      }
      const terms = [start, start + used, start + used * 2, start + used * 3];
      return closed(
        "missing-term",
        { start, step: used },
        `${terms[0]}, ☐, ${terms[2]}, ${terms[3]}. Each number is ${used} more than the one before. What is the missing number?`,
        [start],
      );
    },
  },
];

function patternPrompt(start: number, step: number, shown: number): string {
  return `${listTerms(start, step, shown)} Each number is ${step} more. What comes next?`;
}

function listTerms(start: number, step: number, shown: number): string {
  const terms: number[] = [];
  for (let index = 0; index < shown; index += 1) terms.push(start + step * index);
  return `${terms.join(", ")}.`;
}

function placePrompt(tens: number, ones: number, moreTens: number, hundreds: boolean): string {
  void hundreds;
  return `There are ${tens} tens and ${ones} ones. Then ${moreTens} more tens are added. How many are there?`;
}

function shufflePick(rng: Rng, pool: number[], count: number): number[] {
  const copy = [...pool];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = randInt(rng, 0, index);
    const hold = copy[index]!;
    copy[index] = copy[swap]!;
    copy[swap] = hold;
  }
  return copy.slice(0, count);
}

if (PHASE1_TEMPLATES.length !== 40) {
  throw new Error(`Expected 40 templates, found ${PHASE1_TEMPLATES.length}.`);
}
