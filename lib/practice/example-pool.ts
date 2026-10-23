import { answersMatch } from "@/lib/practice/answers";
import { exampleIsCorrect, type ExampleVisual, type WorkedExample } from "@/lib/practice/example";
import { mentionsAnswer } from "@/lib/practice/example-rotation";
import { skillById } from "@/lib/practice/skills";

const POOL_SIZE = 3;

/**
 * Three checked examples of the same Grade 1 or Grade 5 question type.
 * Numbers come from code, never from a live model. Other grades return none.
 */
export function workedExamplePool(input: {
  skillId: string;
  livePrompt: string;
  liveAnswer: string;
}): WorkedExample[] {
  const skill = skillById(input.skillId);
  if (!skill || (skill.grade !== 1 && skill.grade !== 5)) return [];
  const grade = skill.grade;
  const prompt = input.livePrompt;
  const answer = input.liveAnswer;
  const candidates = candidatesFor(skill.id, prompt);
  return firstThree(grade, prompt, answer, candidates);
}

function candidatesFor(skillId: string, prompt: string): WorkedExample[] {
  switch (skillId) {
    case "g1-count":
      return /just before/i.test(prompt) ? beforeExamples() : afterExamples();
    case "g1-add-10":
      return addExamples();
    case "g1-sub-10":
      return subExamples();
    case "g1-compare":
      return compareExamples();
    case "g1-share":
      return shareExamples();
    case "g1-place":
      return placeExamples(1, placeName(prompt, "tens"));
    case "g1-patterns":
      return patternExamples();
    case "g1-measure":
      return measureExamples();
    case "g5-mult":
      return multExamples(prompt);
    case "g5-div-rem":
      return divisionExamples();
    case "g5-frac":
      return subtracting(prompt) ? fractionExamples("-") : fractionExamples("+");
    case "g5-place":
      return placeExamples(5, placeName(prompt, "ten-thousands"));
    case "g5-equations":
      return equationExamples();
    case "g5-decimals":
      return subtracting(prompt) ? decimalExamples("-") : decimalExamples("+");
    case "g5-area":
      return /triangle/i.test(prompt) ? triangleExamples() : parallelogramExamples();
    case "g5-volume":
      return volumeExamples();
    default:
      return [];
  }
}

function firstThree(
  grade: 1 | 5,
  livePrompt: string,
  liveAnswer: string,
  candidates: WorkedExample[],
): WorkedExample[] {
  const kept: WorkedExample[] = [];
  const prompts = new Set<string>();
  const numbers = new Set<string>();
  for (const candidate of candidates) {
    if (kept.length === POOL_SIZE) break;
    if (!fits(grade, candidate, livePrompt, liveAnswer)) continue;
    const key = numberKey(candidate.prompt);
    if (prompts.has(candidate.prompt) || (key && numbers.has(key))) continue;
    prompts.add(candidate.prompt);
    if (key) numbers.add(key);
    kept.push(candidate);
  }
  return kept;
}

function fits(grade: 1 | 5, example: WorkedExample, livePrompt: string, liveAnswer: string): boolean {
  if (example.steps.length < 2) return false;
  if (example.prompt === livePrompt) return false;
  const liveNumbers = numberKey(livePrompt);
  if (liveNumbers && numberKey(example.prompt) === liveNumbers) return false;
  if (liveAnswer && answersMatch(example.answer, liveAnswer)) return false;
  const limit = grade === 1 ? 14 : 18;
  for (const step of example.steps) {
    if (!/^[A-Z]/.test(step) || !/[.!?]$/.test(step)) return false;
    const words = step.trim().split(/\s+/).filter(Boolean).length;
    if (words < 1 || words > limit) return false;
  }
  const text = [example.prompt, example.answer, ...example.steps, ...chartDigits(example)].join(" ");
  if (liveAnswer && mentionsAnswer(text, liveAnswer)) return false;
  return exampleIsCorrect(example);
}

function chartDigits(example: WorkedExample): string[] {
  const digits: string[] = [];
  for (const visual of example.visuals ?? []) {
    if (visual?.kind === "place-chart") digits.push(...visual.digits);
  }
  return digits;
}

