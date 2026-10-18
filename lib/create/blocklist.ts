import type { SafetyCategory } from "@/lib/create/moderate";

/** Words and phrases kept here so the list can be reviewed without hunting through the route. */
export const PROFANITY = ["damn", "hell", "shit", "fuck", "ass", "bitch", "crap", "piss"] as const;

export const SLURS = ["slur", "retard", "faggot", "nigger", "kike", "spic", "chink"] as const;

export const HATE = ["hate"] as const;

export const VIOLENCE = ["kill", "gun", "blood", "gore", "stab", "murder"] as const;

export const SEXUAL = ["sex", "nude", "porn", "naked"] as const;

export const SCARY = ["horror", "scary", "demon", "corpse"] as const;

export const BRANDS = ["disney", "nintendo", "marvel", "pokemon", "barbie", "lego"] as const;

export const INJECTION = ["ignore previous", "ignore the rules", "system prompt"] as const;

const SAFE_NAMES = new Set([
  "Pip",
  "Moss",
  "Lumen",
  "The",
  "A",
  "An",
]);

const LEET: Record<string, string> = {
  "0": "o",
  "1": "i",
  "3": "e",
  "4": "a",
  "5": "s",
  "7": "t",
  "@": "a",
  $: "s",
  "!": "i",
};

export const WRITE_MY_OWN_MAX = 60;

export type BlockReason = "empty" | "long" | "characters" | "blocked";

export type BlockResult =
  | { ok: true }
  | { ok: false; reason: BlockReason; category: SafetyCategory };

const GROUPS: { category: SafetyCategory; words: readonly string[] }[] = [
  { category: "profanity", words: PROFANITY },
  { category: "hate", words: [...SLURS, ...HATE] },
  { category: "violence", words: VIOLENCE },
  { category: "sexual", words: SEXUAL },
  { category: "scary", words: SCARY },
  { category: "brand", words: BRANDS },
  { category: "brand", words: INJECTION },
];

function fold(text: string): string {
  const stripped = text.normalize("NFKD").replace(/\p{M}/gu, "");
  let next = "";
  for (const char of stripped.toLowerCase()) next += LEET[char] ?? char;
  return next.replace(/[^a-z0-9@.]+/g, " ").replace(/\s+/g, " ").trim();
}

/** Join single letters that were split apart ("g u n") and leave real words alone. */
export function collapseSpacedLetters(text: string): string {
  return text.replace(/\b(?:[a-z]\s+){2,}[a-z]\b/g, (match) => match.replace(/\s+/g, ""));
}

function wordHit(text: string, word: string): boolean {
  const pattern = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
  return pattern.test(text);
}

function personalInfo(original: string, folded: string): boolean {
  if (/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(original)) return true;
  if (/(?:\d[\s().-]*){7,}/.test(original)) return true;
  if (
    /\d{1,6}\s+[a-z0-9.'-]+\s+(street|st|avenue|ave|road|rd|drive|dr|lane|ln|boulevard|blvd|way|court|ct)\b/i.test(
      folded,
    )
  ) {
    return true;
  }
  const names = original.match(/\b[A-Z][a-z]{1,}\s+[A-Z][a-z]{1,}\b/g) ?? [];
  return names.some((pair) => pair.split(/\s+/).some((part) => !SAFE_NAMES.has(part)));
}

/**
 * Screens a write-my-own sentence. The sentence itself is not returned.
 * Callers must not log the input.
 */
export function screenWriteMyOwn(text: string): BlockResult {
  const trimmed = text.trim();
  if (!trimmed) return { ok: false, reason: "empty", category: "personal" };
  if (trimmed.length > WRITE_MY_OWN_MAX) return { ok: false, reason: "long", category: "personal" };
  if (!/^[A-Za-z0-9 .,!?'-]+$/.test(trimmed)) {
    return { ok: false, reason: "characters", category: "personal" };
  }
  const folded = collapseSpacedLetters(fold(trimmed));
  if (personalInfo(trimmed, folded)) return { ok: false, reason: "blocked", category: "personal" };
  for (const group of GROUPS) {
    if (group.words.some((word) => wordHit(folded, fold(word)))) {
      return { ok: false, reason: "blocked", category: group.category };
    }
  }
  return { ok: true };
}
