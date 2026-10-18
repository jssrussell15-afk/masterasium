import type { Skill } from "@/lib/practice/skills";

const NBSP = "\u00A0";

/**
 * First-person lines for skills that match an Ontario 2020 Grade 3
 * specific expectation. Fact recall through 10×10 and division with
 * remainders are Grade 4 (B2.2 and B2.6), so those catalog skills
 * fall back to the title instead of a Grade 3 line.
 */
export const GRADE_3_I_CAN: Record<string, string> = {
  // B1.1, B1.5
  "g3-place": "I can show what each digit is worth to 1,000.",
  // B2.4, B2.5
  "g3-add-sub": "I can add and subtract numbers up to 1,000.",
  // B1.6, B1.7
  "g3-fractions": "I can name a fraction by counting the equal parts.",
  // E2.1
  "g3-perimeter": "I can find the distance around a rectangle.",
  // E2.6
  "g3-time": "I can tell time to the minute.",
  // D1.3
  "g3-data": "I can read the counts on a bar graph.",
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