function numberKey(prompt: string): string {
  return (prompt.match(/\d+(?:\.\d+)?/g) ?? []).join(",");
}

function subtracting(prompt: string): boolean {
  return prompt.includes("−") || / - /.test(prompt);
}

function placeName(prompt: string, fallback: string): string {
  const match = prompt.match(/value of the ([a-z-]+) digit/i);
  const name = match?.[1]?.toLowerCase() ?? fallback;
  return name in PLACE_INDEX ? name : fallback;
}

const PLACE_INDEX: Record<string, number> = {
  ones: 0,
  tens: 1,
  hundreds: 2,
  thousands: 3,
  "ten-thousands": 4,
};

function digitAt(value: number, place: string): number {
  const index = PLACE_INDEX[place] ?? 0;
  return Math.floor(Math.abs(value) / 10 ** index) % 10;
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-CA").format(value);
}

function money(cents: number): string {
  return (cents / 100).toFixed(2);
}

function item(
  skill: string,
  prompt: string,
  answer: string,
  steps: string[],
  visuals: (ExampleVisual | null)[],
): WorkedExample {
  return { key: `${skill}:${prompt}`, prompt, answer, steps, visuals };
}

function count(word: string, countValue: number): string {
  return countValue === 1 ? word : `${word}s`;
}

function afterExamples(): WorkedExample[] {
  const examples: WorkedExample[] = [];
  for (const number of [8, 11, 6, 13, 9, 4, 15, 17, 3, 12, 18, 2, 7, 10, 16, 5, 19, 14, 1]) {
    const next = number + 1;
    const line = { kind: "number-line" as const, min: Math.max(0, number - 2), max: number + 2, from: number, to: next };
    examples.push(
      item("g1-count-after", `What number comes just after ${number}?`, String(next), [
        `Start at ${number} on the number line.`,
        `Hop one space to the right from ${number}.`,
        `The next number is ${next}.`,
      ], [
        { ...line, to: number },
        line,
        line,
      ]),
    );
  }
  return examples;
}

function beforeExamples(): WorkedExample[] {
  const examples: WorkedExample[] = [];
  for (const number of [12, 9, 15, 7, 18, 6, 11, 4, 16, 8, 13, 20, 5, 10, 3, 17, 14, 19, 2]) {
    const previous = number - 1;
    const line = { kind: "number-line" as const, min: Math.max(0, number - 2), max: number + 2, from: number, to: previous };
    examples.push(
      item("g1-count-before", `What number comes just before ${number}?`, String(previous), [
        `Start at ${number} on the number line.`,
        `Hop one space to the left from ${number}.`,
        `The number before ${number} is ${previous}.`,
      ], [
        { ...line, to: number },
        line,
        line,
      ]),
    );
  }
  return examples;
}

function addExamples(): WorkedExample[] {
  const examples: WorkedExample[] = [];
  for (const left of [4, 5, 6, 3, 7, 2, 8, 1, 9]) {
    for (const right of [3, 2, 4, 1, 5, 6, 7, 8, 9]) {
      if (left + right > 10) continue;
      const sum = left + right;
      examples.push(
        item("g1-add", `${left} + ${right} = ?`, String(sum), [
          `Start with ${left} ${count("dot", left)} in the frame.`,
          `Add ${right} ${count("dot", right)} to the ${left} ${count("dot", left)}.`,
          `There are ${sum} dots in all.`,
        ], [
          { kind: "ten-frame", filled: left },
          { kind: "ten-frame", filled: sum },
          { kind: "ten-frame", filled: sum },
        ]),
      );
    }
  }
  return examples;
}

