import { isMastered, type SkillCard } from "@/lib/practice/scheduler";

/**
 * Optional depth at the current skill. A finished set is stored on its own
 * and is not a practice attempt, so the 10-question, 80% mastery bar stays put.
 * The lesson check (4 of 5) is a different gate and does not open this set.
 */

export const GO_FURTHER_SIZE = 6;

export const GO_FURTHER_SKILLS = ["g3-place", "g3-add-sub", "g3-mult", "g3-fractions"] as const;

export type GoFurtherSkillId = (typeof GO_FURTHER_SKILLS)[number];

const PHRASE: Record<GoFurtherSkillId, string> = {
  "g3-add-sub": "adding with regrouping",
  "g3-mult": "multiplication",
  "g3-fractions": "fractions",
  "g3-place": "place value",
};

export function isGoFurtherSkill(skillId: string): skillId is GoFurtherSkillId {
  return (GO_FURTHER_SKILLS as readonly string[]).includes(skillId);
}

/** Mastery here is the practice bar: 10 questions at 80%. */
export function goFurtherOffered(skillId: string, card: SkillCard | undefined): boolean {
  return isGoFurtherSkill(skillId) && isMastered(card);
}

export function wentFurtherLine(skillId: string): string | null {
  if (!isGoFurtherSkill(skillId)) return null;
  return `Went further on ${PHRASE[skillId]}`;
}

export function orderedFurtherIds(ids: readonly string[]): GoFurtherSkillId[] {
  return GO_FURTHER_SKILLS.filter((id) => ids.includes(id));
}

export function parentGoFurtherLine(ids: readonly string[]): string | null {
  const phrases = orderedFurtherIds(ids).map((id) => PHRASE[id]);
  if (phrases.length === 0) return null;
  return `Go further sets done: ${phrases.join(", ")}.`;
}

export function goFurtherTableMissing(error: { message: string; code?: string }): boolean {
  const message = error.message.toLowerCase();
  return error.code === "42P01" || error.code === "PGRST205" || message.includes("go_further_sets");
}

export function tallyGoFurther(results: readonly boolean[]): { asked: number; correct: number } {
  return { asked: results.length, correct: results.filter(Boolean).length };
}

/** The skill card is returned unchanged. Go further never records a practice attempt. */
export function withGoFurtherTally<T extends SkillCard>(
  card: T,
  results: readonly boolean[],
): { card: T; asked: number; correct: number } {
  const tally = tallyGoFurther(results);
  return { card, asked: tally.asked, correct: tally.correct };
}

export type ReasonChoice = { id: string; text: string; right: boolean };

export type StrategyOp =
  | { type: "sum"; parts: number[] }
  | { type: "difference"; from: number; take: number }
  | { type: "product"; factors: number[] }
  | { type: "fraction"; num: number; den: number }
  | { type: "place"; hundreds: number; tens: number; ones: number };

export type StrategyCard = { id: string; text: string; op: StrategyOp };

export type NumberTarget = { kind: "number"; value: number };
export type FractionTarget = { kind: "fraction"; num: number; den: number };
export type StrategyTarget = NumberTarget | FractionTarget;

export type CompareQuestion = {
  kind: "compare";
  id: string;
  skillId: GoFurtherSkillId;
  prompt: string;
  hint: string;
  show: string[];
  left: string;
  right: string;
  leftNum: number;
  leftDen: number;
  rightNum: number;
  rightDen: number;
  reasons: ReasonChoice[];
  values: number[];
};

export type BalanceQuestion = {
  kind: "balance";
  id: string;
  skillId: GoFurtherSkillId;
  prompt: string;
  hint: string;
  show: string[];
  blank: string;
  fraction: boolean;
  values: number[];
};

export type TrueFalseQuestion = {
  kind: "true-false";
  id: string;
  skillId: GoFurtherSkillId;
  prompt: string;
  hint: string;
  show: string[];
  statement: string;
  truth: boolean;
  reasons: ReasonChoice[];
  values: number[];
};

export type ManyWaysQuestion = {
  kind: "many-ways";
  id: string;
  skillId: GoFurtherSkillId;
  prompt: string;
  hint: string;
  show: string[];
  need: number;
  cards: StrategyCard[];
  target: StrategyTarget;
  values: number[];
};

export type BarQuestion = {
  kind: "bar";
  id: string;
  skillId: GoFurtherSkillId;
  prompt: string;
  hint: string;
  show: string[];
  chips: string[];
  partA: string;
  partB: string;
  whole: string;
  answer: string;
  fraction: boolean;
  values: number[];
};

