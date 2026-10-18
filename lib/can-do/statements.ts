import type { Skill } from "@/lib/practice/skills";

const NBSP = "\u00A0";

/**
 * First-person lines for practice skills whose hosted Ontario title
 * is a Grade 3 expectation. Division with remainders is Grade 4 B2.6,
 * so that skill falls back to its title.
 */
export const GRADE_3_I_CAN: Record<string, string> = {
  // Place value to 1,000 — B1.1, B1.5
  "g3-place": "I can show what each digit is worth to 1,000.",
  // Addition and subtraction within 1,000 — B2.4, B2.5
  "g3-add-sub": "I can add and subtract numbers up to 1,000.",
  // Fair shares and equivalent fractions — B1.6, B1.7
  "g3-fractions": "I can name equal fractions for a fair share.",
  // Multiplication facts of 2, 5 and 10 — B2.2
  "g3-mult": "I can multiply and divide by 2, 5, and 10.",
  // Perimeter of polygons — E2.1
  "g3-perimeter": "I can find the distance around a polygon.",
  // Telling time in hours, minutes and seconds — E2.6
  "g3-time": "I can tell time in hours, minutes, and seconds.",
  // Pictographs and bar graphs with scales — D1.3
  "g3-data": "I can read pictographs and bar graphs.",
};

export function iCanFromTitle(title: string): string {
  const body = title.trim().replace(/[.]+$/u, "");
  if (!body) return "I can do this skill.";
  return `I can do ${body.charAt(0).toLowerCase()}${body.slice(1)}.`;
}

/** Keep products such as 10 × 10 and 2 × 5 on one line. */
export function keepExpressionsTogether(line: string): string {
  return line.replace(/(\d+)\s*×\s*(\d+)/gu, `$1${NBSP}×${NBSP}$2`);
}

export function iCanStatement(skill: Pick<Skill, "id" | "grade" | "title">): string {
  if (skill.grade === 3) {
    const written = GRADE_3_I_CAN[skill.id];
    if (written) return keepExpressionsTogether(written);
  }
  return keepExpressionsTogether(iCanFromTitle(skill.title));
}
