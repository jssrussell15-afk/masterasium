export const CRA_STAGES = ["concrete", "representational", "abstract"] as const;
export type CraStage = (typeof CRA_STAGES)[number];

export const MANIPULATIVES = ["none", "base_ten", "number_line", "fraction_bars"] as const;
export type Manipulative = (typeof MANIPULATIVES)[number];

export const SEGMENTS = ["catch_up", "standard", "go_further"] as const;
export type SegmentVariant = (typeof SEGMENTS)[number];

export const RETEACH_OUTCOMES = ["returned", "needs_review", "abandoned"] as const;
export type ReteachOutcome = (typeof RETEACH_OUTCOMES)[number];

export type FirstTry = {
  itemId: string;
  correct: boolean;
  prerequisiteSkillId: string | null;
};

export type ReteachPhase = "practice" | "reteach";

export const RETURN_LINE = "Let's go back to where we were.";
export const ENTER_LINE = "Let's practice something that will help.";
export const STYLE_CHANGE_SETS = 2;
