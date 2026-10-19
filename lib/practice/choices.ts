/** Answer tiles for Grades 1 and 2. Grade 3 and up keep a typed answer. */

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

export function practiceChoices(grade: number, prompt: string, answer: string, seed: string): string[] | null {
  if (grade > 2) return null;
  const compare = prompt.match(/which number is greater,\s*(-?\d+)\s+or\s+(-?\d+)/i);
  if (compare) return [compare[1] ?? "", compare[2] ?? ""].filter(Boolean);

  const expected = answer.trim();
  if (!/^\d+$/.test(expected)) return null;
  const value = Number(expected);
  const distractors: number[] = [];
  for (const delta of [1, -1, 2, -2, 10, -10]) {
    const next = value + delta;
    if (next >= 0 && next !== value && !distractors.includes(next)) distractors.push(next);
    if (distractors.length === 2) break;
  }
  if (distractors.length === 0) return null;
  return stableShuffle([expected, ...distractors.map(String)], seed);
}