export type PatternQuestion = {
  kind: "pattern";
  id: string;
  skillId: GoFurtherSkillId;
  prompt: string;
  hint: string;
  show: string[];
  mode: "next" | "digits";
  answer: string;
  fraction: boolean;
  values: number[];
};

export type GoFurtherQuestion =
  | CompareQuestion
  | BalanceQuestion
  | TrueFalseQuestion
  | ManyWaysQuestion
  | BarQuestion
  | PatternQuestion;

export type GoFurtherResponse =
  | { kind: "compare"; side: "left" | "right"; reasonId: string }
  | { kind: "balance"; value: string }
  | { kind: "true-false"; verdict: boolean; reasonId: string }
  | { kind: "many-ways"; cardIds: string[] }
  | { kind: "bar"; partA: string; partB: string; whole: string; value: string }
  | { kind: "pattern"; value: string };

export const DIGIT_PUZZLE_SUM = 1173;

const DIGIT_PROMPT =
  "Use each of 1, 2, 3, 4, 5, and 6 once. Make two 3-digit numbers with the biggest sum. What is that sum?";

export function strategyMatches(op: StrategyOp, target: StrategyTarget): boolean {
  if (op.type === "fraction") {
    return target.kind === "fraction" && op.den > 0 && target.den > 0 && op.num * target.den === op.den * target.num;
  }
  if (target.kind !== "number") return false;
  if (op.type === "sum") return op.parts.reduce((sum, part) => sum + part, 0) === target.value;
  if (op.type === "difference") return op.from - op.take === target.value;
  if (op.type === "product") return op.factors.reduce((product, factor) => product * factor, 1) === target.value;
  return op.hundreds * 100 + op.tens * 10 + op.ones === target.value;
}

export function withinCoreRange(skillId: GoFurtherSkillId, values: readonly number[]): boolean {
  const cap = skillId === "g3-mult" ? 100 : skillId === "g3-fractions" ? 12 : 1000;
  return values.every((value) => Number.isFinite(value) && value >= 0 && value <= cap);
}

export function checkGoFurther(
  question: GoFurtherQuestion,
  response: GoFurtherResponse,
): { correct: boolean; note: string } {
  if (response.kind !== question.kind) return { correct: false, note: "Have another look." };
  const correct = matches(question, response);
  return { correct, note: correct ? "That matches." : "Have another look." };
}

export function goFurtherSeed(skillId: string, day: string): number {
  let hash = 0;
  const text = `${skillId}|${day}`;
  for (let index = 0; index < text.length; index += 1) hash = (hash * 33 + text.charCodeAt(index)) >>> 0;
  return hash || 1;
}

export function buildGoFurtherSet(skillId: string, seed: number): GoFurtherQuestion[] {
  if (!isGoFurtherSkill(skillId)) return [];
  const rng = mulberry32(seed || 1);
  const questions: GoFurtherQuestion[] = [
    makeCompare(skillId, rng, `${skillId}-compare`),
    makeBalance(skillId, rng, `${skillId}-balance`),
    makeTrueFalse(skillId, rng, `${skillId}-true-false`),
    makeManyWays(skillId, rng, `${skillId}-many-ways`),
    makeBar(skillId, rng, `${skillId}-bar`),
    makePattern(skillId, rng, `${skillId}-pattern`, seed),
  ];
  for (const question of questions) {
    if (question.show.length < 3 || question.show.length > 4) {
      throw new Error(`Show me steps for ${question.kind}`);
    }
    if (question.kind === "compare" && question.leftNum * question.rightDen === question.rightNum * question.leftDen) {
      throw new Error("Compare sides match");
    }
  }
  return questions;
}

function matches(question: GoFurtherQuestion, response: GoFurtherResponse): boolean {
  if (question.kind === "compare" && response.kind === "compare") {
    const leftBigger = question.leftNum * question.rightDen > question.rightNum * question.leftDen;
    const side = leftBigger ? "left" : "right";
    const reason = question.reasons.find((item) => item.id === response.reasonId);
    return response.side === side && Boolean(reason?.right);
  }
  if (question.kind === "balance" && response.kind === "balance") {
    return clean(response.value) === clean(question.blank);
  }
  if (question.kind === "true-false" && response.kind === "true-false") {
    const reason = question.reasons.find((item) => item.id === response.reasonId);
    return response.verdict === question.truth && Boolean(reason?.right);
  }
  if (question.kind === "many-ways" && response.kind === "many-ways") {
    const unique = [...new Set(response.cardIds)];
    if (unique.length !== question.need) return false;
    const picked = unique.flatMap((id) => {
      const card = question.cards.find((item) => item.id === id);
      return card ? [card] : [];
    });
    return picked.length === question.need && picked.every((card) => strategyMatches(card.op, question.target));
  }
  if (question.kind === "bar" && response.kind === "bar") {
    const placed = [response.partA, response.partB].sort();
    const expected = [question.partA, question.partB].sort();
    return (
      placed[0] === expected[0] &&
      placed[1] === expected[1] &&
      response.whole === question.whole &&
      clean(response.value) === clean(question.answer)
    );
  }
  if (question.kind === "pattern" && response.kind === "pattern") {
    return clean(response.value) === clean(question.answer);
  }
  return false;
}

