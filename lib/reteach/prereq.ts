/** Grade 3 skill → the Grade 2 skill a re-teach walks. */
export const PREREQUISITE_OF: Record<string, string> = {
  "g3-place": "g2-place",
  "g3-add-sub": "g2-add-sub",
  "g3-mult": "g2-groups",
  "g3-div-rem": "g2-groups",
  "g3-fractions": "g2-fractions",
  "g3-perimeter": "g2-measure",
  "g3-time": "g2-measure",
  "g3-data": "g2-data",
};

/** Spoken as a parent would say it, not as a skill title. */
export const PLAIN_SKILL: Record<string, string> = {
  "g2-add-sub": "adding and subtracting within 100",
  "g2-place": "tens and ones",
  "g2-groups": "equal groups",
  "g2-compare": "comparing numbers",
  "g2-measure": "measuring length",
  "g2-fractions": "equal shares",
  "g2-even-odd": "even and odd numbers",
  "g2-data": "reading a graph",
};

export function prerequisiteFor(skillId: string): string | null {
  return PREREQUISITE_OF[skillId] ?? null;
}

export function plainSkill(skillId: string): string {
  return PLAIN_SKILL[skillId] ?? "an earlier skill";
}
