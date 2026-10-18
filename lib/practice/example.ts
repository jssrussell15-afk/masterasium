import { answersMatch } from "@/lib/practice/answers";
import { generateQuestion } from "@/lib/practice/generate";

export type WorkedExample = {
  prompt: string;
  steps: string[];
  answer: string;
};

const TRIES = 40;

/**
 * A short worked example of the same kind, with different numbers.
 * The generator supplies the item. It is shown only when an independent check agrees.
 * Returns null when this item type cannot produce a different, checkable example.
 */
export function buildWorkedExample(input: {
  skillId: string;
  livePrompt: string;
  small?: boolean;
}): WorkedExample | null {
  let rng: () => number;
  try {
    rng = mulberry32(hashSeed([input.skillId, input.livePrompt, "example"]));
  } catch {
    return null;
  }
  const liveNumbers = numberKey(input.livePrompt);
  for (let attempt = 0; attempt < TRIES; attempt += 1) {
    let question;
    try {
      question = generateQuestion(input.skillId, rng, { small: input.small ?? false });
    } catch {
      return null;
    }
    if (question.prompt === input.livePrompt) continue;
    const numbers = numberKey(question.prompt);
    if (liveNumbers && numbers === liveNumbers) continue;
    const example = {
      prompt: question.prompt,
      steps: question.steps,
      answer: question.answer,
    };
    if (!exampleIsCorrect(example)) continue;
    return example;
  }
  return null;
}

/** True when the prompt or the worked steps independently equal the answer. */
export function exampleIsCorrect(example: WorkedExample): boolean {
  if (!example.prompt.trim() || !example.answer.trim() || example.steps.length === 0) return false;
  const fromPrompt = solvePrompt(example.prompt);
  if (fromPrompt != null) return answersMatch(example.answer, fromPrompt);
  return stepsSupportAnswer(example.steps, example.answer);
}

function stepsSupportAnswer(steps: string[], answer: string): boolean {
  let saw = false;
  let matched = false;
  for (const step of steps) {
    for (const equation of equationsIn(step)) {
      saw = true;
      if (!equation.ok) return false;
      if (answersMatch(answer, equation.shown)) matched = true;
    }
  }
  return saw && matched;
}

function solvePrompt(prompt: string): string | null {
  const after = prompt.match(/just after\s+(\d+)/i);
  if (after) return String(Number(after[1]) + 1);
  const before = prompt.match(/just before\s+(\d+)/i);
  if (before) {
    const number = Number(before[1]);
    if (number <= 0) return null;
    return String(number - 1);
  }

  const greater = prompt.match(/greater,\s*(-?\d+(?:\.\d+)?)\s+or\s+(-?\d+(?:\.\d+)?)/i);
  if (greater) return String(Math.max(Number(greater[1]), Number(greater[2])));

  const next = prompt.match(/comes next:\s*([0-9.,\s]+),?\s*\?/i);
  if (next) {
    const values = next[1]
      .split(",")
      .map((part) => Number(part.trim()))
      .filter((value) => Number.isFinite(value));
    if (values.length >= 3) {
      const step = values[1] - values[0];
      const steady = values.every((value, index) => index === 0 || value - values[index - 1] === step);
      if (steady) return String(values[values.length - 1] + step);
    }
  }

  const share = prompt.match(/share\s+(\d+)\b[\s\S]*?\bamong\s+(\d+)/i);
  if (share) {
    const total = Number(share[1]);
    const groups = Number(share[2]);
    if (groups > 0 && total % groups === 0) return String(total / groups);
  }

  const longer = prompt.match(/(\d+)\s+\w+\s+long\.[\s\S]*?(\d+)\s+\w+\s+long\.[\s\S]*longer/i);
  if (longer) return String(Math.abs(Number(longer[1]) - Number(longer[2])));

  const place = prompt.match(/in\s+([\d,]+),\s+what is the value of the\s+([a-z-]+)\s+digit/i);
  if (place) {
    const digits = place[1].replace(/,/g, "");
    const value = placeValueOf(digits, place[2]);
    if (value != null) return String(value);
  }

  const fraction = prompt.match(/(\d+)\s*\/\s*(\d+)\s*([+−\-])\s*(\d+)\s*\/\s*(\d+)/);
  if (fraction && fraction[2] === fraction[5]) {
    const left = Number(fraction[1]);
    const right = Number(fraction[4]);
    const denominator = Number(fraction[2]);
    const numerator = fraction[3] === "+" ? left + right : left - right;
    if (numerator >= 0) return `${numerator}/${denominator}`;
  }

  const rectangle = prompt.match(/rectangle is\s+(\d+)\s+cm long and\s+(\d+)\s+cm wide/i);
  if (rectangle) return String(Number(rectangle[1]) * Number(rectangle[2]));

  const triangle = prompt.match(/triangle has base\s+(\d+)\s+cm and height\s+(\d+)\s+cm/i);
  if (triangle) return String((Number(triangle[1]) * Number(triangle[2])) / 2);

  const parallelogram = prompt.match(/parallelogram has base\s+(\d+)\s+cm and height\s+(\d+)\s+cm/i);
  if (parallelogram) return String(Number(parallelogram[1]) * Number(parallelogram[2]));

  const prism = prompt.match(/(\d+)\s+cm by\s+(\d+)\s+cm by\s+(\d+)\s+cm/i);
  if (prism) return String(Number(prism[1]) * Number(prism[2]) * Number(prism[3]));

  const cylinder = prompt.match(/radius\s+(\d+(?:\.\d+)?)\s+cm and height\s+(\d+(?:\.\d+)?)\s+cm/i);
  if (cylinder && /π|pi|3\.14/i.test(prompt)) {
    const radius = Number(cylinder[1]);
    const height = Number(cylinder[2]);
    return trimNumber(3.14 * radius * radius * height);
  }

  const percent = prompt.match(/(\d+(?:\.\d+)?)%\s+of\s+(\d+(?:\.\d+)?)/i);
  if (percent) return trimNumber((Number(percent[1]) / 100) * Number(percent[2]));

  const equation = prompt.match(/n\s*([+−\-×x*÷/])\s*(-?\d+(?:\.\d+)?)\s*=\s*(-?\d+(?:\.\d+)?)/i);
  if (equation) {
    const result = undo(equation[1], Number(equation[3]), Number(equation[2]));
    if (result != null) return trimNumber(result);
  }

  const divide = prompt.match(/(-?\d+(?:\.\d+)?)\s*÷\s*(-?\d+(?:\.\d+)?)\s*=\s*\?/);
  if (divide) {
    const left = Number(divide[1]);
    const right = Number(divide[2]);
    if (right === 0) return null;
    const quotient = Math.trunc(left / right);
    const remainder = Math.abs(left % right);
    if (remainder === 0) return String(quotient);
    return `${quotient} R ${remainder}`;
  }

  const binary = prompt.match(/(-?\d+(?:\.\d+)?)\s*([+−\-×x*])\s*(-?\d+(?:\.\d+)?)\s*=\s*\?/);
  if (binary) {
    const value = apply(binary[2], Number(binary[1]), Number(binary[3]));
    if (value == null) return null;
    return trimNumber(value);
  }

  return null;
}