function makeCompare(skillId: GoFurtherSkillId, rng: () => number, id: string): CompareQuestion {
  if (skillId === "g3-mult") return compareMult(rng, id);
  if (skillId === "g3-fractions") return compareFractions(rng, id);
  if (skillId === "g3-place") return comparePlace(rng, id);
  return compareAdd(rng, id);
}

function compareAdd(rng: () => number, id: string): CompareQuestion {
  const a = intBetween(rng, 20, 70);
  const b = intBetween(rng, 20, 70);
  const rise = intBetween(rng, 1, 4);
  let drop = intBetween(rng, 1, 4);
  if (drop === rise) drop = rise === 4 ? 1 : rise + 1;
  const c = a + rise;
  const d = b - drop;
  const leftValue = a + b;
  const rightValue = c + d;
  const grown = rise > drop;
  const right = grown
    ? `${c} is ${rise} more than ${a}, and ${d} is only ${drop} less than ${b}.`
    : `${d} is ${drop} less than ${b}, and ${c} is only ${rise} more than ${a}.`;
  const mix = grown
    ? `${d} got smaller, so the first total would be bigger.`
    : `${c} got bigger, so the second total would be bigger.`;
  return sided(rng, {
    id,
    skillId: "g3-add-sub",
    left: `${a} + ${b}`,
    right: `${c} + ${d}`,
    leftNum: leftValue,
    leftDen: 1,
    rightNum: rightValue,
    rightDen: 1,
    lead: "Which is bigger",
    tail: "Decide without adding.",
    hint: "Watch how much one part grows and the other shrinks.",
    show: ["Look at both changes.", "See which change is larger.", "Pick that side."],
    rightText: right,
    mix,
    other: "The expression written first is the bigger one.",
    values: [a, b, c, d, rise, drop, leftValue, rightValue],
  });
}

function compareMult(rng: () => number, id: string): CompareQuestion {
  const groups = intBetween(rng, 2, 9);
  const each = intBetween(rng, 2, 8);
  const more = each + 1;
  return sided(rng, {
    id,
    skillId: "g3-mult",
    left: `${groups} × ${each}`,
    right: `${groups} × ${more}`,
    leftNum: groups * each,
    leftDen: 1,
    rightNum: groups * more,
    rightDen: 1,
    lead: "Which is bigger",
    tail: "Decide without multiplying.",
    hint: "The number of groups is the same. Look at the size of a group.",
    show: ["Count the groups.", "Compare one group.", "Pick the larger group."],
    rightText: `Both use ${groups} equal groups. ${more} in a group is more than ${each}.`,
    mix: `The first product is bigger because ${each} comes first.`,
    other: `They match because both start with ${groups}.`,
    values: [groups, each, more, groups * each, groups * more],
  });
}

function compareFractions(rng: () => number, id: string): CompareQuestion {
  const den = intBetween(rng, 4, 12);
  const low = intBetween(rng, 1, den - 2);
  const high = intBetween(rng, low + 1, den - 1);
  return sided(rng, {
    id,
    skillId: "g3-fractions",
    left: `${low}/${den}`,
    right: `${high}/${den}`,
    leftNum: low,
    leftDen: den,
    rightNum: high,
    rightDen: den,
    lead: "Which is bigger",
    tail: "Decide without a new picture.",
    hint: "The denominator says the parts are the same size.",
    show: ["Check the equal parts.", "Compare how many parts.", "Pick the greater share."],
    rightText: `The parts are the same size. ${high} parts is more than ${low === 1 ? "1 part" : `${low} parts`}.`,
    mix: "A smaller numerator makes the bigger fraction.",
    other: "Matching denominators means the fractions match.",
    values: [low, high, den],
  });
}