function subExamples(): WorkedExample[] {
  const examples: WorkedExample[] = [];
  for (const start of [8, 9, 7, 6, 10, 5, 4, 3, 2, 1]) {
    for (const take of [3, 2, 4, 1, 5, 6, 7, 8, 9, 10]) {
      if (take > start) continue;
      const left = start - take;
      const line = { kind: "number-line" as const, min: 0, max: 10, from: start, to: left };
      examples.push(
        item("g1-sub", `${start} − ${take} = ?`, String(left), [
          `Start at ${start} on the number line.`,
          `Hop back ${take} ${count("space", take)} from ${start}.`,
          `You land on ${left}.`,
        ], [
          { ...line, to: start },
          line,
          line,
        ]),
      );
    }
  }
  return examples;
}

function compareExamples(): WorkedExample[] {
  const pairs = [
    [1, 6],
    [2, 9],
    [3, 11],
    [4, 13],
    [5, 15],
    [7, 16],
    [8, 18],
    [10, 19],
    [12, 20],
    [6, 17],
    [9, 14],
    [11, 3],
  ];
  return pairs.map(([left, right]) => {
    const greater = Math.max(left, right);
    const lesser = Math.min(left, right);
    const line = { kind: "number-line" as const, min: 0, max: 20, from: lesser, to: greater };
    return item("g1-compare", `Which number is greater, ${left} or ${right}?`, String(greater), [
      `Find ${left} and ${right} on the number line.`,
      `Number ${greater} is farther right than ${lesser}.`,
      `The greater number is ${greater}.`,
    ], [line, line, line]);
  });
}

function shareExamples(): WorkedExample[] {
  const examples: WorkedExample[] = [];
  for (const groups of [3, 4, 2, 5]) {
    for (const each of [2, 3, 4, 1, 5]) {
      const total = groups * each;
      const picture = { kind: "groups" as const, groups, each };
      examples.push(
        item(
          "g1-share",
          `Share ${total} stickers equally among ${groups} children. How many stickers does each child get?`,
          String(each),
          [
            `Make ${groups} groups from ${total} stickers.`,
            `Put ${each} ${count("sticker", each)} in each group.`,
            `Each child gets ${each} ${count("sticker", each)}.`,
          ],
          [picture, picture, picture],
        ),
      );
    }
  }
  return examples;
}

function placeExamples(grade: 1 | 5, place: string): WorkedExample[] {
  const numbers = grade === 1 ? [52, 34, 46, 83, 25, 64, 31, 58, 92, 16, 23, 41, 67, 78, 89, 18, 27, 36] : fiveDigitNumbers();
  const examples: WorkedExample[] = [];
  for (const number of numbers) {
    const digit = digitAt(number, place);
    if (digit === 0) continue;
    const value = digit * 10 ** (PLACE_INDEX[place] ?? 0);
    const chart = placeChart(number, place);
    const visual: ExampleVisual = grade === 1
      ? { kind: "base-ten", tens: digitAt(number, "tens"), ones: digitAt(number, "ones"), focus: place === "ones" ? "ones" : "tens" }
      : chart;
    examples.push(
      item(
        `g${grade}-place-${place}`,
        `In ${formatNumber(number)}, what is the value of the ${place} digit?`,
        String(value),
        [
          `In ${formatNumber(number)}, the ${place} digit is ${digit}.`,
          placeMeaning(place, digit, value),
          `In ${formatNumber(number)}, the ${place} digit is worth ${value}.`,
        ],
        [visual, visual, visual],
      ),
    );
  }
  return examples;
}

/** Five-digit numbers with no zero, so a live answer of 0 is not sitting in the chart. */
function fiveDigitNumbers(): number[] {
  const numbers: number[] = [];
  for (let first = 1; first <= 9; first += 1) {
    for (let second = 1; second <= 9; second += 2) {
      for (let third = 1; third <= 9; third += 3) {
        const fourth = ((first + second) % 9) + 1;
        const fifth = ((first + third) % 9) + 1;
        numbers.push(first * 10000 + second * 1000 + third * 100 + fourth * 10 + fifth);
      }
    }
  }
  return numbers;
}

