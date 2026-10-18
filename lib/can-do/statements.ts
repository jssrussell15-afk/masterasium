import type { Skill } from "@/lib/practice/skills";

/**
 * First-person lines for Grade 3, written for a Grade 3 reader.
 * Other grades use {@link iCanFromTitle}.
 */
export const GRADE_3_I_CAN: Record<string, string> = {
  "g3-place": "I can show what each digit is worth in a number to 1,000.",
  "g3-add-sub": "I can add and subtract numbers up to 1,000, one place at a time.",
  "g3-mult": "I can multiply with facts through 10 × 10.",
  "g3-div-rem": "I can divide into groups and write what is left over.",
  "g3-fractions": "I can use the bottom number for the equal parts and the top number for how many.",
  "g3-perimeter": "I can find the distance around a rectangle.",
  "g3-time": "I can tell time to the minute and count forward by minutes.",
  "g3-data": "I can read a bar graph and add or compare the counts.",
};

export function iCanFromTitle(title: string): string {
  const body = title.trim().replace(/[.]+$/u, "");
  if (!body) return "I can do this skill.";
  return `I can do ${body.charAt(0).toLowerCase()}${body.slice(1)}.`;
}

export function iCanStatement(skill: Pick<Skill, "id" | "grade" | "title">): string {
  if (skill.grade === 3) {
    const written = GRADE_3_I_CAN[skill.id];
    if (written) return written;
  }
  return iCanFromTitle(skill.title);
}