function placeValueOf(digits: string, placeName: string): number | null {
  const places: Record<string, number> = {
    ones: 0,
    tens: 1,
    hundreds: 2,
    thousands: 3,
    "ten-thousands": 4,
    "hundred-thousands": 5,
    millions: 6,
  };
  const index = places[placeName.toLowerCase()];
  if (index == null || index >= digits.length) return null;
  const digit = Number(digits[digits.length - 1 - index]);
  if (!Number.isInteger(digit)) return null;
  return digit * 10 ** index;
}

function equationsIn(step: string): { ok: boolean; shown: string }[] {
  const pattern = /(-?\d+(?:\.\d+)?)\s*([+−\-×x*÷/])\s*(-?\d+(?:\.\d+)?)\s*=\s*(-?\d+(?:\.\d+)?)/g;
  const found: { ok: boolean; shown: string }[] = [];
  for (const match of step.matchAll(pattern)) {
    const value = apply(match[2], Number(match[1]), Number(match[3]));
    const shown = match[4];
    found.push({
      ok: value != null && Math.abs(value - Number(shown)) < 1e-6,
      shown,
    });
  }
  return found;
}

function apply(symbol: string, left: number, right: number): number | null {
  if (symbol === "+") return left + right;
  if (symbol === "-" || symbol === "−") return left - right;
  if (symbol === "×" || symbol === "x" || symbol === "*") return left * right;
  if (symbol === "÷" || symbol === "/") {
    if (right === 0) return null;
    return left / right;
  }
  return null;
}

function undo(symbol: string, total: number, change: number): number | null {
  if (symbol === "+") return total - change;
  if (symbol === "-" || symbol === "−") return total + change;
  if (symbol === "×" || symbol === "x" || symbol === "*") {
    if (change === 0) return null;
    return total / change;
  }
  if (symbol === "÷" || symbol === "/") return total * change;
  return null;
}

function trimNumber(value: number): string {
  if (!Number.isFinite(value)) return "";
  const rounded = Math.round(value * 1000) / 1000;
  return String(rounded);
}

function numberKey(prompt: string): string {
  return (prompt.match(/\d+(?:\.\d+)?/g) ?? []).join(",");
}

function hashSeed(parts: string[]): number {
  let hash = 2166136261;
  const text = parts.join("|");
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}