function placeMeaning(place: string, digit: number, value: number): string {
  const unit =
    place === "ones"
      ? digit === 1
        ? "one"
        : "ones"
      : place === "tens"
        ? digit === 1
          ? "ten"
          : "tens"
        : place === "hundreds"
          ? digit === 1
            ? "hundred"
            : "hundreds"
          : place === "thousands"
            ? digit === 1
              ? "thousand"
              : "thousands"
            : digit === 1
              ? "ten-thousand"
              : "ten-thousands";
  return `That is ${digit} ${unit}, worth ${value}.`;
}

function placeChart(number: number, place: string): ExampleVisual {
  const places = ["ten-thousands", "thousands", "hundreds", "tens", "ones"];
  const labels = ["Ten thousands", "Thousands", "Hundreds", "Tens", "Ones"];
  const width = number >= 10000 ? 5 : number >= 1000 ? 4 : number >= 100 ? 3 : 2;
  const used = places.slice(5 - width);
  return {
    kind: "place-chart",
    labels: labels.slice(5 - width),
    digits: used.map((name) => String(digitAt(number, name))),
    highlight: Math.max(0, used.indexOf(place)),
  };
}

function patternExamples(): WorkedExample[] {
  const examples: WorkedExample[] = [];
  for (const start of [2, 3, 4, 5, 1, 6]) {
    for (const step of [2, 3, 1]) {
      const shown = [0, 1, 2, 3].map((index) => start + index * step);
      const next = start + 4 * step;
      const line = { kind: "number-line" as const, min: shown[0], max: next, from: shown[3], to: next };
      examples.push(
        item("g1-pattern", `What comes next: ${shown.join(", ")}, ?`, String(next), [
          `The jump from ${shown[0]} to ${shown[1]} is ${step}.`,
          `Add ${step} to ${shown[3]}: ${shown[3]} + ${step} = ${next}.`,
          `After ${shown[3]}, the next number is ${next}.`,
        ], [
          { ...line, to: shown[3] },
          line,
          line,
        ]),
      );
    }
  }
  return examples;
}

function measureExamples(): WorkedExample[] {
  const examples: WorkedExample[] = [];
  for (const longer of [6, 8, 5, 7, 9, 4, 10, 12, 3, 11]) {
    for (const shorter of [4, 2, 3, 5, 1, 6, 7, 8, 9]) {
      if (shorter >= longer) continue;
      const diff = longer - shorter;
      const bars = { kind: "lengths" as const, longer, shorter };
      examples.push(
        item(
          "g1-measure",
          `A pencil is ${longer} ${count("paperclip", longer)} long. A crayon is ${shorter} ${count("paperclip", shorter)} long. How many paperclips longer is the pencil?`,
          String(diff),
          [
            `The pencil is ${longer} ${count("paperclip", longer)} long.`,
            `Subtract ${shorter} from ${longer}.`,
            `The pencil is ${diff} ${count("paperclip", diff)} longer.`,
          ],
          [bars, bars, bars],
        ),
      );
    }
  }
  return examples;
}

function multFamily(left: number, right: number): "split" | "tens" | "array" {
  const big = Math.max(left, right);
  if (big > 10 && big % 10 !== 0) return "split";
  if (big >= 10 && big % 10 === 0) return "tens";
  return "array";
}

/** Same method as the question on screen: an array, groups of ten, or a split. */
function multExamples(prompt: string): WorkedExample[] {
  const factors = (prompt.match(/\d+/g) ?? []).map(Number);
  const family = multFamily(factors[0] ?? 0, factors[1] ?? 0);
  const examples: WorkedExample[] = [];
  for (const left of [6, 4, 8, 7, 5, 9, 3, 12, 11, 10, 2]) {
    for (const right of [4, 3, 5, 6, 8, 7, 2, 9, 12, 10, 11]) {
      if (multFamily(left, right) !== family) continue;
      examples.push(multExample(left, right));
    }
  }
  return examples;
}

