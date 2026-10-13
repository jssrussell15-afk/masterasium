import type { Difficulty, PracticeItem } from "@/lib/worksheets/types";

type Op = "add" | "sub" | "mul" | "div";

function bumpAmount(difficulty: Difficulty, rng: () => number): number {
  if (difficulty === "easy") return 1 + Math.floor(rng() * 2);
  if (difficulty === "steady") return 2 + Math.floor(rng() * 4);
  return 4 + Math.floor(rng() * 6);
}

function formatNum(value: number): string {
  if (Number.isInteger(value)) return String(value);
  const rounded = Math.round(value * 100) / 100;
  return String(rounded);
}

function spliceMatch(text: string, match: RegExpMatchArray, left: string, right: string): string | null {
  if (match.index == null) return null;
  const inner = match[0];
  const first = inner.indexOf(match[1] ?? "");
  if (first < 0) return null;
  const second = inner.indexOf(match[2] ?? "", first + (match[1]?.length ?? 0));
  if (second < 0) return null;
  const rebuilt =
    inner.slice(0, first) +
    left +
    inner.slice(first + (match[1]?.length ?? 0), second) +
    right +
    inner.slice(second + (match[2]?.length ?? 0));
  return text.slice(0, match.index) + rebuilt + text.slice(match.index + inner.length);
}

function stepsFor(op: Op, left: number, right: number, answer: string): string[] {
  if (op === "add") {
    return [`Add the two numbers.`, `${formatNum(left)} + ${formatNum(right)} = ${answer}.`];
  }
  if (op === "sub") {
    return [`Subtract the second number from the first.`, `${formatNum(left)} − ${formatNum(right)} = ${answer}.`];
  }
  if (op === "mul") {
    return [`Multiply the two numbers.`, `${formatNum(left)} × ${formatNum(right)} = ${answer}.`];
  }
  return [`Divide ${formatNum(left)} by ${formatNum(right)}.`, `${formatNum(left)} ÷ ${formatNum(right)} = ${answer}.`];
}

function fromOp(text: string, match: RegExpMatchArray, op: Op, amount: number): PracticeItem | null {
  const left = Number(match[1]);
  const right = Number(match[2]);
  if (!Number.isFinite(left) || !Number.isFinite(right) || left < 0 || right < 0) return null;

  let nextLeft = left;
  let nextRight = right;
  let answer = "";
  if (op === "add") {
    nextLeft = left + amount;
    nextRight = right + amount;
    answer = formatNum(nextLeft + nextRight);
  } else if (op === "sub") {
    nextRight = right + Math.max(1, amount - 1);
    nextLeft = Math.max(left + amount, nextRight + amount);
    answer = formatNum(nextLeft - nextRight);
  } else if (op === "mul") {
    const step = left > 20 || right > 20 ? 1 : Math.max(1, Math.min(amount, 3));
    nextLeft = left + step;
    nextRight = right + Math.max(1, step - 1);
    answer = formatNum(nextLeft * nextRight);
  } else {
    const divisor = Math.max(2, Math.round(right) + (amount >= 4 ? 1 : 0));
    const quotient = Math.max(1, Math.round(right === 0 ? 1 : left / right)) + amount;
    const remainder = right === 0 ? 0 : Math.round(left) % Math.round(right);
    if (remainder === 0) {
      nextRight = divisor;
      nextLeft = divisor * quotient;
      answer = String(quotient);
    } else {
      const leftover = Math.min(remainder, divisor - 1);
      nextRight = divisor;
      nextLeft = divisor * quotient + leftover;
      answer = `${quotient} R ${leftover}`;
    }
  }

  const prompt = spliceMatch(text, match, formatNum(nextLeft), formatNum(nextRight));
  if (!prompt || prompt === text) return null;
  return {
    prompt,
    answer,
    steps: stepsFor(op, nextLeft, nextRight, answer),
    skillId: null,
    example: null,
  };
}

/**
 * Build one similar question with slightly larger numbers.
 * Returns null when the line is not a single operation we can solve exactly.
 */
export function hardenPrompt(
  prompt: string,
  difficulty: Difficulty,
  rng: () => number = Math.random,
): PracticeItem | null {
  const text = prompt.trim();
  if (text.length < 3 || text.length > 280) return null;
  const amount = bumpAmount(difficulty, rng);

  const percent = text.match(/(\d+)\s*%\s*of\s*(\d+)/i);
  if (percent) {
    const rate = Number(percent[1]);
    const base = Number(percent[2]);
    const allowed = [10, 20, 25, 50];
    const nextRate = allowed.includes(rate) ? rate : 10;
    const nextBase = Math.ceil((base + amount * 4) / 20) * 20;
    const answer = formatNum((nextBase * nextRate) / 100);
    const rewritten = spliceMatch(text, percent, String(nextRate), String(nextBase));
    if (!rewritten) return null;
    return {
      prompt: rewritten,
      answer,
      steps: [
        `${nextRate}% means ${nextRate} out of 100.`,
        `${nextRate} / 100 × ${nextBase} = ${answer}.`,
      ],
      skillId: null,
      example: null,
    };
  }

  const add = text.match(/(\d+(?:\.\d+)?)\s*(?:\+|plus)\s*(\d+(?:\.\d+)?)/i);
  if (add) return fromOp(text, add, "add", amount);

  const mul = text.match(/(\d+(?:\.\d+)?)\s*(?:×|\*|x)\s*(\d+(?:\.\d+)?)/i);
  if (mul) return fromOp(text, mul, "mul", amount);

  const div = text.match(/(\d+(?:\.\d+)?)\s*(?:÷|\/)\s*(\d+(?:\.\d+)?)/);
  if (div) {
    const left = Number(div[1]);
    const right = Number(div[2]);
    if (div[0].includes("/") && !div[0].includes("÷") && left < right) return null;
    return fromOp(text, div, "div", amount);
  }

  const sub = text.match(/(\d+(?:\.\d+)?)\s*(?:−|–|-|minus)\s*(\d+(?:\.\d+)?)/i);
  if (sub) return fromOp(text, sub, "sub", amount);

  const groups = text.match(/(\d+)\s+(?:equal\s+)?(?:groups?|bags?|rows?|packs?|boxes)\s+(?:of|with)\s+(\d+)/i);
  if (groups) return fromOp(text, groups, "mul", amount);

  const share = text.match(/share\s+(\d+)\b[\s\S]{0,48}?\bamong\s+(\d+)/i);
  if (share) {
    const built = fromOp(text, share, "div", amount);
    if (!built || built.answer.includes("R")) return null;
    return built;
  }

  return null;
}

export function splitPrompts(text: string): string[] {
  const cleaned = text.replace(/\r/g, "").trim();
  if (!cleaned) return [];
  const chunks = cleaned.split(/\n\s*(?=\d+\s*[\).:])|\n{2,}/);
  const prompts: string[] = [];
  for (const chunk of chunks) {
    const line = chunk.replace(/^\s*\d+\s*[\).:]\s*/, "").replace(/\s+/g, " ").trim();
    if (line.length >= 3) prompts.push(line);
  }
  return prompts;
}
