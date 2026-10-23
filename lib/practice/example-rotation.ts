import { answersMatch } from "@/lib/practice/answers";
import type { WorkedExample } from "@/lib/practice/example";

export function exampleKey(example: WorkedExample): string {
  return example.key || example.prompt;
}

/**
 * Next similar example the child has not seen yet.
 * After every example in the pool has been shown, the next request may repeat.
 */
export function takeNextExample(
  pool: readonly WorkedExample[],
  seen: readonly string[],
): { example: WorkedExample; seen: string[] } {
  if (pool.length === 0) {
    throw new Error("No worked examples to show.");
  }
  const keys = new Set(pool.map((item) => exampleKey(item)));
  const pending = pool.filter((item) => !seen.includes(exampleKey(item)));
  if (pending.length > 0) {
    const example = pending[0];
    return {
      example,
      seen: [...seen.filter((key) => keys.has(key)), exampleKey(example)],
    };
  }
  const example = pool[0];
  return { example, seen: [exampleKey(example)] };
}

/** True when text states the live answer as a number, fraction, or remainder. */
export function mentionsAnswer(text: string, answer: string): boolean {
  const expected = answer.trim();
  if (!expected) return false;
  const remainder = expected.match(/^(\d+)\s*r\s*(\d+)$/i);
  if (remainder) {
    const compact = text.toLowerCase().replace(/\s+/g, " ");
    const quotient = remainder[1];
    const left = remainder[2];
    return (
      compact.includes(`${quotient} r ${left}`) ||
      compact.includes(`${quotient} remainder ${left}`)
    );
  }
  const tokens = text.match(/\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?(?:\s*\/\s*\d+)?/g) ?? [];
  return tokens.some((token) => answersMatch(expected, token.replace(/\s+/g, "")));
}

export function exampleSeenStorageKey(skillId: string): string {
  return `masterasium-example-seen:${skillId}`;
}

export function readExampleSeen(storage: Pick<Storage, "getItem">, skillId: string): string[] {
  try {
    const raw = storage.getItem(exampleSeenStorageKey(skillId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === "string");
  } catch {
    return [];
  }
}

export function writeExampleSeen(
  storage: Pick<Storage, "setItem">,
  skillId: string,
  seen: string[],
): void {
  try {
    storage.setItem(exampleSeenStorageKey(skillId), JSON.stringify(seen));
  } catch {
    // A private browser can refuse session storage. The example still shows.
  }
}