function comparePlace(rng: () => number, id: string): CompareQuestion {
  const hundreds = intBetween(rng, 2, 9);
  const tens = intBetween(rng, 1, 9);
  const leftValue = hundreds * 100;
  const rightValue = (hundreds - 1) * 100 + tens * 10;
  return sided(rng, {
    id,
    skillId: "g3-place",
    left: `${hundreds} hundreds`,
    right: `${hundreds - 1} hundreds and ${tens} tens`,
    leftNum: leftValue,
    leftDen: 1,
    rightNum: rightValue,
    rightDen: 1,
    lead: "Which is bigger",
    tail: "Decide without adding.",
    hint: "Ten tens make one hundred.",
    show: ["Look at the hundreds.", "A few tens stay smaller.", "Pick the bigger amount."],
    rightText: `${tens} tens is less than 1 hundred, so ${hundreds} hundreds is bigger.`,
    mix: "The longer name is the bigger amount.",
    other: `${tens} tens is the same as ${tens} hundreds.`,
    values: [hundreds, tens, leftValue, rightValue, hundreds - 1],
  });
}

function sided(
  rng: () => number,
  input: {
    id: string;
    skillId: GoFurtherSkillId;
    left: string;
    right: string;
    leftNum: number;
    leftDen: number;
    rightNum: number;
    rightDen: number;
    lead: string;
    tail: string;
    hint: string;
    show: string[];
    rightText: string;
    mix: string;
    other: string;
    values: number[];
  },
): CompareQuestion {
  let left = input.left;
  let right = input.right;
  let leftNum = input.leftNum;
  let leftDen = input.leftDen;
  let rightNum = input.rightNum;
  let rightDen = input.rightDen;
  if (rng() < 0.5) {
    [left, right] = [right, left];
    [leftNum, rightNum] = [rightNum, leftNum];
    [leftDen, rightDen] = [rightDen, leftDen];
  }
  return {
    kind: "compare",
    id: input.id,
    skillId: input.skillId,
    prompt: `${input.lead}: ${left} or ${right}? ${input.tail}`,
    hint: input.hint,
    show: steps(input.show),
    left,
    right,
    leftNum,
    leftDen,
    rightNum,
    rightDen,
    reasons: reasonSet(rng, input.rightText, input.mix, input.other),
    values: input.values,
  };
}

function makeBalance(skillId: GoFurtherSkillId, rng: () => number, id: string): BalanceQuestion {
  const base = {
    kind: "balance" as const,
    id,
    skillId,
    hint: "Both sides of the equals sign have the same value.",
    show: steps(["Keep both sides equal.", "See what is missing.", "Type the missing number."]),
    fraction: false,
  };
  if (skillId === "g3-mult") {
    const left = intBetween(rng, 2, 5) * 2;
    const each = intBetween(rng, 2, 5);
    const blank = each * 2;
    return {
      ...base,
      prompt: `${left} × ${each} = ${left / 2} × _`,
      blank: String(blank),
      values: [left, each, left / 2, blank, left * each],
    };
  }
  if (skillId === "g3-fractions") {
    const den = intBetween(rng, 2, 6);
    const num = intBetween(rng, 1, den - 1);
    return {
      ...base,
      prompt: `${num}/${den} = _/${den * 2}`,
      blank: String(num * 2),
      fraction: false,
      values: [num, den, num * 2, den * 2],
    };
  }
  if (skillId === "g3-place") {
    const hundreds = intBetween(rng, 1, 9);
    const tens = intBetween(rng, 1, 9);
    const ones = tens * 10;
    return {
      ...base,
      prompt: `${hundreds}00 + ${ones} = _ + ${hundreds}00`,
      blank: String(ones),
      values: [hundreds, tens, ones, hundreds * 100, hundreds * 100 + ones],
    };
  }
  if (rng() < 0.5) {
    const known = intBetween(rng, 6, 40);
    const missing = intBetween(rng, 2, 20);
    return {
      ...base,
      prompt: `${known} + _ = ${known + missing}`,
      blank: String(missing),
      values: [known, missing, known + missing],
    };
  }
  const leftA = intBetween(rng, 15, 60);
  const leftB = intBetween(rng, 6, 20);
  const rightB = intBetween(rng, 4, 18);
  const blank = leftA + leftB - rightB;
  return {
    ...base,
    prompt: `${leftA} + ${leftB} = _ + ${rightB}`,
    blank: String(blank),
    values: [leftA, leftB, rightB, blank, leftA + leftB],
  };
}

