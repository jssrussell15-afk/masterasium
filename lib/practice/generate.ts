import type { Question } from "@/lib/practice/types";
import { skillById } from "@/lib/practice/skills";

export function intBetween(rng: () => number, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1));
}

function question(
  skillId: string,
  prompt: string,
  answer: string,
): Question {
  return {
    skillId,
    prompt,
    answer,
    responseHint: skillById(skillId)?.responseHint ?? null,
  };
}

function countOn(rng: () => number): Question {
  const number = intBetween(rng, 1, 49);
  return question("g1-count-on", `What number comes just after ${number}?`, String(number + 1));
}

function differentInt(rng: () => number, min: number, max: number, avoid: number): number {
  let value = intBetween(rng, min, max);
  for (let guard = 0; value === avoid && guard < 20; guard += 1) {
    value = intBetween(rng, min, max);
  }
  return value === avoid ? (avoid === max ? min : value + 1) : value;
}

function compare(rng: () => number): Question {
  const left = intBetween(rng, 0, 50);
  const right = differentInt(rng, 0, 50, left);
  const greater = Math.max(left, right);
  return question(
    "g1-compare",
    `Which number is greater, ${left} or ${right}?`,
    String(greater),
  );
}

function makeTen(rng: () => number): Question {
  const known = intBetween(rng, 0, 10);
  return question("g1-make-ten", `What do you add to ${known} to make 10?`, String(10 - known));
}

function addWithin10(rng: () => number): Question {
  const left = intBetween(rng, 0, 10);
  const right = intBetween(rng, 0, 10 - left);
  return question("g1-add-within-10", `${left} + ${right} = ?`, String(left + right));
}

function subWithin10(rng: () => number): Question {
  const start = intBetween(rng, 0, 10);
  const take = intBetween(rng, 0, start);
  return question("g1-sub-within-10", `${start} − ${take} = ?`, String(start - take));
}

function addWithin20(rng: () => number): Question {
  const left = intBetween(rng, 1, 19);
  const right = intBetween(rng, 1, 20 - left);
  return question("g1-add-within-20", `${left} + ${right} = ?`, String(left + right));
}

const PLACE_NAMES = [
  { name: "hundred-thousands", value: 100_000 },
  { name: "ten-thousands", value: 10_000 },
  { name: "thousands", value: 1_000 },
  { name: "hundreds", value: 100 },
  { name: "tens", value: 10 },
  { name: "ones", value: 1 },
] as const;

function placeValue(rng: () => number): Question {
  const digits = PLACE_NAMES.map((_, index) =>
    index === 0 ? intBetween(rng, 1, 9) : intBetween(rng, 0, 9),
  );
  const place = PLACE_NAMES[intBetween(rng, 0, PLACE_NAMES.length - 1)];
  const number = digits.reduce((sum, digit, index) => sum + digit * PLACE_NAMES[index].value, 0);
  const formatted = new Intl.NumberFormat("en-CA").format(number);
  const value = digits[PLACE_NAMES.indexOf(place)] * place.value;
  return question(
    "g5-place-value",
    `In ${formatted}, what is the value of the digit in the ${place.name} place?`,
    String(value),
  );
}

function multFacts(rng: () => number): Question {
  const left = intBetween(rng, 2, 12);
  const right = intBetween(rng, 2, 12);
  return question("g5-mult-facts", `${left} × ${right} = ?`, String(left * right));
}

function divFacts(rng: () => number): Question {
  const divisor = intBetween(rng, 2, 12);
  const quotient = intBetween(rng, 2, 12);
  return question(
    "g5-div-facts",
    `${divisor * quotient} ÷ ${divisor} = ?`,
    String(quotient),
  );
}

function multTwoByOne(rng: () => number): Question {
  const left = intBetween(rng, 12, 99);
  const right = intBetween(rng, 2, 9);
  return question("g5-mult-2-by-1", `${left} × ${right} = ?`, String(left * right));
}

function compareFractions(rng: () => number): Question {
  const denominator = intBetween(rng, 3, 12);
  const left = intBetween(rng, 1, denominator - 1);
  const right = differentInt(rng, 1, denominator - 1, left);
  const greater = Math.max(left, right);
  return question(
    "g5-compare-fractions",
    `Which fraction is greater, ${left}/${denominator} or ${right}/${denominator}?`,
    `${greater}/${denominator}`,
  );
}

function formatDecimal(value: number): string {
  return (Math.round(value * 100) / 100).toFixed(2);
}

function decimals(rng: () => number): Question {
  const left = intBetween(rng, 1, 900) / 100;
  const right = intBetween(rng, 1, 900) / 100;
  if (rng() < 0.5) {
    return question(
      "g5-decimals",
      `${formatDecimal(left)} + ${formatDecimal(right)} = ?`,
      formatDecimal(left + right),
    );
  }
  const high = Math.max(left, right);
  const low = Math.min(left, right);
  return question(
    "g5-decimals",
    `${formatDecimal(high)} - ${formatDecimal(low)} = ?`,
    formatDecimal(high - low),
  );
}

const GENERATORS: Record<string, (rng: () => number) => Question> = {
  "g1-count-on": countOn,
  "g1-compare": compare,
  "g1-make-ten": makeTen,
  "g1-add-within-10": addWithin10,
  "g1-sub-within-10": subWithin10,
  "g1-add-within-20": addWithin20,
  "g5-place-value": placeValue,
  "g5-mult-facts": multFacts,
  "g5-div-facts": divFacts,
  "g5-mult-2-by-1": multTwoByOne,
  "g5-compare-fractions": compareFractions,
  "g5-decimals": decimals,
};

export function generateQuestion(skillId: string, rng: () => number = Math.random): Question {
  const generate = GENERATORS[skillId];
  if (!generate) {
    throw new Error(`No question generator for skill ${skillId}.`);
  }
  return generate(rng);
}
