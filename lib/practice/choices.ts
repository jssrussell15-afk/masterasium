/** Answer tiles for Grades 1 and 2. Grade 3 and up keep a typed answer. */

import { answersMatch, normalizeAnswer } from "@/lib/practice/answers";

function hash(seed: string): number {
  let value = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    value ^= seed.charCodeAt(index);
    value = Math.imul(value, 16777619);
  }
  return value >>> 0;
}

function stableShuffle(items: string[], seed: string): string[] {
  const next = [...items];
  let state = hash(seed) || 1;
  for (let index = next.length - 1; index > 0; index -= 1) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    const swap = state % (index + 1);
    const current = next[index];
    next[index] = next[swap] ?? current;
    next[swap] = current;
  }
  return next;
}

export function shuffleChoices(items: string[], seed: string): string[] {
  return stableShuffle(items, seed);
}

const PLACE_MULTIPLIER: Record<string, number> = {
  ones: 1,
  tens: 10,
  hundreds: 100,
  thousands: 1000,
  "ten-thousands": 10000,
};

function properFraction(value: string): boolean {
  const match = value.match(/^(\d+)\/(\d+)$/);
  if (!match) return false;
  const top = Number(match[1]);
  const bottom = Number(match[2]);
  return bottom >= 2 && top >= 1 && top < bottom;
}

/** The shaded fraction, the unshaded fraction, and a wrong-denominator fraction. */
export function fractionChoiceList(answer: string): string[] | null {
  const match = answer.trim().match(/^(\d+)\s*\/\s*(\d+)$/);
  if (!match) return null;
  const shaded = Number(match[1]);
  const parts = Number(match[2]);
  if (!Number.isInteger(shaded) || !Number.isInteger(parts) || parts < 2 || shaded < 1) return null;
  const canonical = `${shaded}/${parts}`;
  const candidates = [
    `${parts - shaded}/${parts}`,
    `${shaded}/${parts + 1}`,
    parts > 2 ? `${Math.min(shaded, parts - 2)}/${parts - 1}` : `${shaded}/${parts + 2}`,
    `1/${parts + 1}`,
    `1/${parts + 2}`,
    `${Math.min(shaded + 1, parts - 1)}/${parts}`,
  ];
  const choices = [canonical];
  for (const candidate of candidates) {
    if (choices.length >= 3) break;
    if (!properFraction(candidate) || choices.includes(candidate)) continue;
    choices.push(candidate);
  }
  return choices.length >= 2 ? choices : null;
}

function finish(choices: string[], answer: string, seed: string): string[] | null {
  const unique: string[] = [];
  for (const choice of choices) {
    const text = choice.trim();
    if (!text || text.startsWith("-") || text.length > 40) continue;
    if (unique.some((item) => normalizeAnswer(item) === normalizeAnswer(text))) continue;
    if (answersMatch(answer, text) && unique.some((item) => answersMatch(answer, item))) continue;
    if (!answersMatch(answer, text) && unique.some((item) => answersMatch(text, item))) continue;
    unique.push(text);
  }
  if (unique.length < 2 || unique.length > 4) return null;
  if (unique.filter((item) => answersMatch(answer, item)).length !== 1) return null;
  return stableShuffle(unique, seed);
}

function compareChoices(prompt: string): string[] | null {
  const many = prompt.match(/which number is (greatest|least):\s*([^?]+)/i);
  if (many) return (many[2] ?? "").match(/\d+/g);
  const pair = prompt.match(/which number is (greater|smaller),\s*(-?\d+)\s+or\s*(-?\d+)/i);
  if (!pair) return null;
  return [pair[2] ?? "", pair[3] ?? ""].filter(Boolean);
}

function placeChoices(prompt: string, answer: string, avoid: readonly string[]): string[] | null {
  const match = prompt.match(/in\s+([\d,]+),\s+what is the value of the ([a-z-]+) digit/i);
  if (!match) return null;
  const whole = Number((match[1] ?? "").replaceAll(",", ""));
  const multiplier = PLACE_MULTIPLIER[(match[2] ?? "").toLowerCase()];
  if (!Number.isInteger(whole) || whole < 0 || !multiplier) return null;
  const digit = Math.floor(whole / multiplier) % 10;
  const value = digit * multiplier;
  if (!answersMatch(answer, String(value))) return null;
  const ones = whole % 10;
  const tensDigit = Math.floor(whole / 10) % 10;
  const hundredsDigit = Math.floor(whole / 100) % 10;
  const distractors = [
    digit,
    whole,
    multiplier === 10 ? ones : tensDigit * 10,
    multiplier === 1 ? tensDigit * 10 : ones,
    hundredsDigit * 100,
    value + 10,
    value - 10,
  ];
  const picked = [String(value)];
  for (const candidate of distractors) {
    if (picked.length === 3) break;
    if (!Number.isInteger(candidate) || candidate <= 0) continue;
    const text = String(candidate);
    if (isAvoided(text, avoid)) continue;
    if (picked.some((item) => normalizeAnswer(item) === normalizeAnswer(text) || answersMatch(item, text))) continue;
    picked.push(text);
  }
  if (picked.length < 3) {
    for (const extra of [value + 10, value - 10, value + 20, value - 20, value + multiplier, value - multiplier]) {
      if (picked.length === 3) break;
      if (!Number.isInteger(extra) || extra <= 0) continue;
      const text = String(extra);
      if (isAvoided(text, avoid)) continue;
      if (picked.some((item) => answersMatch(item, text))) continue;
      picked.push(text);
    }
  }
  return picked.length >= 2 ? picked : null;
}

