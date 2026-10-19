import { readLearn, writeLearn } from "@/lib/practice/memory";
import type { SkillCard } from "@/lib/practice/scheduler";

/** Puts the prerequisite on the spaced-review list. The current skill's counts stay put. */
export function markPrerequisiteReview(card: SkillCard, today: string): SkillCard {
  const learn = readLearn(card.fsrs);
  return {
    ...card,
    fsrs: writeLearn(card.fsrs, {
      ...learn,
      needsReview: true,
      reviewDueAt: learn.reviewDueAt ?? today,
    }),
  };
}