function multExample(left: number, right: number): WorkedExample {
  const product = left * right;
  const prompt = `${left} × ${right} = ?`;
  const big = Math.max(left, right);
  const small = Math.min(left, right);
  if (big >= 10 && big % 10 === 0) {
    const groups = { kind: "array" as const, rows: small, columns: 10 };
    return item("g5-mult", prompt, String(product), [
      `Count ${small} groups of ten.`,
      `Each of the ${small} groups is worth 10.`,
      `The ${small} groups make ${product}.`,
    ], [groups, groups, groups]);
  }
  if (big > 10) {
    const tens = Math.floor(big / 10) * 10;
    const ones = big % 10;
    const model = { kind: "area-split" as const, by: small, tens, ones };
    return item("g5-mult", prompt, String(product), [
      `Split ${big} into ${tens} and ${ones}.`,
      `Multiply ${small} by ${tens} to get ${small * tens}.`,
      `Multiply ${small} by ${ones} to get ${small * ones}.`,
      `Add ${small * tens} and ${small * ones} to get ${product}.`,
    ], [model, model, model, model]);
  }
  const array = { kind: "array" as const, rows: left, columns: right };
  return item("g5-mult", prompt, String(product), [
    `Make ${left} rows of ${right} dots.`,
    `Each of the ${left} rows has ${right} dots.`,
    `The ${left} rows make ${product}.`,
  ], [array, array, array]);
}

function divisionExamples(): WorkedExample[] {
  const examples: WorkedExample[] = [];
  for (const divisor of [4, 5, 3, 6, 8, 2, 7, 9, 10, 12, 11]) {
    for (const quotient of [3, 4, 2, 5, 6, 7, 8]) {
      for (const remainder of [2, 1, 3, 4, 5]) {
        if (remainder >= divisor) continue;
        const dividend = divisor * quotient + remainder;
        const groups = { kind: "groups" as const, groups: quotient, each: divisor };
        examples.push(
          item("g5-div", `${dividend} ÷ ${divisor} = ?`, `${quotient} R ${remainder}`, [
            `Make ${quotient} groups of ${divisor}.`,
            `Those ${quotient} groups use ${divisor * quotient} of the ${dividend}.`,
            `Take ${divisor * quotient} from ${dividend} to leave ${remainder}.`,
            `Dividing ${dividend} by ${divisor} gives ${quotient} remainder ${remainder}.`,
          ], [groups, groups, groups, groups]),
        );
      }
    }
  }
  return examples;
}

function fractionExamples(op: "+" | "-"): WorkedExample[] {
  const examples: WorkedExample[] = [];
  const sign = op === "+" ? "+" : "−";
  for (const denominator of [8, 6, 4, 5, 10, 12, 3, 7, 9, 11]) {
    for (let left = 1; left < denominator; left += 1) {
      const rightMax = op === "+" ? denominator - left - 1 : left - 1;
      for (let right = 1; right <= rightMax; right += 1) {
        const numerator = op === "+" ? left + right : left - right;
        const answer = `${numerator}/${denominator}`;
        const parts = { kind: "fraction-bars" as const, parts: denominator, left, right, op, phase: "parts" as const };
        const result = { ...parts, phase: "result" as const };
        examples.push(
          item(
            `g5-frac-${op}`,
            `${left}/${denominator} ${sign} ${right}/${denominator} = ?`,
            answer,
            [
              `Both fractions are cut into ${denominator} equal parts.`,
              op === "+"
                ? `Add the top numbers, ${left} and ${right}.`
                : `Subtract the top numbers: ${left} minus ${right}.`,
              op === "+"
                ? `The sum is ${numerator} out of ${denominator}.`
                : `The difference is ${numerator} out of ${denominator}.`,
            ],
            [parts, parts, result],
          ),
        );
      }
    }
  }
  return examples;
}

function equationExamples(): WorkedExample[] {
  const examples: WorkedExample[] = [];
  for (const value of [6, 8, 4, 9, 5, 7, 3, 10, 12, 2, 11]) {
    for (const addend of [4, 3, 5, 2, 6, 7, 1, 8, 9]) {
      const sum = value + addend;
      const line = { kind: "number-line" as const, min: 0, max: sum, from: sum, to: value };
      examples.push(
        item("g5-eq", `n + ${addend} = ${sum}. What is n?`, String(value), [
          `Start with n + ${addend} = ${sum}.`,
          `Subtract ${addend} from ${sum} and from n + ${addend}.`,
          `The value of n is ${value}.`,
        ], [
          { ...line, to: sum },
          line,
          line,
        ]),
      );
    }
  }
  return examples;
}

