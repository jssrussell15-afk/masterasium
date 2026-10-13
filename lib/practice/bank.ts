import type { SupportedGrade } from "@/lib/grades";

export type Worked = {
  prompt: string;
  answer: string;
  steps: string[];
};

export type SkillBlueprint = {
  id: string;
  grade: SupportedGrade;
  title: string;
  summary: string;
  responseHint: string | null;
  example: Worked;
  generate: (rng: () => number, small: boolean) => Worked;
};

export function intBetween(rng: () => number, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1));
}

function span(rng: () => number, min: number, max: number, smallMin: number, smallMax: number, small: boolean): number {
  return intBetween(rng, small ? smallMin : min, small ? smallMax : max);
}

function worked(prompt: string, answer: string, steps: string[]): Worked {
  return { prompt, answer, steps };
}

function pick<T>(rng: () => number, items: readonly T[]): T {
  return items[intBetween(rng, 0, items.length - 1)];
}

function money(cents: number): string {
  return (cents / 100).toFixed(2);
}

const PLACES = [
  { name: "ones", value: 1 },
  { name: "tens", value: 10 },
  { name: "hundreds", value: 100 },
  { name: "thousands", value: 1_000 },
  { name: "ten-thousands", value: 10_000 },
] as const;

function placeValue(rng: () => number, digits: number): Worked {
  const places = PLACES.slice(0, digits).reverse();
  const values = places.map((place, index) => intBetween(rng, index === 0 ? 1 : 0, 9));
  const number = values.reduce((sum, digit, index) => sum + digit * places[index].value, 0);
  const chosen = intBetween(rng, 0, places.length - 1);
  const digit = values[chosen];
  const value = digit * places[chosen].value;
  const formatted = new Intl.NumberFormat("en-CA").format(number);
  return worked(
    `In ${formatted}, what is the value of the ${places[chosen].name} digit?`,
    String(value),
    [
      `The ${places[chosen].name} digit is ${digit}.`,
      `Its value is ${digit} × ${places[chosen].value} = ${value}.`,
    ],
  );
}

function addSub(rng: () => number, limit: number, small: boolean): Worked {
  const cap = small ? Math.min(limit, 30) : limit;
  if (rng() < 0.5) {
    const left = intBetween(rng, 0, cap);
    const right = intBetween(rng, 0, cap - left);
    return worked(`${left} + ${right} = ?`, String(left + right), [
      `Add the ones, then the tens if there are any.`,
      `${left} + ${right} = ${left + right}.`,
    ]);
  }
  const start = intBetween(rng, 0, cap);
  const take = intBetween(rng, 0, start);
  return worked(`${start} − ${take} = ?`, String(start - take), [
    `Start at ${start} and count back ${take}.`,
    `${start} − ${take} = ${start - take}.`,
  ]);
}

function likeFractions(rng: () => number, small: boolean, subtract: boolean): Worked {
  const denominator = span(rng, 3, 12, 3, 6, small);
  if (!subtract) {
    const left = intBetween(rng, 1, denominator - 2);
    const right = intBetween(rng, 1, denominator - 1 - left);
    return worked(
      `${left}/${denominator} + ${right}/${denominator} = ?`,
      `${left + right}/${denominator}`,
      [
        `The denominators are both ${denominator}, so add the numerators.`,
        `${left} + ${right} = ${left + right}, so the sum is ${left + right}/${denominator}.`,
      ],
    );
  }
  const start = intBetween(rng, 2, denominator - 1);
  const take = intBetween(rng, 1, start - 1);
  return worked(
    `${start}/${denominator} − ${take}/${denominator} = ?`,
    `${start - take}/${denominator}`,
    [
      `The denominators match, so subtract the numerators.`,
      `${start} − ${take} = ${start - take}, so the difference is ${start - take}/${denominator}.`,
    ],
  );
}

function rectangleArea(rng: () => number, small: boolean): Worked {
  const length = span(rng, 3, 20, 2, 8, small);
  const width = span(rng, 2, 12, 2, 6, small);
  return worked(
    `A rectangle is ${length} cm long and ${width} cm wide. What is its area in square centimetres?`,
    String(length * width),
    [`Area = length × width.`, `${length} × ${width} = ${length * width}.`],
  );
}

function triangleOrParallelogram(rng: () => number, small: boolean): Worked {
  const base = span(rng, 2, 8, 2, 5, small) * 2;
  const height = span(rng, 2, 12, 2, 6, small);
  if (rng() < 0.5) {
    return worked(
      `A triangle has base ${base} cm and height ${height} cm. What is its area in square centimetres?`,
      String((base * height) / 2),
      [
        `Area of a triangle = 1/2 × base × height.`,
        `1/2 × ${base} × ${height} = ${(base * height) / 2}.`,
      ],
    );
  }
  return worked(
    `A parallelogram has base ${base} cm and height ${height} cm. What is its area in square centimetres?`,
    String(base * height),
    [`Area of a parallelogram = base × height.`, `${base} × ${height} = ${base * height}.`],
  );
}

function prismVolume(rng: () => number, small: boolean): Worked {
  const length = span(rng, 2, 8, 2, 4, small);
  const width = span(rng, 2, 6, 2, 4, small);
  const height = span(rng, 2, 6, 2, 3, small);
  return worked(
    `A rectangular prism is ${length} cm by ${width} cm by ${height} cm. What is its volume in cubic centimetres?`,
    String(length * width * height),
    [
      `Volume = length × width × height.`,
      `${length} × ${width} × ${height} = ${length * width * height}.`,
    ],
  );
}

const CYLINDERS = [
  { radius: 1, height: 2, volume: "6.28" },
  { radius: 2, height: 5, volume: "62.8" },
  { radius: 5, height: 2, volume: "157" },
] as const;

function cylinderVolume(rng: () => number): Worked {
  const shape = pick(rng, CYLINDERS);
  return worked(
    `A cylinder has radius ${shape.radius} cm and height ${shape.height} cm. Use π = 3.14. What is its volume in cubic centimetres?`,
    shape.volume,
    [
      `Volume = π × radius × radius × height.`,
      `3.14 × ${shape.radius} × ${shape.radius} × ${shape.height} = ${shape.volume}.`,
    ],
  );
}

function percentOf(rng: () => number, small: boolean): Worked {
  const percent = pick(rng, [10, 20, 25, 50] as const);
  const base = span(rng, 2, 10, 1, 4, small) * 20;
  const amount = (base * percent) / 100;
  return worked(`What is ${percent}% of ${base}?`, String(amount), [
    `${percent}% means ${percent} out of 100.`,
    `${percent} / 100 × ${base} = ${amount}.`,
  ]);
}

function oneStepEquation(rng: () => number, small: boolean, decimal: boolean): Worked {
  if (!decimal) {
    const value = span(rng, 2, 12, 1, 6, small);
    const addend = span(rng, 1, 9, 1, 4, small);
    return worked(`n + ${addend} = ${value + addend}. What is n?`, String(value), [
      `Subtract ${addend} from both sides.`,
      `n = ${value + addend} − ${addend} = ${value}.`,
    ]);
  }
  const valueTenths = span(rng, 2, 20, 2, 8, small);
  const addTenths = span(rng, 1, 9, 1, 4, small);
  const value = (valueTenths / 10).toFixed(1);
  const add = (addTenths / 10).toFixed(1);
  const sum = ((valueTenths + addTenths) / 10).toFixed(1);
  return worked(`n + ${add} = ${sum}. What is n?`, value, [
    `Subtract ${add} from both sides.`,
    `n = ${sum} − ${add} = ${value}.`,
  ]);
}

