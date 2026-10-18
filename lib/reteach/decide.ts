import { ENTER_LINE, RETURN_LINE, type FirstTry, type ReteachOutcome, type ReteachPhase } from "@/lib/reteach/types";

export type ReteachDecision =
  | { action: "continue" }
  | {
      action: "start";
      prerequisiteSkillId: string;
      triggerItemIds: string[];
      savedIndex: number;
      line: string;
    }
  | { action: "needs_review"; prerequisiteSkillId: string; line: string }
  | { action: "return"; savedIndex: number; line: string };

export type ReteachState = {
  phase: ReteachPhase;
  currentSkill: string;
  firstTries: readonly FirstTry[];
  /** Prerequisites already retaught today, including ones marked needs_review. */
  taughtToday: readonly string[];
  prereqAnswered: number;
  prereqCorrect: number;
  savedIndex: number;
  activePrerequisite: string | null;
};

const STREAK = 3;
const PREREQ_ITEMS = 3;

function streak(tries: readonly FirstTry[]): { skillId: string; itemIds: string[] } | null {
  let skillId: string | null = null;
  let itemIds: string[] = [];
  for (const attempt of tries) {
    if (attempt.correct || !attempt.prerequisiteSkillId) {
      skillId = null;
      itemIds = [];
      continue;
    }
    if (attempt.prerequisiteSkillId !== skillId) {
      skillId = attempt.prerequisiteSkillId;
      itemIds = [attempt.itemId];
      continue;
    }
    itemIds.push(attempt.itemId);
  }
  if (!skillId || itemIds.length < STREAK) return null;
  return { skillId, itemIds: itemIds.slice(-STREAK) };
}

/**
 * Three first-try misses in a row on the same prerequisite stop the current skill.
 * One re-teach per prerequisite per day. Two misses out of the three prereq items
 * mark needs_review and do not start another loop.
 */
export function decideReteach(state: ReteachState): ReteachDecision {
  if (state.phase === "reteach") {
    if (state.prereqAnswered < PREREQ_ITEMS || !state.activePrerequisite) return { action: "continue" };
    if (state.prereqCorrect <= 1) {
      return { action: "needs_review", prerequisiteSkillId: state.activePrerequisite, line: "" };
    }
    return { action: "return", savedIndex: state.savedIndex, line: RETURN_LINE };
  }

  const found = streak(state.firstTries);
  if (!found) return { action: "continue" };
  if (state.taughtToday.includes(found.skillId)) return { action: "continue" };
  return {
    action: "start",
    prerequisiteSkillId: found.skillId,
    triggerItemIds: found.itemIds,
    savedIndex: state.firstTries.length,
    line: ENTER_LINE,
  };
}

export function reasoningAllowed(phase: ReteachPhase): boolean {
  return phase === "practice";
}

/** Re-teach items never move the current skill's mastery. */
export function countsTowardCurrentMastery(phase: ReteachPhase): boolean {
  return phase === "practice";
}

export function outcomeFor(input: {
  answered: number;
  correct: number;
  leftEarly: boolean;
}): ReteachOutcome {
  if (input.leftEarly || input.answered < PREREQ_ITEMS) return "abandoned";
  if (input.correct <= 1) return "needs_review";
  return "returned";
}

/** Dev-only. Production practice ignores it. The preview page has its own switch. */
export function forcedReteach(value: string | undefined = process.env.RETEACH_FORCE, nodeEnv = process.env.NODE_ENV): boolean {
  if (nodeEnv === "production") return false;
  return value === "1";
}

export function forcedCatchUp(
  value: string | undefined = process.env.CATCH_UP_VARIANT,
  nodeEnv = process.env.NODE_ENV,
): boolean {
  if (nodeEnv === "production") return false;
  return value === "1";
}