function decimalExamples(op: "+" | "-"): WorkedExample[] {
  const examples: WorkedExample[] = [];
  const sign = op === "+" ? "+" : "−";
  for (const left of [40, 60, 25, 15, 35, 50, 70, 20, 10, 80, 30, 45]) {
    for (const right of [25, 15, 35, 10, 40, 20, 5, 30, 50]) {
      if (op === "-" && right >= left) continue;
      const high = op === "+" ? left : left;
      const low = right;
      const result = op === "+" ? left + right : left - right;
      if (result <= 0 || result >= 100) continue;
      const grid = { kind: "decimal-grid" as const, first: high, second: low, op };
      const answer = money(result);
      examples.push(
        item("g5-dec", `${money(high)} ${sign} ${money(low)} = ?`, answer, [
          `Line up ${money(high)} and ${money(low)} at the decimal point.`,
          op === "+"
            ? `Add ${high} hundredths and ${low} hundredths.`
            : `Subtract ${low} hundredths from ${high} hundredths.`,
          op === "+"
            ? `The sum is ${result} hundredths, or ${answer}.`
            : `The difference is ${result} hundredths, or ${answer}.`,
        ], [grid, grid, grid]),
      );
    }
  }
  return examples;
}

function triangleExamples(): WorkedExample[] {
  const examples: WorkedExample[] = [];
  for (let base = 2; base <= 12; base += 2) {
    for (let height = 2; height <= 10; height += 1) {
      const area = (base * height) / 2;
      const picture = { kind: "area-shape" as const, shape: "triangle" as const, base, height };
      examples.push(
        item(
          "g5-tri",
          `A triangle has base ${base} cm and height ${height} cm. What is its area in square centimetres?`,
          String(area),
          [
            `The base is ${base} cm and the height is ${height} cm.`,
            `Multiply ${base} by ${height} to get ${base * height}.`,
            `Take half of ${base * height} to get ${area}.`,
            `The area is ${area} square centimetres.`,
          ],
          [picture, picture, picture, picture],
        ),
      );
    }
  }
  return examples;
}

function parallelogramExamples(): WorkedExample[] {
  const examples: WorkedExample[] = [];
  for (let base = 2; base <= 12; base += 1) {
    for (let height = 2; height <= 8; height += 1) {
      const area = base * height;
      const picture = { kind: "area-shape" as const, shape: "parallelogram" as const, base, height };
      examples.push(
        item(
          "g5-para",
          `A parallelogram has base ${base} cm and height ${height} cm. What is its area in square centimetres?`,
          String(area),
          [
            `The base is ${base} cm and the height is ${height} cm.`,
            `Multiply ${base} by ${height} to get ${area}.`,
            `The area is ${area} square centimetres.`,
          ],
          [picture, picture, picture],
        ),
      );
    }
  }
  return examples;
}

function volumeExamples(): WorkedExample[] {
  const examples: WorkedExample[] = [];
  for (const length of [4, 3, 5, 2, 6]) {
    for (const width of [3, 2, 4, 5]) {
      for (const height of [2, 3, 4]) {
        const cubes = length * width;
        const volume = cubes * height;
        const box = { kind: "volume" as const, length, width, height };
        examples.push(
          item(
            "g5-vol",
            `A rectangular prism is ${length} cm by ${width} cm by ${height} cm. What is its volume in cubic centimetres?`,
            String(volume),
            [
              `Multiply the length ${length} by the width ${width}.`,
              `One layer is ${length} by ${width}, so ${cubes} cubes.`,
              `Stack ${height} layers of ${cubes} cubes.`,
              `Multiply ${cubes} by ${height} to get ${volume} cubic centimetres.`,
            ],
            [box, box, box, box],
          ),
        );
      }
    }
  }
  return examples;
}
