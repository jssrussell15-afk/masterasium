import { EVAL_PREREQ, SKILL_TITLES, STRAND_ANCHOR } from "@/lib/eval/links";
import { ADJUSTED_NOTE, type EvalGrade, type EvalLevel, type EvalStrand } from "@/lib/eval/types";

export type Placement = {
  strand: EvalStrand;
  level: EvalLevel;
  startSkill: string;
  provisionalSkills: string[];
  waitingSkill: string | null;
  rate: number | null;
};

export type PlaceInput = {
  grade: EvalGrade;
  strand: EvalStrand;
  correct: number;
  missed: number;
  skipped: number;
  moveAhead: boolean;
};

/** Skipped questions stay out of the rate. A strand with no answered question has no rate. */
export function answeredRate(correct: number, missed: number): number | null {
  const answered = correct + missed;
  if (answered <= 0) return null;
  return correct / answered;
}

export function levelForRate(rate: number | null): EvalLevel {
  if (rate == null || rate < 0.5) return "not_started";
  if (rate < 0.85) return "building";
  return "strong";
}

function unique(ids: Array<string | null>): string[] {
  return [...new Set(ids.filter((id): id is string => !!id))];
}

/**
 * Below 50% steps back one prerequisite.
 * From 50% up to 85% starts on this grade's skill.
 * At 85% or more, earlier skills are provisionally known and the next grade's skill opens
 * only when Let them move ahead is on.
 */
export function placeStrand(input: PlaceInput): Placement {
  const anchor = STRAND_ANCHOR[input.grade][input.strand];
  const prereq = EVAL_PREREQ[anchor.skill] ?? null;
  const nextAnchor = input.grade < 6 ? STRAND_ANCHOR[(input.grade + 1) as EvalGrade][input.strand] : null;
  const rate = answeredRate(input.correct, input.missed);
  const level = levelForRate(rate);

  if (level === "not_started") {
    return {
      strand: input.strand,
      level,
      startSkill: prereq ?? anchor.skill,
      provisionalSkills: [],
      waitingSkill: null,
      rate,
    };
  }

  if (level === "building") {
    return {
      strand: input.strand,
      level,
      startSkill: anchor.skill,
      provisionalSkills: [],
      waitingSkill: null,
      rate,
    };
  }

  const earlier = unique([prereq, anchor.skill]);
  if (!nextAnchor) {
    return {
      strand: input.strand,
      level,
      startSkill: anchor.skill,
      provisionalSkills: unique([prereq]),
      waitingSkill: null,
      rate,
    };
  }

  if (!input.moveAhead) {
    return {
      strand: input.strand,
      level,
      startSkill: anchor.skill,
      provisionalSkills: earlier,
      waitingSkill: nextAnchor.skill,
      rate,
    };
  }

  return {
    strand: input.strand,
    level,
    startSkill: nextAnchor.skill,
    provisionalSkills: earlier,
    waitingSkill: null,
    rate,
  };
}

export function alreadyKnow(grade: EvalGrade, placements: readonly Placement[]): string[] {
  return placements
    .filter((row) => row.level === "strong")
    .map((row) => STRAND_ANCHOR[grade][row.strand].title)
    .slice(0, 3);
}

export function startTitles(placements: readonly Placement[]): string[] {
  const held = placements.filter((row) => row.level !== "strong" || row.waitingSkill);
  const rows = (held.length > 0 ? held : placements).slice(0, 3);
  return rows.map((row) => SKILL_TITLES[row.startSkill] ?? row.startSkill);
}

export const CONFIRM_RATE = 0.7;

/** The first two practice sets confirm a placement. One finished set still waits. */
export function confirmSets(firstTryRates: readonly number[]): "wait" | "confirmed" | "step_back" {
  if (firstTryRates.length < 2) return "wait";
  const [first, second] = firstTryRates;
  if (first >= CONFIRM_RATE && second >= CONFIRM_RATE) return "confirmed";
  return "step_back";
}

export function stepBackSkill(skill: string): { skill: string; note: string } {
  return { skill: EVAL_PREREQ[skill] ?? skill, note: ADJUSTED_NOTE };
}

export const POST_DUE_DAYS = 28;

export function postIsDue(completedAt: Date, now: Date, postCompleted: boolean): boolean {
  if (postCompleted) return false;
  const days = (now.getTime() - completedAt.getTime()) / 86_400_000;
  return days >= POST_DUE_DAYS;
}

export type StrandDelta = {
  label: string;
  before: number;
  after: number;
  text: string;
};

/** Percents are rounded to the nearest 5 so the parent line reads as "about". */
export function aboutPercent(rate: number): number {
  return Math.round(rate * 20) * 5;
}

export function strandDelta(label: string, beforeRate: number, afterRate: number): StrandDelta {
  const before = aboutPercent(beforeRate);
  const after = aboutPercent(afterRate);
  return {
    label,
    before,
    after,
    text: `${label}: about ${before}% at the start → about ${after}% now`,
  };
}