function skill(
  id: string,
  grade: SupportedGrade,
  title: string,
  summary: string,
  responseHint: string | null,
  example: Worked,
  generate: SkillBlueprint["generate"],
): SkillBlueprint {
  return { id, grade, title, summary, responseHint, example, generate };
}

export const CATALOG: SkillBlueprint[] = [
  skill(
    "g1-count",
    1,
    "Counting and number recognition to 20",
    "Say the number that comes just before or just after a number up to 20. Each number name matches one quantity.",
    null,
    worked("What number comes just after 14?", "15", ["Count one more than 14.", "14 and one more is 15."]),
    (rng, small) => {
      const number = span(rng, 1, 19, 1, 9, small);
      if (rng() < 0.5 || number === 1) {
        return worked(`What number comes just after ${number}?`, String(number + 1), [
          `Count one more than ${number}.`,
          `${number} and one more is ${number + 1}.`,
        ]);
      }
      return worked(`What number comes just before ${number}?`, String(number - 1), [
        `Count one back from ${number}.`,
        `The number before ${number} is ${number - 1}.`,
      ]);
    },
  ),
  skill(
    "g1-add-10",
    1,
    "Addition within 10",
    "Add two numbers whose sum is 10 or less. Put the numbers together and count the total.",
    null,
    worked("4 + 3 = ?", "7", ["Start at 4 and count on 3.", "5, 6, 7. The sum is 7."]),
    (rng, small) => {
      const left = span(rng, 0, 10, 0, 5, small);
      const right = intBetween(rng, 0, (small ? 5 : 10) - Math.min(left, small ? 5 : 10));
      const safeRight = Math.min(right, 10 - left);
      return worked(`${left} + ${safeRight} = ?`, String(left + safeRight), [
        `Start at ${left} and count on ${safeRight}.`,
        `${left} + ${safeRight} = ${left + safeRight}.`,
      ]);
    },
  ),
  skill(
    "g1-sub-10",
    1,
    "Subtraction within 10",
    "Subtract from a number up to 10. Count back, or think of the missing part.",
    null,
    worked("8 − 3 = ?", "5", ["Start at 8 and count back 3.", "7, 6, 5. The difference is 5."]),
    (rng, small) => {
      const start = span(rng, 1, 10, 1, 6, small);
      const take = intBetween(rng, 0, start);
      return worked(`${start} − ${take} = ?`, String(start - take), [
        `Start at ${start} and count back ${take}.`,
        `${start} − ${take} = ${start - take}.`,
      ]);
    },
  ),
  skill(
    "g1-compare",
    1,
    "Comparing numbers to 20",
    "Look at two numbers up to 20 and name the greater one. A number that comes later in the count is greater.",
    null,
    worked("Which number is greater, 9 or 14?", "14", [
      "14 comes later in the count than 9.",
      "14 is greater.",
    ]),
    (rng, small) => {
      const cap = small ? 10 : 20;
      const left = intBetween(rng, 0, cap);
      let right = intBetween(rng, 0, cap);
      if (right === left) right = left === cap ? left - 1 : left + 1;
      const greater = Math.max(left, right);
      return worked(`Which number is greater, ${left} or ${right}?`, String(greater), [
        `Compare the tens, then the ones.`,
        `${greater} is farther along the number line, so it is greater.`,
      ]);
    },
  ),
  skill(
    "g1-share",
    1,
    "Equal sharing",
    "Share a set into equal groups. Each group gets the same number, with none left over.",
    null,
    worked("Share 8 apples equally among 2 children. How many apples does each child get?", "4", [
      "Split 8 into 2 equal groups.",
      "8 ÷ 2 = 4, so each child gets 4 apples.",
    ]),
    (rng, small) => {
      const groups = span(rng, 2, 5, 2, 3, small);
      const each = span(rng, 1, 5, 1, 3, small);
      const total = groups * each;
      return worked(
        `Share ${total} stickers equally among ${groups} children. How many stickers does each child get?`,
        String(each),
        [
          `Make ${groups} equal groups from ${total} stickers.`,
          `${total} ÷ ${groups} = ${each}.`,
        ],
      );
    },
  ),
  skill(
    "g1-place",
    1,
    "Place value (tens and ones)",
    "A two-digit number is made of tens and ones. The tens digit tells how many groups of 10.",
    "Write the value, such as 40, not the digit by itself.",
    worked("In 47, what is the value of the tens digit?", "40", [
      "The tens digit is 4.",
      "4 tens = 4 × 10 = 40.",
    ]),
    (rng) => placeValue(rng, 2),
  ),
  skill(
    "g1-patterns",
    1,
    "Simple patterns",
    "A simple pattern grows by the same amount each time. Find the step, then apply it once more.",
    null,
    worked("What comes next: 2, 4, 6, 8, ?", "10", [
      "The pattern adds 2 each time.",
      "8 + 2 = 10.",
    ]),
    (rng, small) => {
      const start = span(rng, 1, 8, 1, 4, small);
      const step = span(rng, 1, 4, 1, 2, small);
      const shown = [0, 1, 2, 3].map((index) => start + index * step);
      const next = start + 4 * step;
      return worked(`What comes next: ${shown.join(", ")}, ?`, String(next), [
        `Each number grows by ${step}.`,
        `${shown[3]} + ${step} = ${next}.`,
      ]);
    },
  ),
  skill(
    "g1-measure",
    1,
    "Measurement (length with non-standard units)",
    "Length can be measured with same-sized units such as paperclips. Compare lengths by comparing the unit counts.",
    null,
    worked(
      "A pencil is 6 paperclips long. A crayon is 4 paperclips long. How many paperclips longer is the pencil?",
      "2",
      ["Subtract the shorter length from the longer length.", "6 − 4 = 2."],
    ),
    (rng, small) => {
      const longer = span(rng, 4, 12, 3, 7, small);
      const shorter = intBetween(rng, 1, longer - 1);
      return worked(
        `A pencil is ${longer} paperclips long. A crayon is ${shorter} paperclips long. How many paperclips longer is the pencil?`,
        String(longer - shorter),
        [
          "Subtract the shorter length from the longer length.",
          `${longer} − ${shorter} = ${longer - shorter}.`,
        ],
      );
    },
  ),

  skill(
    "g2-add-sub",
    2,
    "Addition and subtraction within 100",
    "Add and subtract numbers up to 100. Line up the ones and tens, and regroup when a column goes over 9 or below 0.",
    null,
    worked("46 + 27 = ?", "73", ["6 + 7 = 13. Write 3 and carry 1 ten.", "4 tens + 2 tens + 1 ten = 7 tens. The sum is 73."]),
    (rng, small) => addSub(rng, 100, small),
  ),
  skill(
    "g2-place",
    2,
    "Place value to 100",
    "Numbers up to 100 are built from tens and ones. The place of a digit changes its value.",
    "Write the value, such as 70, not the digit by itself.",
    worked("In 83, what is the value of the tens digit?", "80", ["The tens digit is 8.", "8 × 10 = 80."]),
    (rng) => placeValue(rng, 2),
  ),
  skill(
    "g2-groups",
    2,
    "Equal groups",
    "Equal groups have the same number in each group. Multiply the number of groups by the size of one group.",
    null,
    worked("There are 4 bags with 3 apples in each bag. How many apples are there?", "12", [
      "4 equal groups of 3 is 4 × 3.",
      "4 × 3 = 12.",
    ]),
    (rng, small) => {
      const groups = span(rng, 2, 8, 2, 4, small);
      const size = span(rng, 2, 8, 2, 4, small);
      return worked(
        `There are ${groups} bags with ${size} apples in each bag. How many apples are there?`,
        String(groups * size),
        [`${groups} equal groups of ${size} is ${groups} × ${size}.`, `${groups} × ${size} = ${groups * size}.`],
      );
    },
  ),
  skill(
    "g2-compare",
    2,
    "Comparing and ordering numbers to 100",
    "Order numbers to 100 by comparing tens first, then ones. The greatest number has the largest value.",
    null,
    worked("Which number is greatest: 28, 82, or 18?", "82", [
      "Compare the tens: 2, 8, and 1.",
      "8 tens is the most, so 82 is greatest.",
    ]),
    (rng, small) => {
      const cap = small ? 40 : 100;
      const values = new Set<number>();
      while (values.size < 3) values.add(intBetween(rng, 0, cap));
      const list = [...values];
      const greatest = Math.max(...list);
      return worked(`Which number is greatest: ${list.join(", ")}?`, String(greatest), [
        "Compare the tens digits first.",
        `${greatest} has the greatest value.`,
      ]);
    },
  ),
  skill(
    "g2-measure",
    2,
    "Simple measurement",
    "Centimetres measure length. When part of a length is removed, subtract to find what is left.",
    null,
    worked("A ribbon is 30 cm long. You cut off 12 cm. How many centimetres are left?", "18", [
      "Subtract the piece that was cut off.",
      "30 − 12 = 18.",
    ]),
    (rng, small) => {
      const start = span(rng, 20, 90, 12, 30, small);
      const cut = intBetween(rng, 1, start - 1);
      return worked(
        `A ribbon is ${start} cm long. You cut off ${cut} cm. How many centimetres are left?`,
        String(start - cut),
        ["Subtract the piece that was cut off.", `${start} − ${cut} = ${start - cut}.`],
      );
    },
  ),
  skill(
    "g2-fractions",
    2,
    "Fractions as equal parts",
    "A fraction names equal parts of one whole. The bottom number tells how many equal parts, and the top tells how many are chosen.",
    "Write a fraction such as 1/4.",
    worked("A bar is split into 4 equal parts and 1 part is shaded. What fraction is shaded?", "1/4", [
      "The whole is split into 4 equal parts.",
      "1 of those parts is shaded, so the fraction is 1/4.",
    ]),
    (rng, small) => {
      const parts = span(rng, 2, 8, 2, 4, small);
      const shaded = intBetween(rng, 1, parts - 1);
      return worked(
        `A bar is split into ${parts} equal parts and ${shaded} part${shaded === 1 ? " is" : "s are"} shaded. What fraction is shaded?`,
        `${shaded}/${parts}`,
        [
          `The whole has ${parts} equal parts.`,
          `${shaded} of them are shaded, so the fraction is ${shaded}/${parts}.`,
        ],
      );
    },
  ),
  skill(
    "g2-even-odd",
    2,
    "Even and odd numbers",
    "Even numbers can be split into two equal groups. Odd numbers have one left over.",
    "Answer even or odd.",
    worked("Is 14 even or odd?", "even", ["14 ends in 4.", "Numbers that end in 0, 2, 4, 6, or 8 are even."]),
    (rng, small) => {
      const number = span(rng, 1, 40, 1, 12, small);
      const even = number % 2 === 0;
      return worked(`Is ${number} even or odd?`, even ? "even" : "odd", [
        `${number} ends in ${number % 10}.`,
        even
          ? "It ends in 0, 2, 4, 6, or 8, so it is even."
          : "It ends in 1, 3, 5, 7, or 9, so it is odd.",
      ]);
    },
  ),
  skill(
    "g2-data",
    2,
    "Introduction to data",
    "A tally or pictograph counts how many. Add the counts, or compare them, to answer a question about the data.",
    null,
    worked("Monday has 3 stars and Tuesday has 5 stars. How many stars are there in all?", "8", [
      "Add the two counts.",
      "3 + 5 = 8.",
    ]),
    (rng, small) => {
      const monday = span(rng, 1, 9, 1, 5, small);
      const tuesday = span(rng, 1, 9, 1, 5, small);
      return worked(
        `Monday has ${monday} stars and Tuesday has ${tuesday} stars. How many stars are there in all?`,
        String(monday + tuesday),
        ["Add the two counts.", `${monday} + ${tuesday} = ${monday + tuesday}.`],
      );
    },
  ),

  skill(
    "g3-mult",
    3,
    "Multiplication facts to 10×10",
    "Multiplication facts join equal groups. Knowing the facts to 10 × 10 makes larger calculations faster.",
    null,
    worked("6 × 7 = ?", "42", ["6 groups of 7 is 6 × 7.", "6 × 7 = 42."]),
    (rng, small) => {
      const left = span(rng, 1, 10, 1, 5, small);
      const right = span(rng, 1, 10, 1, 5, small);
      return worked(`${left} × ${right} = ?`, String(left * right), [
        `${left} groups of ${right} is ${left} × ${right}.`,
        `${left} × ${right} = ${left * right}.`,
      ]);
    },
  ),
  skill(
    "g3-div-rem",
    3,
    "Division with remainders",
    "Sometimes a division does not come out even. The quotient is how many full groups fit, and the remainder is what is left.",
    "Write the remainder as 3 R 2.",
    worked("17 ÷ 5 = ?", "3 R 2", ["5 fits into 17 three times, because 5 × 3 = 15.", "17 − 15 = 2 left over, so the answer is 3 R 2."]),
    (rng, small) => {
      const divisor = span(rng, 2, 9, 2, 5, small);
      const quotient = span(rng, 2, 9, 1, 4, small);
      const remainder = intBetween(rng, 1, divisor - 1);
      const dividend = divisor * quotient + remainder;
      return worked(`${dividend} ÷ ${divisor} = ?`, `${quotient} R ${remainder}`, [
        `${divisor} × ${quotient} = ${divisor * quotient}.`,
        `${dividend} − ${divisor * quotient} = ${remainder} left over, so the answer is ${quotient} R ${remainder}.`,
      ]);
    },
  ),
  skill(
    "g3-fractions",
    3,
    "Fractions as equal parts",
    "The denominator counts the equal parts in the whole. The numerator counts how many of those parts are being used.",
    "Write a fraction such as 3/8.",
    worked("A shape is divided into 8 equal parts and 3 are shaded. What fraction is shaded?", "3/8", [
      "There are 8 equal parts in the whole.",
      "3 are shaded, so the fraction is 3/8.",
    ]),
    (rng, small) => {
      const parts = span(rng, 2, 12, 2, 6, small);
      const shaded = intBetween(rng, 1, parts);
      return worked(
        `A shape is divided into ${parts} equal parts and ${shaded} are shaded. What fraction is shaded?`,
        `${shaded}/${parts}`,
        [`The whole has ${parts} equal parts.`, `${shaded} are shaded, so the fraction is ${shaded}/${parts}.`],
      );
    },
  ),
  skill(
    "g3-place",
    3,
    "Place value to 1,000",
    "In a number up to 1,000, each digit has a hundreds, tens, or ones value. Multiply the digit by its place.",
    "Write the value, such as 400, not the digit by itself.",
    worked("In 482, what is the value of the hundreds digit?", "400", ["The hundreds digit is 4.", "4 × 100 = 400."]),
    (rng) => placeValue(rng, 3),
  ),
  skill(
    "g3-add-sub",
    3,
    "Addition and subtraction within 1,000",
    "Add and subtract up to 1,000 by working one place at a time. Regroup tens, hundreds, and ones when you need to.",
    null,
    worked("250 + 175 = ?", "425", ["0 + 5 = 5 ones.", "5 tens + 7 tens = 12 tens. Write 2 tens and carry 1 hundred.", "2 hundreds + 1 hundred + 1 hundred = 4 hundreds. The sum is 425."]),
    (rng, small) => addSub(rng, 1_000, small),
  ),
  skill(
    "g3-perimeter",
    3,
    "Perimeter of rectangles",
    "Perimeter is the distance around a rectangle. Add the length and width, then double that sum.",
    null,
    worked("A rectangle is 6 cm long and 4 cm wide. What is its perimeter in centimetres?", "20", [
      "Add one length and one width: 6 + 4 = 10.",
      "The perimeter is 2 × 10 = 20.",
    ]),
    (rng, small) => {
      const length = span(rng, 2, 20, 2, 8, small);
      const width = span(rng, 2, 12, 2, 6, small);
      return worked(
        `A rectangle is ${length} cm long and ${width} cm wide. What is its perimeter in centimetres?`,
        String(2 * (length + width)),
        [
          `Add one length and one width: ${length} + ${width} = ${length + width}.`,
          `The perimeter is 2 × ${length + width} = ${2 * (length + width)}.`,
        ],
      );
    },
  ),
  skill(
    "g3-time",
    3,
    "Time to the minute",
    "Read hours and minutes, then move forward by counting minutes. 60 minutes makes another hour.",
    "Write the time as h:mm, such as 2:35.",
    worked("It is 2:15. What time is it 20 minutes later?", "2:35", [
      "15 minutes + 20 minutes = 35 minutes.",
      "The hour stays 2, so the time is 2:35.",
    ]),
    (rng, small) => {
      const hour = intBetween(rng, 1, 12);
      const minute = span(rng, 0, 50, 0, 20, small);
      const add = span(rng, 5, 40, 5, 15, small);
      const total = minute + add;
      const nextHour = total >= 60 ? (hour === 12 ? 1 : hour + 1) : hour;
      const nextMinute = total >= 60 ? total - 60 : total;
      const start = `${hour}:${String(minute).padStart(2, "0")}`;
      const end = `${nextHour}:${String(nextMinute).padStart(2, "0")}`;
      return worked(`It is ${start}. What time is it ${add} minutes later?`, end, [
        total >= 60
          ? `${minute} + ${add} = ${total} minutes, which is 1 hour and ${nextMinute} minutes.`
          : `${minute} + ${add} = ${nextMinute} minutes.`,
        `The time is ${end}.`,
      ]);
    },
  ),
  skill(
    "g3-data",
    3,
    "Simple data and bar graphs",
    "A bar graph uses the height of a bar as a count. Read the counts, then add or compare them.",
    null,
    worked("A bar graph shows 4 cats and 7 dogs. How many animals are shown?", "11", [
      "Add the two bar heights.",
      "4 + 7 = 11.",
    ]),
    (rng, small) => {
      const cats = span(rng, 1, 12, 1, 6, small);
      const dogs = span(rng, 1, 12, 1, 6, small);
      if (rng() < 0.5) {
        return worked(
          `A bar graph shows ${cats} cats and ${dogs} dogs. How many animals are shown?`,
          String(cats + dogs),
          ["Add the two bar heights.", `${cats} + ${dogs} = ${cats + dogs}.`],
        );
      }
      const more = Math.max(cats, dogs);
      const less = Math.min(cats, dogs);
      const label = cats === more ? "cats" : "dogs";
      return worked(
        `A bar graph shows ${cats} cats and ${dogs} dogs. How many more ${label} than ${label === "cats" ? "dogs" : "cats"}?`,
        String(more - less),
        ["Subtract the smaller count from the larger count.", `${more} − ${less} = ${more - less}.`],
      );
    },
  ),

  skill(
    "g4-mult",
    4,
    "Multi-digit multiplication",
    "Multiply a two-digit number by breaking it into tens and ones. Multiply each part, then add the partial products.",
    null,
    worked("23 × 4 = ?", "92", ["20 × 4 = 80 and 3 × 4 = 12.", "80 + 12 = 92."]),
    (rng, small) => {
      const left = span(rng, 12, 40, 12, 20, small);
      const right = span(rng, 3, 9, 2, 4, small);
      const tens = Math.floor(left / 10) * 10;
      const ones = left % 10;
      return worked(`${left} × ${right} = ?`, String(left * right), [
        `${tens} × ${right} = ${tens * right} and ${ones} × ${right} = ${ones * right}.`,
        `${tens * right} + ${ones * right} = ${left * right}.`,
      ]);
    },
  ),
  skill(
    "g4-div",
    4,
    "Long division introduction",
    "Long division splits a number into equal groups of a one-digit divisor. Ask how many times the divisor fits, then multiply and subtract.",
    null,
    worked("84 ÷ 4 = ?", "21", ["4 fits into 8 tens two times: 4 × 20 = 80.", "4 is left, and 4 × 1 = 4. The quotient is 21."]),
    (rng, small) => {
      const divisor = span(rng, 2, 9, 2, 5, small);
      const quotient = span(rng, 11, 25, 6, 12, small);
      const dividend = divisor * quotient;
      return worked(`${dividend} ÷ ${divisor} = ?`, String(quotient), [
        `Ask how many times ${divisor} fits into ${dividend}.`,
        `${divisor} × ${quotient} = ${dividend}, so the quotient is ${quotient}.`,
      ]);
    },
  ),
  skill(
    "g4-equiv",
    4,
    "Equivalent fractions",
    "Equivalent fractions name the same amount. Multiply the numerator and the denominator by the same number.",
    "Write the missing fraction, such as 4/8.",
    worked("1/2 = ?/8. What fraction completes the equation?", "4/8", [
      "2 × 4 = 8, so multiply the numerator by 4 as well.",
      "1 × 4 = 4, so 1/2 = 4/8.",
    ]),
    (rng, small) => {
      const numerator = span(rng, 1, 4, 1, 2, small);
      const denominator = numerator + span(rng, 1, 4, 1, 2, small);
      const factor = span(rng, 2, 5, 2, 3, small);
      return worked(
        `${numerator}/${denominator} = ?/${denominator * factor}. What fraction completes the equation?`,
        `${numerator * factor}/${denominator * factor}`,
        [
          `${denominator} × ${factor} = ${denominator * factor}, so multiply the numerator by ${factor} too.`,
          `${numerator} × ${factor} = ${numerator * factor}, so the fraction is ${numerator * factor}/${denominator * factor}.`,
        ],
      );
    },
  ),
  skill(
    "g4-place",
    4,
    "Place value to 10,000",
    "Each place to the left is worth ten times as much. Find the digit, then multiply by its place value.",
    "Write the value, such as 3000, not the digit by itself.",
    worked("In 3,482, what is the value of the thousands digit?", "3000", [
      "The thousands digit is 3.",
      "3 × 1,000 = 3,000.",
    ]),
    (rng) => placeValue(rng, 4),
  ),
  skill(
    "g4-frac",
    4,
    "Adding and subtracting fractions with like denominators",
    "When denominators match, add or subtract the numerators and keep the denominator.",
    "Write a fraction such as 3/5. You do not need to simplify.",
    worked("1/5 + 2/5 = ?", "3/5", ["The denominators are both 5.", "1 + 2 = 3, so the sum is 3/5."]),
    (rng, small) => likeFractions(rng, small, rng() < 0.5),
  ),
  skill(
    "g4-area",
    4,
    "Area of rectangles",
    "Area counts the square units inside a rectangle. Multiply the length by the width.",
    null,
    worked("A rectangle is 8 cm long and 3 cm wide. What is its area in square centimetres?", "24", [
      "Area = length × width.",
      "8 × 3 = 24.",
    ]),
    (rng, small) => rectangleArea(rng, small),
  ),
  skill(
    "g4-round",
    4,
    "Rounding numbers",
    "To round, look at the digit to the right of the place you are rounding to. 5 or more rounds up. Less than 5 stays the same.",
    null,
    worked("Round 346 to the nearest ten.", "350", [
      "The ones digit is 6, which is 5 or more.",
      "Round the tens up from 4 to 5. 346 rounds to 350.",
    ]),
    (rng, small) => {
      const place = rng() < 0.5 ? 10 : 100;
      const number = span(rng, place === 10 ? 15 : 120, place === 10 ? 95 : 900, 20, 80, small);
      const rounded = Math.round(number / place) * place;
      const name = place === 10 ? "ten" : "hundred";
      return worked(`Round ${number} to the nearest ${name}.`, String(rounded), [
        `Look at the digit just to the right of the ${name}s place.`,
        `${number} rounds to ${rounded}.`,
      ]);
    },
  ),
  skill(
    "g4-decimals",
    4,
    "Introduction to decimals",
    "A decimal uses a point to show parts smaller than one. One tenth is 0.1, and tenths sit in the first decimal place.",
    null,
    worked("Write 7 tenths as a decimal.", "0.7", [
      "7 tenths means 7 in the tenths place.",
      "That decimal is 0.7.",
    ]),
    (rng) => {
      const tenths = intBetween(rng, 1, 9);
      if (rng() < 0.5) {
        return worked(`Write ${tenths} tenths as a decimal.`, (tenths / 10).toFixed(1), [
          `${tenths} tenths means ${tenths} in the tenths place.`,
          `That decimal is ${(tenths / 10).toFixed(1)}.`,
        ]);
      }
      const ones = intBetween(rng, 1, 9);
      const sum = ((ones * 10 + tenths) / 10).toFixed(1);
      return worked(`${ones} + ${tenths}/10 = ? Write a decimal.`, sum, [
        `${tenths}/10 = ${(tenths / 10).toFixed(1)}.`,
        `${ones} + ${(tenths / 10).toFixed(1)} = ${sum}.`,
      ]);
    },
  ),

  skill(
    "g5-mult",
    5,
    "Multiplication facts to 12×12",
    "Multiplication facts through 12 × 12 are the building blocks for larger products. Recall the fact, or build it from a nearby fact.",
    null,
    worked("8 × 12 = ?", "96", ["8 × 10 = 80 and 8 × 2 = 16.", "80 + 16 = 96."]),
    (rng, small) => {
      const left = span(rng, 2, 12, 2, 6, small);
      const right = span(rng, 2, 12, 2, 6, small);
      return worked(`${left} × ${right} = ?`, String(left * right), [
        `${left} groups of ${right} is ${left} × ${right}.`,
        `${left} × ${right} = ${left * right}.`,
      ]);
    },
  ),
  skill(
    "g5-div-rem",
    5,
    "Division with remainders",
    "Divide into equal groups, then record what is left. The remainder is always smaller than the divisor.",
    "Write the remainder as 3 R 2.",
    worked("29 ÷ 6 = ?", "4 R 5", ["6 × 4 = 24.", "29 − 24 = 5, so the answer is 4 R 5."]),
    (rng, small) => {
      const divisor = span(rng, 2, 12, 2, 6, small);
      const quotient = span(rng, 2, 12, 1, 5, small);
      const remainder = intBetween(rng, 1, divisor - 1);
      const dividend = divisor * quotient + remainder;
      return worked(`${dividend} ÷ ${divisor} = ?`, `${quotient} R ${remainder}`, [
        `${divisor} × ${quotient} = ${divisor * quotient}.`,
        `${dividend} − ${divisor * quotient} = ${remainder}, so the answer is ${quotient} R ${remainder}.`,
      ]);
    },
  ),
  skill(
    "g5-frac",
    5,
    "Adding and subtracting fractions with like denominators",
    "Keep the shared denominator. Add or subtract only the numerators.",
    "Write a fraction such as 3/5. You do not need to simplify.",
    worked("3/8 + 2/8 = ?", "5/8", ["The denominators are both 8.", "3 + 2 = 5, so the sum is 5/8."]),
    (rng, small) => likeFractions(rng, small, rng() < 0.5),
  ),
  skill(
    "g5-place",
    5,
    "Place value to 100,000",
    "A digit's place tells which power of ten it counts. Move one place left and the value becomes ten times as large.",
    "Write the value, such as 40000, not the digit by itself.",
    worked("In 54,083, what is the value of the ten-thousands digit?", "50000", [
      "The ten-thousands digit is 5.",
      "5 × 10,000 = 50,000.",
    ]),
    (rng) => placeValue(rng, 5),
  ),
  skill(
    "g5-equations",
    5,
    "One-step equations",
    "An equation stays balanced when you do the same thing to both sides. Undo addition with subtraction.",
    null,
    worked("n + 7 = 15. What is n?", "8", ["Subtract 7 from both sides.", "n = 15 − 7 = 8."]),
    (rng, small) => oneStepEquation(rng, small, false),
  ),
  skill(
    "g5-decimals",
    5,
    "Decimals to hundredths",
    "Line up the decimal points before you add or subtract hundredths. The point in the answer stays in the same place.",
    null,
    worked("0.40 + 0.25 = ?", "0.65", ["Line up the decimal points.", "40 hundredths + 25 hundredths = 65 hundredths, which is 0.65."]),
    (rng, small) => {
      const left = span(rng, 1, 250, 1, 40, small);
      const right = span(rng, 1, 250, 1, 40, small);
      if (rng() < 0.5) {
        return worked(`${money(left)} + ${money(right)} = ?`, money(left + right), [
          "Line up the decimal points.",
          `${money(left)} + ${money(right)} = ${money(left + right)}.`,
        ]);
      }
      const high = Math.max(left, right);
      const low = Math.min(left, right);
      return worked(`${money(high)} − ${money(low)} = ?`, money(high - low), [
        "Line up the decimal points.",
        `${money(high)} − ${money(low)} = ${money(high - low)}.`,
      ]);
    },
  ),
  skill(
    "g5-area",
    5,
    "Area of triangles and parallelograms",
    "A parallelogram's area is base times height. A triangle is half of that parallelogram, so use 1/2 × base × height.",
    null,
    worked("A triangle has base 8 cm and height 5 cm. What is its area in square centimetres?", "20", [
      "Area = 1/2 × base × height.",
      "1/2 × 8 × 5 = 20.",
    ]),
    (rng, small) => triangleOrParallelogram(rng, small),
  ),
  skill(
    "g5-volume",
    5,
    "Volume of rectangular prisms",
    "Volume counts the unit cubes that fill a prism. Multiply length, width, and height.",
    null,
    worked("A prism is 4 cm by 3 cm by 2 cm. What is its volume in cubic centimetres?", "24", [
      "Volume = length × width × height.",
      "4 × 3 × 2 = 24.",
    ]),
    (rng, small) => prismVolume(rng, small),
  ),

  skill(
    "g6-frac",
    6,
    "Multiplying and dividing fractions",
    "To multiply fractions, multiply the numerators and the denominators. To divide, multiply by the reciprocal of the second fraction.",
    "Write a fraction such as 3/8. You do not need to simplify.",
    worked("1/2 × 3/4 = ?", "3/8", ["Multiply the numerators and the denominators.", "1 × 3 = 3 and 2 × 4 = 8, so the product is 3/8."]),
    (rng, small) => {
      const a = span(rng, 1, 5, 1, 3, small);
      const b = span(rng, 2, 6, 2, 4, small);
      const c = span(rng, 1, 5, 1, 3, small);
      const d = span(rng, 2, 6, 2, 4, small);
      if (rng() < 0.5) {
        return worked(`${a}/${b} × ${c}/${d} = ?`, `${a * c}/${b * d}`, [
          "Multiply the numerators and the denominators.",
          `${a} × ${c} = ${a * c} and ${b} × ${d} = ${b * d}, so the product is ${a * c}/${b * d}.`,
        ]);
      }
      return worked(`${a}/${b} ÷ ${c}/${d} = ?`, `${a * d}/${b * c}`, [
        `Dividing by ${c}/${d} is multiplying by ${d}/${c}.`,
        `${a}/${b} × ${d}/${c} = ${a * d}/${b * c}.`,
      ]);
    },
  ),
  skill(
    "g6-decimals",
    6,
    "Decimals to thousandths",
    "Thousandths are the third digit after the decimal point. Line the points up, including the thousandths place, before you add.",
    null,
    worked("0.125 + 0.250 = ?", "0.375", [
      "Line up the decimal points.",
      "125 thousandths + 250 thousandths = 375 thousandths, which is 0.375.",
    ]),
    (rng, small) => {
      const left = span(rng, 1, 400, 1, 80, small);
      const right = span(rng, 1, 400, 1, 80, small);
      const format = (thousandths: number) => (thousandths / 1000).toFixed(3);
      if (rng() < 0.5) {
        return worked(`${format(left)} + ${format(right)} = ?`, format(left + right), [
          "Line up the decimal points through the thousandths.",
          `${format(left)} + ${format(right)} = ${format(left + right)}.`,
        ]);
      }
      const high = Math.max(left, right);
      const low = Math.min(left, right);
      return worked(`${format(high)} − ${format(low)} = ?`, format(high - low), [
        "Line up the decimal points through the thousandths.",
        `${format(high)} − ${format(low)} = ${format(high - low)}.`,
      ]);
    },
  ),
  skill(
    "g6-ratios",
    6,
    "Ratios and unit rates",
    "A ratio compares two amounts. A unit rate tells the amount for one item. Scale both parts of a ratio by the same factor.",
    null,
    worked("The ratio of red to blue is 2:3. There are 4 red counters. How many blue counters are there?", "6", [
      "4 red counters is 2 × 2, so each part is 2 counters.",
      "Blue is 3 parts: 3 × 2 = 6.",
    ]),
    (rng, small) => {
      if (rng() < 0.5) {
        const redParts = span(rng, 2, 5, 2, 3, small);
        const blueParts = span(rng, 2, 6, 2, 4, small);
        const scale = span(rng, 2, 5, 2, 3, small);
        return worked(
          `The ratio of red to blue is ${redParts}:${blueParts}. There are ${redParts * scale} red counters. How many blue counters are there?`,
          String(blueParts * scale),
          [
            `Each part is ${scale}, because ${redParts} × ${scale} = ${redParts * scale}.`,
            `Blue is ${blueParts} parts: ${blueParts} × ${scale} = ${blueParts * scale}.`,
          ],
        );
      }
      const price = span(rng, 2, 9, 2, 5, small);
      const count = span(rng, 2, 6, 2, 4, small);
      return worked(
        `${count} notebooks cost $${count * price}. How many dollars does 1 notebook cost?`,
        String(price),
        [`A unit rate is the cost for 1 notebook.`, `${count * price} ÷ ${count} = ${price}.`],
      );
    },
  ),
  skill(
    "g6-area",
    6,
    "Area of triangles and parallelograms",
    "Use the height that is perpendicular to the base. Triangle area is half of base times height. Parallelogram area is base times height.",
    null,
    worked("A parallelogram has base 9 cm and height 4 cm. What is its area in square centimetres?", "36", [
      "Area = base × height.",
      "9 × 4 = 36.",
    ]),
    (rng, small) => triangleOrParallelogram(rng, small),
  ),
  skill(
    "g6-equations",
    6,
    "One-step equations with decimals",
    "Undo a decimal addition by subtracting the same decimal from both sides. The two sides stay equal.",
    null,
    worked("n + 0.4 = 1.1. What is n?", "0.7", ["Subtract 0.4 from both sides.", "n = 1.1 − 0.4 = 0.7."]),
    (rng, small) => oneStepEquation(rng, small, true),
  ),
  skill(
    "g6-percent",
    6,
    "Percent of a number",
    "Percent means out of 100. Convert the percent to a fraction of 100, then multiply by the number.",
    null,
    worked("What is 20% of 80?", "16", ["20% = 20/100.", "20/100 × 80 = 16."]),
    (rng, small) => percentOf(rng, small),
  ),
  skill(
    "g6-surface",
    6,
    "Surface area of rectangular prisms",
    "A prism has three pairs of faces. Find the area of each pair, then add the three results.",
    null,
    worked("A prism is 4 cm by 3 cm by 2 cm. What is its surface area in square centimetres?", "52", [
      "Two faces of 4 × 3, two of 4 × 2, and two of 3 × 2.",
      "2×12 + 2×8 + 2×6 = 24 + 16 + 12 = 52.",
    ]),
    (rng, small) => {
      const length = span(rng, 2, 8, 2, 4, small);
      const width = span(rng, 2, 6, 2, 4, small);
      const height = span(rng, 2, 6, 2, 3, small);
      const area = 2 * (length * width + length * height + width * height);
      return worked(
        `A prism is ${length} cm by ${width} cm by ${height} cm. What is its surface area in square centimetres?`,
        String(area),
        [
          `Front and back: 2 × ${length} × ${height} = ${2 * length * height}.`,
          `Top and bottom: 2 × ${length} × ${width} = ${2 * length * width}.`,
          `The two ends: 2 × ${width} × ${height} = ${2 * width * height}.`,
          `Add them: ${area}.`,
        ],
      );
    },
  ),
  skill(
    "g6-data",
    6,
    "Mean median and mode",
    "The mean is the average. The median is the middle value once the numbers are ordered. The mode is the value that appears most often.",
    null,
    worked("What is the median of 2, 4, 4, 6, 9?", "4", [
      "The numbers are already in order.",
      "The middle value of five numbers is the third one, which is 4.",
    ]),
    (rng, small) => {
      const center = span(rng, 4, 12, 3, 7, small);
      const kind = intBetween(rng, 0, 2);
      if (kind === 0) {
        const values = [center - 2, center, center + 2];
        return worked(`What is the mean of ${values.join(", ")}?`, String(center), [
          `Add the numbers: ${values[0]} + ${center} + ${values[2]} = ${center * 3}.`,
          `Divide by 3: ${center * 3} ÷ 3 = ${center}.`,
        ]);
      }
      if (kind === 1) {
        const values = [center - 3, center - 1, center, center + 2, center + 4];
        return worked(`What is the median of ${values.join(", ")}?`, String(center), [
          "The list is already in order.",
          `The middle of five numbers is ${center}.`,
        ]);
      }
      const other = center + 3;
      const values = [other, center, center, other + 1];
      return worked(`What is the mode of ${values.join(", ")}?`, String(center), [
        `${center} appears twice, and the other numbers appear once.`,
        `The mode is ${center}.`,
      ]);
    },
  ),

  skill(
    "g7-integers",
    7,
    "Integers (add subtract multiply)",
    "Integers include numbers below zero. Adding a negative moves left, and a negative times a negative is positive.",
    null,
    worked("−4 + 9 = ?", "5", ["Start at −4 and move 9 to the right.", "−4 + 9 = 5."]),
    (rng, small) => {
      const left = span(rng, 1, 12, 1, 6, small) * (rng() < 0.5 ? -1 : 1);
      const right = span(rng, 1, 12, 1, 6, small) * (rng() < 0.5 ? -1 : 1);
      const operation = intBetween(rng, 0, 2);
      if (operation === 0) {
        return worked(`${left} + ${right} = ?`, String(left + right), [
          left < 0 ? `Start at ${left} on the number line.` : `Start at ${left}.`,
          `${left} + ${right} = ${left + right}.`,
        ]);
      }
      if (operation === 1) {
        return worked(`${left} − ${right} = ?`, String(left - right), [
          `Subtracting ${right} is the same as adding ${-right}.`,
          `${left} − ${right} = ${left - right}.`,
        ]);
      }
      const sign = left * right < 0 ? "A negative times a positive is negative." : "The signs match, so the product is positive.";
      return worked(`${left} × ${right} = ?`, String(left * right), [
        sign,
        `${Math.abs(left)} × ${Math.abs(right)} = ${Math.abs(left * right)}, so the product is ${left * right}.`,
      ]);
    },
  ),
  skill(
    "g7-equations",
    7,
    "Solving two-step equations",
    "Undo the added term first, then undo the multiplication. Do the same operation to both sides.",
    null,
    worked("2n + 3 = 11. What is n?", "4", ["Subtract 3: 2n = 8.", "Divide by 2: n = 4."]),
    (rng, small) => {
      const value = span(rng, 2, 9, 1, 5, small);
      const factor = span(rng, 2, 6, 2, 3, small);
      const addend = span(rng, 1, 8, 1, 4, small);
      const total = factor * value + addend;
      return worked(`${factor}n + ${addend} = ${total}. What is n?`, String(value), [
        `Subtract ${addend}: ${factor}n = ${total - addend}.`,
        `Divide by ${factor}: n = ${value}.`,
      ]);
    },
  ),
  skill(
    "g7-proportion",
    7,
    "Proportional relationships",
    "In a proportion, both amounts scale by the same factor. Find the cost or amount for one, then multiply.",
    null,
    worked("4 tickets cost $8. How many dollars do 10 tickets cost?", "20", [
      "One ticket costs 8 ÷ 4 = $2.",
      "10 tickets cost 10 × 2 = $20.",
    ]),
    (rng, small) => {
      const unit = span(rng, 2, 8, 2, 4, small);
      const first = span(rng, 2, 6, 2, 3, small);
      const second = first + span(rng, 1, 5, 1, 3, small);
      return worked(
        `${first} tickets cost $${first * unit}. How many dollars do ${second} tickets cost?`,
        String(second * unit),
        [
          `One ticket costs ${first * unit} ÷ ${first} = $${unit}.`,
          `${second} tickets cost ${second} × ${unit} = $${second * unit}.`,
        ],
      );
    },
  ),
  skill(
    "g7-percent",
    7,
    "Percent",
    "A percent of a price can be a discount or a part of a whole. Find the percent amount, then subtract it when the question asks for a sale price.",
    null,
    worked("A shirt costs $40 and is 25% off. What is the sale price in dollars?", "30", [
      "25% of 40 is 10.",
      "The sale price is 40 − 10 = 30.",
    ]),
    (rng, small) => {
      const quote = percentOf(rng, small);
      if (rng() < 0.5) return quote;
      const match = quote.prompt.match(/(\d+)% of (\d+)/);
      const percent = Number(match?.[1] ?? 10);
      const base = Number(match?.[2] ?? 20);
      const off = (base * percent) / 100;
      return worked(
        `A shirt costs $${base} and is ${percent}% off. What is the sale price in dollars?`,
        String(base - off),
        [`${percent}% of ${base} is ${off}.`, `The sale price is ${base} − ${off} = ${base - off}.`],
      );
    },
  ),
  skill(
    "g7-circles",
    7,
    "Area and circumference of circles",
    "Circumference is the distance around a circle: 2 × π × radius. Area is π × radius × radius. Use π = 3.14.",
    null,
    worked("A circle has radius 5 cm. Use π = 3.14. What is its circumference in centimetres?", "31.4", [
      "Circumference = 2 × π × radius.",
      "2 × 3.14 × 5 = 31.4.",
    ]),
    (rng) => {
      const circles = [
        { radius: 5, circumference: "31.4", area: "78.5" },
        { radius: 10, circumference: "62.8", area: "314" },
        { radius: 2, circumference: "12.56", area: "12.56" },
      ] as const;
      const circle = pick(rng, circles);
      if (rng() < 0.5 || circle.radius === 2) {
        return worked(
          `A circle has radius ${circle.radius} cm. Use π = 3.14. What is its circumference in centimetres?`,
          circle.circumference,
          ["Circumference = 2 × π × radius.", `2 × 3.14 × ${circle.radius} = ${circle.circumference}.`],
        );
      }
      return worked(
        `A circle has radius ${circle.radius} cm. Use π = 3.14. What is its area in square centimetres?`,
        circle.area,
        ["Area = π × radius × radius.", `3.14 × ${circle.radius} × ${circle.radius} = ${circle.area}.`],
      );
    },
  ),
  skill(
    "g7-volume",
    7,
    "Volume of prisms and cylinders",
    "Prism volume is length × width × height. Cylinder volume is π × radius × radius × height. Use π = 3.14.",
    null,
    worked("A cylinder has radius 2 cm and height 5 cm. Use π = 3.14. What is its volume?", "62.8", [
      "Volume = π × radius × radius × height.",
      "3.14 × 2 × 2 × 5 = 62.8.",
    ]),
    (rng, small) => (rng() < 0.5 ? prismVolume(rng, small) : cylinderVolume(rng)),
  ),
  skill(
    "g7-probability",
    7,
    "Probability",
    "Probability is the number of favourable outcomes over the total number of equally likely outcomes.",
    "Write a fraction such as 2/5.",
    worked("A bag has 2 red marbles and 3 blue marbles. What is the probability of picking red?", "2/5", [
      "There are 2 + 3 = 5 marbles in all.",
      "2 are red, so the probability is 2/5.",
    ]),
    (rng, small) => {
      const red = span(rng, 1, 6, 1, 3, small);
      const blue = span(rng, 1, 6, 1, 3, small);
      return worked(
        `A bag has ${red} red marbles and ${blue} blue marbles. What is the probability of picking red?`,
        `${red}/${red + blue}`,
        [
          `There are ${red} + ${blue} = ${red + blue} marbles in all.`,
          `${red} are red, so the probability is ${red}/${red + blue}.`,
        ],
      );
    },
  ),
  skill(
    "g7-order",
    7,
    "Order of operations with integers",
    "Multiply or divide before you add or subtract. Work from left to right when the operations have the same rank.",
    null,
    worked("−2 + 3 × 4 = ?", "10", ["Multiply first: 3 × 4 = 12.", "Then add: −2 + 12 = 10."]),
    (rng, small) => {
      const factor = span(rng, 2, 6, 2, 4, small);
      const times = span(rng, 2, 6, 2, 4, small);
      const start = span(rng, 1, 8, 1, 4, small) * (rng() < 0.5 ? -1 : 1);
      const product = factor * times;
      return worked(`${start} + ${factor} × ${times} = ?`, String(start + product), [
        `Multiply first: ${factor} × ${times} = ${product}.`,
        `Then add: ${start} + ${product} = ${start + product}.`,
      ]);
    },
  ),

  skill(
    "g8-equations",
    8,
    "Solving multi-step equations",
    "Simplify the parentheses, then undo addition and multiplication. Each step keeps both sides equal.",
    null,
    worked("2(n + 3) + 4 = 18. What is n?", "4", [
      "Subtract 4: 2(n + 3) = 14.",
      "Divide by 2: n + 3 = 7.",
      "Subtract 3: n = 4.",
    ]),
    (rng, small) => {
      const value = span(rng, 2, 9, 1, 5, small);
      const inside = span(rng, 1, 6, 1, 3, small);
      const extra = span(rng, 1, 8, 1, 4, small);
      const total = 2 * (value + inside) + extra;
      return worked(`2(n + ${inside}) + ${extra} = ${total}. What is n?`, String(value), [
        `Subtract ${extra}: 2(n + ${inside}) = ${total - extra}.`,
        `Divide by 2: n + ${inside} = ${(total - extra) / 2}.`,
        `Subtract ${inside}: n = ${value}.`,
      ]);
    },
  ),
  skill(
    "g8-linear",
    8,
    "Linear relations",
    "A linear relation has the form y = mx + b. Substitute the x-value, multiply by the rate, then add the start value.",
    null,
    worked("A line follows y = 2x + 1. What is y when x = 4?", "9", [
      "Substitute x = 4.",
      "y = 2 × 4 + 1 = 9.",
    ]),
    (rng, small) => {
      const rate = span(rng, 2, 6, 2, 4, small);
      const start = span(rng, 0, 8, 0, 3, small);
      const input = span(rng, 1, 8, 1, 4, small);
      const output = rate * input + start;
      return worked(
        `A line follows y = ${rate}x + ${start}. What is y when x = ${input}?`,
        String(output),
        [`Substitute x = ${input}.`, `y = ${rate} × ${input} + ${start} = ${output}.`],
      );
    },
  ),
  skill(
    "g8-pythagoras",
    8,
    "Pythagorean theorem",
    "In a right triangle, the square of the hypotenuse equals the sum of the squares of the two legs.",
    null,
    worked("A right triangle has legs 3 cm and 4 cm. How long is the hypotenuse in centimetres?", "5", [
      "3² + 4² = 9 + 16 = 25.",
      "The hypotenuse is the square root of 25, which is 5.",
    ]),
    (rng) => {
      const triples = [
        [3, 4, 5],
        [5, 12, 13],
        [6, 8, 10],
        [8, 15, 17],
        [7, 24, 25],
      ] as const;
      const [a, b, c] = pick(rng, triples);
      return worked(
        `A right triangle has legs ${a} cm and ${b} cm. How long is the hypotenuse in centimetres?`,
        String(c),
        [`${a}² + ${b}² = ${a * a} + ${b * b} = ${c * c}.`, `The hypotenuse is ${c}.`],
      );
    },
  ),
  skill(
    "g8-volume",
    8,
    "Volume of prisms and cylinders",
    "Use the prism formula length × width × height, or the cylinder formula π × radius² × height with π = 3.14.",
    null,
    worked("A prism is 5 cm by 4 cm by 3 cm. What is its volume in cubic centimetres?", "60", [
      "Volume = length × width × height.",
      "5 × 4 × 3 = 60.",
    ]),
    (rng, small) => (rng() < 0.5 ? prismVolume(rng, small) : cylinderVolume(rng)),
  ),
  skill(
    "g8-interest",
    8,
    "Financial literacy (simple interest)",
    "Simple interest is principal × rate × time. Write the rate as a decimal before you multiply.",
    null,
    worked("A family saves $200 at 5% simple interest for 2 years. How many dollars of interest do they earn?", "20", [
      "5% = 0.05.",
      "Interest = 200 × 0.05 × 2 = 20.",
    ]),
    (rng) => {
      const principal = pick(rng, [100, 200, 400] as const);
      const rate = pick(rng, [5, 10] as const);
      const years = pick(rng, [1, 2, 3] as const);
      const interest = (principal * rate * years) / 100;
      return worked(
        `A family saves $${principal} at ${rate}% simple interest for ${years} year${years === 1 ? "" : "s"}. How many dollars of interest do they earn?`,
        String(interest),
        [
          `${rate}% = ${rate / 100}.`,
          `Interest = ${principal} × ${rate / 100} × ${years} = ${interest}.`,
        ],
      );
    },
  ),
  skill(
    "g8-integers",
    8,
    "Multiplying and dividing integers",
    "Same signs give a positive result. Different signs give a negative result. Divide using the related multiplication fact.",
    null,
    worked("−6 × −4 = ?", "24", ["Both factors are negative, so the product is positive.", "6 × 4 = 24."]),
    (rng, small) => {
      const left = span(rng, 2, 12, 2, 6, small) * (rng() < 0.5 ? -1 : 1);
      const right = span(rng, 2, 12, 2, 6, small) * (rng() < 0.5 ? -1 : 1);
      if (rng() < 0.5) {
        const positive = left * right > 0;
        return worked(`${left} × ${right} = ?`, String(left * right), [
          positive ? "The signs match, so the product is positive." : "The signs differ, so the product is negative.",
          `${Math.abs(left)} × ${Math.abs(right)} = ${Math.abs(left * right)}, so the product is ${left * right}.`,
        ]);
      }
      const quotient = right;
      const dividend = left * right;
      return worked(`${dividend} ÷ ${left} = ?`, String(quotient), [
        `${left} × ${quotient} = ${dividend}.`,
        `So ${dividend} ÷ ${left} = ${quotient}.`,
      ]);
    },
  ),
  skill(
    "g8-surface",
    8,
    "Surface area of cylinders",
    "A cylinder has two circular bases and a curved side. Add 2 × π × radius² to 2 × π × radius × height. Use π = 3.14.",
    null,
    worked("A cylinder has radius 2 cm and height 3 cm. Use π = 3.14. What is its surface area?", "62.8", [
      "Two bases: 2 × 3.14 × 2 × 2 = 25.12.",
      "The side: 2 × 3.14 × 2 × 3 = 37.68.",
      "25.12 + 37.68 = 62.8.",
    ]),
    (rng) => {
      const shapes = [
        { radius: 2, height: 3, area: "62.8" },
        { radius: 1, height: 5, area: "37.68" },
        { radius: 5, height: 2, area: "219.8" },
      ] as const;
      const shape = pick(rng, shapes);
      const bases = (2 * 314 * shape.radius * shape.radius) / 100;
      const side = (2 * 314 * shape.radius * shape.height) / 100;
      return worked(
        `A cylinder has radius ${shape.radius} cm and height ${shape.height} cm. Use π = 3.14. What is its surface area?`,
        shape.area,
        [
          `Two bases: 2 × 3.14 × ${shape.radius} × ${shape.radius} = ${bases}.`,
          `The side: 2 × 3.14 × ${shape.radius} × ${shape.height} = ${side}.`,
          `${bases} + ${side} = ${shape.area}.`,
        ],
      );
    },
  ),
  skill(
    "g8-data",
    8,
    "Data analysis",
    "The range is the difference between the greatest and least values. The mean is the sum divided by how many numbers there are.",
    null,
    worked("The scores are 12, 15, 18, and 15. What is the range?", "6", [
      "The greatest score is 18 and the least is 12.",
      "18 − 12 = 6.",
    ]),
    (rng, small) => {
      const low = span(rng, 4, 20, 2, 8, small);
      const high = low + span(rng, 3, 15, 2, 6, small);
      const mid = low + Math.floor((high - low) / 2);
      if (rng() < 0.5) {
        return worked(`The scores are ${low}, ${mid}, ${high}, and ${mid}. What is the range?`, String(high - low), [
          `The greatest score is ${high} and the least is ${low}.`,
          `${high} − ${low} = ${high - low}.`,
        ]);
      }
      const values = [low, mid, high];
      const mean = (low + mid + high) / 3;
      if (!Number.isInteger(mean)) {
        return worked(`The scores are ${low}, ${mid}, ${high}, and ${mid}. What is the range?`, String(high - low), [
          `The greatest score is ${high} and the least is ${low}.`,
          `${high} − ${low} = ${high - low}.`,
        ]);
      }
      return worked(`What is the mean of ${values.join(", ")}?`, String(mean), [
        `Add the scores: ${low} + ${mid} + ${high} = ${low + mid + high}.`,
        `Divide by 3: ${low + mid + high} ÷ 3 = ${mean}.`,
      ]);
    },
  ),
];
