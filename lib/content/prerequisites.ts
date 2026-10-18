/** Grade 3 skills from the recent practice work, and the Grade 2 skill that comes first. */
export const GRADE_3_PREREQUISITES: readonly { skillSlug: string; prerequisiteSlug: string }[] = [
  { skillSlug: "g3-place", prerequisiteSlug: "g2-place" },
  { skillSlug: "g3-add-sub", prerequisiteSlug: "g2-add-sub" },
  { skillSlug: "g3-mult", prerequisiteSlug: "g2-groups" },
  { skillSlug: "g3-fractions", prerequisiteSlug: "g2-fractions" },
];