function makeTrueFalse(skillId: GoFurtherSkillId, rng: () => number, id: string): TrueFalseQuestion {
  if (skillId === "g3-mult") return trueFalseMult(rng, id);
  if (skillId === "g3-fractions") return trueFalseFractions(rng, id);
  if (skillId === "g3-place") return trueFalsePlace(rng, id);
  return trueFalseAdd(rng, id);
}

function trueFalseAdd(rng: () => number, id: string): TrueFalseQuestion {
  const a = intBetween(rng, 20, 70);
  const b = intBetween(rng, 16, 40);
  const shift = intBetween(rng, 1, 3);
  const truth = rng() < 0.5;
  const other = truth ? b - shift : b - shift + 1;
  const statement = `${a} + ${b} = ${a + shift} + ${other}`;
  return {
    kind: "true-false",
    id,
    skillId: "g3-add-sub",
    prompt: `True or false? ${statement}`,
    statement,
    truth,
    hint: "A change on one side needs the same change on the other.",
    show: steps(["Read both sides.", "Compare the changes.", "Pick a reason."]),
    reasons: truth
      ? reasonSet(
          rng,
          `One side adds ${shift} and the other takes away ${shift}.`,
          `The two sides differ by ${shift}.`,
          `The first number, ${a}, is the total.`,
        )
      : reasonSet(
          rng,
          "The two changes are not the same size.",
          "The sides match because the numbers are close.",
          `Equals means you stop at ${a}.`,
        ),
    values: [a, b, shift, other, a + shift, a + b],
  };
}

function trueFalseMult(rng: () => number, id: string): TrueFalseQuestion {
  const groups = intBetween(rng, 2, 4) * 2;
  const each = intBetween(rng, 2, 5);
  const truth = rng() < 0.5;
  const otherEach = truth ? each * 2 : each;
  const statement = `${groups} × ${each} = ${groups / 2} × ${otherEach}`;
  return {
    kind: "true-false",
    id,
    skillId: "g3-mult",
    prompt: `True or false? ${statement}`,
    statement,
    truth,
    hint: "Halving the groups and doubling each group can keep the same amount.",
    show: steps(["Look at the groups.", "Look at each group.", "Pick a reason."]),
    reasons: truth
      ? reasonSet(
          rng,
          `${groups} groups of ${each} matches ${groups / 2} groups of ${each * 2}.`,
          `${groups} × ${each} is larger than the right side.`,
          `The answer is ${groups}, the first factor.`,
        )
      : reasonSet(
          rng,
          "The right side keeps the same group size, so it is smaller.",
          "The two sides match because both use groups.",
          `The product is ${groups / 2}.`,
        ),
    values: [groups, each, groups / 2, otherEach, groups * each],
  };
}

function trueFalseFractions(rng: () => number, id: string): TrueFalseQuestion {
  const den = intBetween(rng, 2, 6);
  const num = intBetween(rng, 1, den - 1);
  const truth = rng() < 0.5;
  const rightDen = truth ? den * 2 : den;
  const rightNum = num * 2;
  const statement = `${num}/${den} = ${rightNum}/${rightDen}`;
  return {
    kind: "true-false",
    id,
    skillId: "g3-fractions",
    prompt: `True or false? ${statement}`,
    statement,
    truth,
    hint: "An equal fraction grows the top and the bottom by the same factor.",
    show: steps(["Look at the top.", "Look at the bottom.", "Pick a reason."]),
    reasons: truth
      ? reasonSet(
          rng,
          "The top and the bottom both double.",
          `The fraction becomes ${num}/${rightDen}.`,
          "Equal denominators are required here.",
        )
      : reasonSet(
          rng,
          "The top doubled and the bottom stayed the same.",
          "The fractions match because the tops match in growth.",
          `The fraction is ${num} of ${num} parts.`,
        ),
    values: [num, den, rightNum, rightDen],
  };
}

function trueFalsePlace(rng: () => number, id: string): TrueFalseQuestion {
  const hundreds = intBetween(rng, 1, 9);
  const tens = intBetween(rng, 1, 9);
  const ones = intBetween(rng, 0, 9);
  const number = hundreds * 100 + tens * 10 + ones;
  const truth = rng() < 0.5;
  const shown = truth ? tens * 10 : tens;
  const statement = `The ${tens} in ${number} is worth ${shown}.`;
  return {
    kind: "true-false",
    id,
    skillId: "g3-place",
    prompt: `True or false? ${statement}`,
    statement,
    truth,
    hint: "The tens digit is worth that many groups of ten.",
    show: steps(["Find the tens digit.", "A ten is worth 10.", "Pick a reason."]),
    reasons: truth
      ? reasonSet(
          rng,
          `${tens} tens are worth ${tens * 10}.`,
          `${tens} in the tens place is worth only ${tens}.`,
          `The hundreds digit decides the ${tens}.`,
        )
      : reasonSet(
          rng,
          `${tens} in the tens place is worth ${tens * 10}, not ${tens}.`,
          `${tens} anywhere in the number is worth ${tens}.`,
          `The number ${number} is worth ${tens}.`,
        ),
    values: [hundreds, tens, ones, number, shown, tens * 10],
  };
}

