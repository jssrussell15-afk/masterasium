import type { Strategy } from "@/lib/strategy/types";

/** Three-digit addition skills. Counting on here can point at base-ten catch-up items. */
const LARGE_ADDITION = new Set(["g3-add-sub"]);

export type CatchUpFlag = {
  flagged: boolean;
  manipulative: "base_ten" | "none";
  pattern: "counting_on_on_three_digit_addition" | null;
};

/**
 * A later catch-up loop can read this flag.
 * It does not change which question is served.
 */
export function catchUpManipulativeFlag(input: {
  strategy: Strategy;
  skillId: string;
  mastery: number;
}): CatchUpFlag {
  if (input.strategy === "counting_on" && LARGE_ADDITION.has(input.skillId) && input.mastery < 0.8) {
    return { flagged: true, manipulative: "base_ten", pattern: "counting_on_on_three_digit_addition" };
  }
  return { flagged: false, manipulative: "none", pattern: null };
}
