import { COLOURS, FIXES, MOODS, SIZES, SPECIALS, type ChipBag } from "@/lib/create/types";

/** Bump this when the system prompt text changes. Stored on session metadata. */
export const CREATE_SYSTEM_PROMPT_VERSION = "create-system-2026-10-18";

/**
 * Fixed system prompt for every Create text and image request.
 * The client cannot send or replace this text.
 */
export const CREATE_SYSTEM_PROMPT = [
  "You make pictures and short lines for a family project for children in grades 3 to 6.",
  "Stay family-rated and age-appropriate.",
  "No nudity or private parts.",
  "No sexual content.",
  "No profanity.",
  "No violence beyond a mild cartoon conflict.",
  "No hate or discrimination.",
  "No scary, gory, or disturbing imagery.",
  "No real people, brands, or copyrighted characters.",
  "Use simple original shapes. Do not add letters or logos.",
  "Follow only the fixed template and the allowlisted chips.",
].join(" ");

/**
 * Fixed recipes. Chip values are substituted only from the allowlist.
 * A child's own sentence is never inserted here.
 */
export const PROMPT_TEMPLATES = {
  spark:
    "A calm idea card for a grade-school picture project. Subject: {subject}. Flat shapes, no letters, no logos.",
  character:
    "A simple original story character named {name}. Size: {size}. Colour: {colour}. Mood: {mood}. One special thing: {special}. Time of day: {time}. Extra: {extra}. Flat shapes, no letters, no logos.",
  setting:
    "A simple original story place: {place}. Time of day: {time}. Extra: {extra}. Flat shapes, no letters, no logos.",
  page:
    "A simple original picture for page {page} of a {project}. Place: {place}. Time of day: {time}. Extra: {extra}. The picture should match a short sentence the child already chose. Flat shapes, no letters, no logos.",
} as const;

const SUBJECTS = [
  "river",
  "market",
  "library",
  "train",
  "garden",
  "lighthouse",
  "bakery",
  "kite",
  "bridge",
  "cave",
  "snow",
  "orchard",
] as const;

const PLACES = ["meadow", "harbour", "kitchen"] as const;
const NAMES = ["Pip", "Moss", "Lumen"] as const;

const ALLOWED = new Set<string>([
  ...SUBJECTS,
  ...PLACES,
  ...NAMES,
  ...SIZES,
  ...COLOURS,
  ...MOODS,
  ...SPECIALS,
  ...FIXES,
  "story",
  "comic",
  "moving",
  "day",
  "1",
  "2",
  "3",
  "4",
]);

export function chipsAllowed(values: string[]): boolean {
  return values.every((value) => ALLOWED.has(value));
}

export function fillTemplate(template: string, slots: Record<string, string>): string {
  return template.replace(/\{([a-z]+)\}/g, (_match, key: string) => {
    const value = slots[key];
    if (!value || !ALLOWED.has(value)) {
      throw new Error(`chip:${key}`);
    }
    return value;
  });
}

export function characterSlots(name: string, chips: ChipBag, fixes: string[] = []): Record<string, string> {
  return {
    name,
    size: chips.size,
    colour: chips.colour,
    mood: chips.mood,
    special: chips.special,
    time: fixes.includes("night") ? "night" : "day",
    extra: fixes.includes("friend") ? "friend" : "day",
  };
}

export function assertNoFreeText(template: string, freeText: string): boolean {
  if (!freeText.trim()) return true;
  return !template.includes(freeText.trim());
}

/** Server-side request text. Version, system prompt, then one fixed template. */
export function buildCreatePrompt(template: string, slots: Record<string, string>): string {
  return `${CREATE_SYSTEM_PROMPT_VERSION}\n${CREATE_SYSTEM_PROMPT}\n${fillTemplate(template, slots)}`;
}