function makeManyWays(skillId: GoFurtherSkillId, rng: () => number, id: string): ManyWaysQuestion {
  if (skillId === "g3-mult") return manyMult(rng, id);
  if (skillId === "g3-fractions") return manyFractions(rng, id);
  if (skillId === "g3-place") return manyPlace(rng, id);
  return manyAdd(rng, id);
}

function manyAdd(rng: () => number, id: string): ManyWaysQuestion {
  const left = intBetween(rng, 20, 80);
  const right = intBetween(rng, 2, 9);
  const tens = Math.floor(left / 10) * 10;
  const ones = left % 10;
  const target = left + right;
  const cards = shuffle(rng, [
    card("split", `Add ${tens} and ${ones}, then add ${right}.`, { type: "sum", parts: [tens, ones, right] }),
    card("nearby", `Add ${left} and ${right - 1}, then add 1.`, { type: "sum", parts: [left, right - 1, 1] }),
    card("count", `Start at ${left} and count on ${right}.`, { type: "sum", parts: [left, right] }),
    card("take", `Take ${right} away from ${left}.`, { type: "difference", from: left, take: right }),
    card("extra", `Add ${left} and ${right}, then add 10 more.`, { type: "sum", parts: [left, right, 10] }),
  ]);
  return many(id, "g3-add-sub", `Show ${left} + ${right} two different ways.`, { kind: "number", value: target }, cards, [
    left,
    right,
    tens,
    ones,
    target,
    right - 1,
    1,
    10,
  ]);
}

function manyMult(rng: () => number, id: string): ManyWaysQuestion {
  const a = intBetween(rng, 2, 9);
  const b = intBetween(rng, 2, 9);
  const product = a * b;
  const third =
    product % 2 === 0
      ? card("double", `Double ${product / 2}.`, { type: "product", factors: [product / 2, 2] })
      : card("order", `Multiply ${b} by ${a}.`, { type: "product", factors: [b, a] });
  const cards = shuffle(rng, [
    card("groups", `Make ${a} groups of ${b}.`, { type: "product", factors: [a, b] }),
    card("rows", `Make ${b} rows of ${a}.`, { type: "product", factors: [b, a] }),
    third,
    card("add", `Add ${a} and ${b}.`, { type: "sum", parts: [a, b] }),
    card("extra", `Make ${a} groups of ${b + 1}.`, { type: "product", factors: [a, b + 1] }),
  ]);
  return many(
    id,
    "g3-mult",
    `Show ${a} × ${b} two different ways.`,
    { kind: "number", value: product },
    cards,
    [a, b, product, b + 1, 2],
    "Two different true ways. Same product.",
  );
}

function manyFractions(rng: () => number, id: string): ManyWaysQuestion {
  const den = intBetween(rng, 2, 6);
  const num = intBetween(rng, 1, den - 1);
  const cards = shuffle(rng, [
    card("parts", `${num} of ${den} equal parts.`, { type: "fraction", num, den }),
    card("hops", `Count ${num} ${num === 1 ? "hop" : "hops"} of 1/${den}.`, { type: "fraction", num, den }),
    card("same", `Shade ${num} ${num === 1 ? "part" : "parts"} when the whole has ${den}.`, { type: "fraction", num, den }),
    card("off", `${num} of ${den + 1} equal parts.`, { type: "fraction", num, den: den + 1 }),
    card("flip", `${den} of ${num} equal parts.`, { type: "fraction", num: den, den: num }),
  ]);
  return many(
    id,
    "g3-fractions",
    `Show ${num}/${den} two different ways.`,
    { kind: "fraction", num, den },
    cards,
    [num, den, den + 1],
    "Two different true ways to show the fraction.",
  );
}

