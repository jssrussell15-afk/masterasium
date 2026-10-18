/**
 * These ids are the mix-up tags on the explanation templates
 * (mixupTag in the Why branch) and the Show me walks they belong to.
 * Show me has no tag field of its own. The walk is linked here by skill.
 */
export type MisconceptionLink = {
  id: string;
  skillSlug: string;
  description: string;
  /** explanation = Why mixupTag. show-me = the walk for that skill. */
  surfaces: ("explanation" | "show-me")[];
};

export const MISCONCEPTIONS: readonly MisconceptionLink[] = [
  {
    id: "forgot_carried_ten",
    skillSlug: "g3-add-sub",
    description: "The ones were added, and the extra ten was not carried to the next place.",
    surfaces: ["explanation", "show-me"],
  },
  {
    id: "compared_digits_not_place_value",
    skillSlug: "g3-place",
    description: "The digits were compared one by one, without the place each digit is in.",
    surfaces: ["explanation"],
  },
  {
    id: "added_instead_of_grouped",
    skillSlug: "g3-mult",
    description: "The numbers were added instead of counting equal groups.",
    surfaces: ["explanation", "show-me"],
  },
  {
    id: "counted_tick_marks_not_spaces",
    skillSlug: "g3-fractions",
    description: "The marks on the line were counted, instead of the spaces between them.",
    surfaces: ["explanation", "show-me"],
  },
  {
    id: "treated_equals_as_answer_here",
    skillSlug: "g3-add-sub",
    description: "The blank was treated as the answer to the whole line, instead of the missing part.",
    surfaces: ["explanation"],
  },
  {
    id: "hour_stays_past_sixty",
    skillSlug: "g3-time",
    description: "The hour was left in place after the minutes passed 60.",
    surfaces: ["show-me"],
  },
];

export function misconceptionByTag(tag: string): MisconceptionLink | undefined {
  return MISCONCEPTIONS.find((item) => item.id === tag);
}
