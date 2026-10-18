/** A short Grade 2–3 check: sentence length, word length, and a Flesch–Kincaid grade. */

const LONG_OK = new Set([
  "hundred",
  "hundreds",
  "thousand",
  "difference",
  "regroup",
  "regrouping",
  "altogether",
  "multiplication",
  "fractions",
  "numerator",
  "denominator",
]);

const MAX_SENTENCE_WORDS = 16;
const MAX_WORD_LETTERS = 12;
const MAX_GRADE = 5;

export type Readability = {
  grade: number;
  issues: string[];
};

function syllables(word: string): number {
  const cleaned = word.toLowerCase().replace(/[^a-z]/g, "");
  if (!cleaned) return 1;
  const groups = cleaned.match(/[aeiouy]+/g);
  let count = groups ? groups.length : 1;
  if (cleaned.endsWith("e") && count > 1) count -= 1;
  return Math.max(1, count);
}

export function readability(text: string): Readability {
  const issues: string[] = [];
  const sentences = text
    .split(/[.!?]+/)
    .map((part) => part.trim())
    .filter(Boolean);
  if (sentences.length === 0) {
    return { grade: 99, issues: ["There is no sentence."] };
  }
  const words: string[] = [];
  for (const sentence of sentences) {
    const parts = sentence.split(/\s+/).filter(Boolean);
    if (parts.length > MAX_SENTENCE_WORDS) {
      issues.push(`A sentence has ${parts.length} words.`);
    }
    words.push(...parts);
  }
  for (const word of words) {
    const letters = word.replace(/[^A-Za-z]/g, "");
    if (letters.length > MAX_WORD_LETTERS && !LONG_OK.has(letters.toLowerCase())) {
      issues.push(`The word “${letters}” is long.`);
    }
  }
  const syllableCount = words.reduce((sum, word) => sum + syllables(word), 0);
  const grade = 0.39 * (words.length / sentences.length) + 11.8 * (syllableCount / words.length) - 15.59;
  if (grade > MAX_GRADE) issues.push(`Reading grade is about ${grade.toFixed(1)}.`);
  return { grade, issues };
}

export function childText(parts: Array<string | undefined>): string {
  return parts.filter((part) => part && part.trim().length > 0).join(" ");
}