function manyPlace(rng: () => number, id: string): ManyWaysQuestion {
  const hundreds = intBetween(rng, 2, 8);
  const tens = intBetween(rng, 1, 9);
  const number = hundreds * 100 + tens * 10;
  const cards = shuffle(rng, [
    card("places", `${hundreds} hundreds and ${tens} tens.`, { type: "place", hundreds, tens, ones: 0 }),
    card("tens", `${number / 10} tens.`, { type: "place", hundreds: 0, tens: number / 10, ones: 0 }),
    card("expanded", `${hundreds * 100} + ${tens * 10}.`, { type: "sum", parts: [hundreds * 100, tens * 10] }),
    card("swap", `${number} is ${tens} hundreds.`, { type: "place", hundreds: tens, tens: 0, ones: 0 }),
    card("ones", `${number} ones grouped as ${hundreds} ones.`, { type: "place", hundreds: 0, tens: 0, ones: hundreds }),
  ]);
  return many(id, "g3-place", `Show ${number} two different ways.`, { kind: "number", value: number }, cards, [
    hundreds,
    tens,
    number,
    number / 10,
    hundreds * 100,
    tens * 10,
  ]);
}

function many(
  id: string,
  skillId: GoFurtherSkillId,
  prompt: string,
  target: StrategyTarget,
  cards: StrategyCard[],
  values: number[],
  hint = "Pick two different ways that really make this amount.",
): ManyWaysQuestion {
  const texts = new Set(cards.map((item) => item.text));
  if (texts.size !== cards.length) throw new Error(`Repeated strategy cards for ${id}`);
  const valid = cards.filter((item) => strategyMatches(item.op, target));
  if (valid.length < 2) throw new Error(`Need two valid ways for ${id}`);
  return {
    kind: "many-ways",
    id,
    skillId,
    prompt,
    hint,
    show: steps(["Read each card.", "Keep a true way.", "Pick two true ways."]),
    need: 2,
    cards,
    target,
    values,
  };
}

function makeBar(skillId: GoFurtherSkillId, rng: () => number, id: string): BarQuestion {
  if (skillId === "g3-fractions") {
    const whole = intBetween(rng, 4, 12);
    const partA = intBetween(rng, 1, whole - 1);
    const partB = whole - partA;
    const distractor = unusedChip(rng, [partA, partB, whole], 1, 12);
    return bar(rng, {
      id,
      skillId,
      prompt: `A strip has ${whole} equal parts. ${partA} are blue. How many parts are not blue?`,
      partA,
      partB,
      whole,
      answer: String(partB),
      distractor,
      fraction: false,
      values: [whole, partA, partB, distractor],
    });
  }
  if (skillId === "g3-place") {
    const hundreds = intBetween(rng, 2, 8);
    const tens = intBetween(rng, 1, 9);
    const partA = hundreds * 100;
    const partB = tens * 10;
    const whole = partA + partB;
    const distractor = numberChip([partA, partB, whole], Math.round(whole / 10));
    return bar(rng, {
      id,
      skillId,
      prompt: `${partA} and ${partB} make a number. How many is that altogether?`,
      partA,
      partB,
      whole,
      answer: String(whole),
      distractor,
      fraction: false,
      values: [partA, partB, whole, distractor, hundreds, tens],
    });
  }
  if (skillId === "g3-mult") {
    const partA = intBetween(rng, 2, 8);
    const partB = intBetween(rng, 2, 8);
    const whole = partA + partB;
    const distractor = unusedChip(rng, [partA, partB, whole], 1, 20);
    return bar(rng, {
      id,
      skillId,
      prompt: `A box has ${partA} red tiles and ${partB} blue tiles. How many tiles are there altogether?`,
      partA,
      partB,
      whole,
      answer: String(whole),
      distractor,
      fraction: false,
      values: [partA, partB, whole, distractor],
    });
  }
  const partA = intBetween(rng, 12, 70);
  const partB = intBetween(rng, 3, 20);
  const whole = partA + partB;
  const distractor = numberChip([partA, partB, whole], Math.abs(partA - partB));
  return bar(rng, {
    id,
    skillId: "g3-add-sub",
    prompt: `Sam has ${partA} marbles and finds ${partB} more. How many marbles are there altogether?`,
    partA,
    partB,
    whole,
    answer: String(whole),
    distractor,
    fraction: false,
    values: [partA, partB, whole, distractor],
  });
}

function bar(
  rng: () => number,
  input: {
    id: string;
    skillId: GoFurtherSkillId;
    prompt: string;
    partA: number;
    partB: number;
    whole: number;
    answer: string;
    distractor: number;
    fraction: boolean;
    values: number[];
  },
): BarQuestion {
  const chips = shuffle(rng, [input.partA, input.partB, input.whole, input.distractor].map(String));
  return {
    kind: "bar",
    id: input.id,
    skillId: input.skillId,
    prompt: input.prompt,
    hint: "The two parts sit inside the whole.",
    show: steps(["Find the two parts.", "The whole holds both.", "Place each number.", "Then answer."]),
    chips,
    partA: String(input.partA),
    partB: String(input.partB),
    whole: String(input.whole),
    answer: input.answer,
    fraction: input.fraction,
    values: input.values,
  };
}