function isAvoided(text: string, avoid: readonly string[]): boolean {
  return avoid.some((item) => answersMatch(item, text));
}

function mistakeNumbers(value: number, avoid: readonly string[]): number[] {
  const found: number[] = [];
  const add = (next: number) => {
    if (!Number.isInteger(next) || next < 0 || next === value || found.includes(next)) return;
    if (isAvoided(String(next), avoid)) return;
    found.push(next);
  };
  for (const delta of [1, -1, 2, -2, 10, -10]) add(value + delta);
  // Off by a ten, and then one more or one less.
  for (const delta of [9, -9, 11, -11]) add(value + delta);
  const text = String(value);
  if (text.length >= 2) add(Number([...text].reverse().join("")));
  return found;
}

function take(values: number[], seed: string, count: number): number[] {
  if (values.length === 0 || count <= 0) return [];
  return stableShuffle(values.map(String), seed)
    .slice(0, Math.min(count, values.length))
    .map(Number);
}

function numericChoicesFrom(pool: number[], value: number, seed: string): string[] | null {
  const low = pool.filter((item) => item < value);
  const high = pool.filter((item) => item > value);
  // Both distractors on one side keep the answer from always being the middle value.
  const mode = hash(`${seed}:side`) % 3;
  let picked: number[] = [];
  if (mode === 0) picked = take(low, seed, 2);
  if (mode === 1) picked = take(high, seed, 2);
  if (picked.length < 2 && low.length > 0 && high.length > 0) {
    picked = [...take(low, `${seed}:low`, 1), ...take(high, `${seed}:high`, 1)];
  }
  if (picked.length < 2) picked = take(pool, seed, 2);
  if (picked.length === 0) return null;
  return finish([String(value), ...picked.map(String)], String(value), seed);
}

function numericChoices(value: number, seed: string, avoid: readonly string[]): string[] | null {
  return numericChoicesFrom(mistakeNumbers(value, avoid), value, seed);
}

/** Grade 1 stays on nearby numbers. Counting stays inside 0–20, so 12 is not a choice for 2. */
function gradeOneChoices(
  value: number,
  seed: string,
  limit: number,
  avoid: readonly string[],
  hardMax: number,
): string[] | null {
  const within = (maxDistance: number) => {
    const found: number[] = [];
    for (let distance = 1; distance <= maxDistance; distance += 1) {
      for (const candidate of [value - distance, value + distance]) {
        if (!Number.isInteger(candidate) || candidate < 0 || candidate > limit || candidate === value) continue;
        if (isAvoided(String(candidate), avoid) || found.includes(candidate)) continue;
        found.push(candidate);
      }
    }
    return found;
  };
  let distance = 2;
  let pool = within(distance);
  while (pool.length < 2 && distance < hardMax) {
    distance += 1;
    pool = within(distance);
  }
  if (pool.length < 2) return null;
  return numericChoicesFrom(pool, value, seed);
}

export function practiceChoices(
  grade: number,
  prompt: string,
  answer: string,
  seed: string,
  avoid: readonly string[] = [],
): string[] | null {
  if (grade > 2) return null;
  const expected = answer.trim();

  if (/even or odd/i.test(prompt) && /^(even|odd)$/i.test(expected)) {
    return finish(["even", "odd"], expected.toLowerCase(), seed);
  }

  const fractions = fractionChoiceList(expected);
  if (fractions) {
    const usable = fractions.filter((choice, index) => index === 0 || !isAvoided(choice, avoid));
    return finish(usable, usable[0] ?? expected, seed);
  }

  const listed = compareChoices(prompt);
  if (listed) {
    const compared = finish(listed, expected, seed);
    if (compared) return compared;
  }

  if (/value of the/i.test(prompt)) {
    const places = placeChoices(prompt, expected, avoid);
    if (places) {
      const built = finish(places, expected, seed);
      if (built) return built;
    }
  }

  if (!/^\d+$/.test(expected)) return null;
  const value = Number(expected);
  const counting = /just (?:after|before)\s+\d+/i.test(prompt);
  if (grade <= 1 && value <= (counting ? 20 : 30)) {
    const nearby = gradeOneChoices(value, seed, counting ? 20 : 30, avoid, counting ? 3 : 4);
    if (nearby) return nearby;
  }
  return numericChoices(value, seed, avoid);
}