function makePattern(skillId: GoFurtherSkillId, rng: () => number, id: string, seed: number): PatternQuestion {
  if (seed % 2 === 1) {
    return {
      kind: "pattern",
      id,
      skillId,
      prompt: DIGIT_PROMPT,
      hint: "Put the largest digits in the hundreds places.",
      show: steps(["Largest digits go first.", "Use each digit once.", "Add the two numbers."]),
      mode: "digits",
      answer: String(DIGIT_PUZZLE_SUM),
      fraction: false,
      values: [1, 2, 3, 4, 5, 6],
    };
  }
  if (skillId === "g3-fractions") {
    const den = intBetween(rng, 6, 12);
    const start = 1;
    const shown = [0, 1, 2, 3].map((step) => `${start + step}/${den}`);
    const answer = `${start + 4}/${den}`;
    return {
      kind: "pattern",
      id,
      skillId,
      prompt: `What comes next: ${shown.join(", ")}, ?`,
      hint: "The denominator stays. The numerator grows by 1.",
      show: steps(["The bottom stays put.", "The top grows by one.", "Write the next fraction."]),
      mode: "next",
      answer,
      fraction: true,
      values: [den, start, start + 4],
    };
  }
  if (skillId === "g3-mult") {
    const step = intBetween(rng, 2, 10);
    const shown = [1, 2, 3, 4].map((count) => count * step);
    const answer = 5 * step;
    return {
      kind: "pattern",
      id,
      skillId,
      prompt: `What comes next: ${shown.join(", ")}, ?`,
      hint: "Each number grows by the same amount.",
      show: steps(["Find the equal step.", "Apply that step once.", "Type the next number."]),
      mode: "next",
      answer: String(answer),
      fraction: false,
      values: [...shown, answer, step],
    };
  }
  const step = 10;
  const start = intBetween(rng, 11, 40) * 10;
  const shown = [0, 1, 2, 3].map((count) => start + count * step);
  const answer = start + 4 * step;
  return {
    kind: "pattern",
    id,
    skillId,
    prompt: `What comes next: ${shown.join(", ")}, ?`,
    hint: "Each number grows by the same ten.",
    show: steps(["Find the equal step.", "Apply that step once.", "Type the next number."]),
    mode: "next",
    answer: String(answer),
    fraction: false,
    values: [...shown, answer, step],
  };
}

function card(id: string, text: string, op: StrategyOp): StrategyCard {
  return { id, text, op };
}

function reasonSet(rng: () => number, right: string, mix: string, other: string): ReasonChoice[] {
  const items = [
    { text: right, right: true },
    { text: mix, right: false },
    { text: other, right: false },
  ];
  if (new Set(items.map((item) => item.text)).size !== 3) throw new Error("Reason choices overlap");
  return shuffle(rng, items).map((item, index) => ({ ...item, id: ["a", "b", "c"][index] ?? "a" }));
}

function steps(lines: string[]): string[] {
  if (lines.length < 3 || lines.length > 4) throw new Error("Show me needs 3 or 4 steps");
  for (const line of lines) {
    const count = line.split(/\s+/).filter(Boolean).length;
    if (count > 8) throw new Error(`Caption too long: ${line}`);
  }
  return lines;
}

function unusedChip(rng: () => number, used: number[], min: number, max: number): number {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const chip = intBetween(rng, min, max);
    if (!used.includes(chip)) return chip;
  }
  return numberChip(used, min);
}

function numberChip(used: number[], prefer: number): number {
  if (!used.includes(prefer) && prefer > 0) return prefer;
  let chip = 1;
  while (used.includes(chip)) chip += 1;
  return chip;
}

function clean(value: string): string {
  return value.replace(/\s+/g, "").replace(/^0+(?=\d)/, "");
}

function intBetween(rng: () => number, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1));
}

function shuffle<T>(rng: () => number, items: T[]): T[] {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(rng() * (index + 1));
    const current = copy[index];
    copy[index] = copy[swap] as T;
    copy[swap] = current as T;
  }
  return copy;
}

function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let next = Math.imul(state ^ (state >>> 15), 1 | state);
    next = (next + Math.imul(next ^ (next >>> 7), 61 | next)) ^ next;
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
  };
}
