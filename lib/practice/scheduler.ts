import { selectorGrades, type GradeAccess } from "@/lib/practice/grade-access";
import type { SupportedGrade } from "@/lib/grades";
import { readLearn } from "@/lib/practice/memory";
import { isReviewDue, reviewCandidateIndex } from "@/lib/practice/review";
import { skillsForGrade, type Skill } from "@/lib/practice/skills";
import type { SkillProgress } from "@/lib/practice/types";

export const MASTERY_MIN_ATTEMPTS = 10;
export const MASTERY_MIN_ACCURACY = 0.8;

/**
 * Per-skill memory shared by the starter scheduler and a future FSRS scheduler.
 * `fsrs` is stored and round-tripped. The nested payload (stability, due, …)
 * is not read here. Lesson-check and review flags live beside that payload
 * and decide when the next skill opens.
 */
export type SkillCard = {
  skillId: string;
  attempted: number;
  correct: number;
  /** Correct answers in a row. Saved as consecutive_correct, never a streak column. */
  streak: number;
  fsrs: unknown;
};

export type SchedulerInput = {
  grade: SupportedGrade;
  cards: SkillCard[];
  /**
   * Questions already answered in the running count.
   * 0 asks for the current skill. Questions 3, 6, and 9 of each 10 can weave a due skill.
   */
  sessionCount: number;
  /** Toronto calendar day (YYYY-MM-DD). Omitted, date-due reviews stay quiet. */
  today?: string;
  /**
   * Practice opens on this skill. Earlier skills in the grade stay off the path.
   * Adaptive practice still moves forward once this skill is steady.
   */
  startSkillId?: string;
};

export interface PracticeScheduler {
  chooseSkill(input: SchedulerInput): Skill;
}

export function accuracyOf(card: SkillCard | undefined): number {
  if (!card || card.attempted === 0) return 0;
  return card.correct / card.attempted;
}

export function isMastered(card: SkillCard | undefined): boolean {
  if (!card || card.attempted < MASTERY_MIN_ATTEMPTS) return false;
  return accuracyOf(card) >= MASTERY_MIN_ACCURACY;
}

/**
 * Mastery opens the next skill only after the short check.
 * Cards saved before that check have no lessonCheck and stay confirmed
 * while they still meet the 10-question, 80% bar.
 * A passed check stays open so the check itself can sit near that bar.
 */
export function isConfirmed(card: SkillCard | undefined): boolean {
  if (!card) return false;
  const learn = readLearn(card.fsrs);
  const check = learn.lessonCheck;
  if (learn.lessonHold && check !== "passed") return false;
  if (check === "passed") return true;
  if (check) return false;
  return isMastered(card);
}

export function recordAttempt(card: SkillCard, correct: boolean): SkillCard {
  return {
    ...card,
    attempted: card.attempted + 1,
    correct: card.correct + (correct ? 1 : 0),
    streak: correct ? card.streak + 1 : 0,
    fsrs: card.fsrs ?? null,
  };
}

export function emptyCard(skillId: string): SkillCard {
  return { skillId, attempted: 0, correct: 0, streak: 0, fsrs: null };
}

function lowestAccuracy(skills: Skill[], cards: Map<string, SkillCard>): Skill {
  return [...skills].sort((left, right) => {
    const byAccuracy = accuracyOf(cards.get(left.id)) - accuracyOf(cards.get(right.id));
    if (byAccuracy !== 0) return byAccuracy;
    return left.order - right.order;
  })[0];
}

function pathFrom(skills: Skill[], startSkillId: string | undefined): { path: Skill[]; anchor: Skill | undefined } {
  const anchor = startSkillId ? skills.find((skill) => skill.id === startSkillId) : undefined;
  const path = anchor ? skills.filter((skill) => skill.order >= anchor.order) : skills;
  return { path, anchor };
}

/**
 * Confirmed skills that are due, including ones before the placement anchor
 * when the child has already practised them. Not-due mastered skills stay out.
 */
function reviewCandidates(
  skills: Skill[],
  cards: Map<string, SkillCard>,
  today: string | undefined,
): Skill[] {
  return skills
    .filter((skill) => {
      const card = cards.get(skill.id);
      if (!card || card.attempted < 1 || !isConfirmed(card)) return false;
      return isReviewDue(readLearn(card.fsrs), today);
    })
    .sort((left, right) => compareReview(left, right, cards));
}

function compareReview(left: Skill, right: Skill, cards: Map<string, SkillCard>): number {
  const leftLearn = readLearn(cards.get(left.id)?.fsrs);
  const rightLearn = readLearn(cards.get(right.id)?.fsrs);
  const leftKey = leftLearn.needsReview ? "0000-00-00" : (leftLearn.reviewDueAt ?? "9999-99-99");
  const rightKey = rightLearn.needsReview ? "0000-00-00" : (rightLearn.reviewDueAt ?? "9999-99-99");
  if (leftKey !== rightKey) return leftKey < rightKey ? -1 : 1;
  const byAccuracy = accuracyOf(cards.get(left.id)) - accuracyOf(cards.get(right.id));
  if (byAccuracy !== 0) return byAccuracy;
  return left.order - right.order;
}

export class AccuracyScheduler implements PracticeScheduler {
  chooseSkill(input: SchedulerInput): Skill {
    const skills = skillsForGrade(input.grade);
    const { path, anchor } = pathFrom(skills, input.startSkillId);
    const cards = new Map(input.cards.map((card) => [card.skillId, card]));

    const slot = reviewCandidateIndex(input.sessionCount);
    if (slot != null) {
      const due = reviewCandidates(skills, cards, input.today);
      const pick = due[slot];
      if (pick) return pick;
    }

    for (const skill of path) {
      const ready = skill.prerequisites.every((id) => {
        const earlier = skills.find((item) => item.id === id);
        if (anchor && earlier && earlier.order < anchor.order) return true;
        return isConfirmed(cards.get(id));
      });
      if (ready && !isConfirmed(cards.get(skill.id))) return skill;
    }

    return lowestAccuracy(path, cards);
  }
}

export const accuracyScheduler = new AccuracyScheduler();

export function describeSkills(
  grade: SupportedGrade,
  cards: SkillCard[],
  startSkillId?: string,
): SkillProgress[] {
  const focus = accuracyScheduler.chooseSkill({ grade, cards, sessionCount: 0, startSkillId });
  const byId = new Map(cards.map((card) => [card.skillId, card]));
  return skillsForGrade(grade).map((skill) => {
    const card = byId.get(skill.id);
    const learn = readLearn(card?.fsrs);
    const checkOpen =
      learn.lessonCheck === "due" || learn.lessonCheck === "active" || learn.lessonCheck === "retry";
    const status =
      !card || card.attempted === 0
        ? "not-started"
        : checkOpen
          ? "check"
          : isConfirmed(card)
            ? "mastered"
            : "practicing";
    return {
      id: skill.id,
      grade,
      title: skill.title,
      summary: skill.summary,
      examplePrompt: skill.examplePrompt,
      exampleSteps: skill.exampleSteps,
      exampleAnswer: skill.exampleAnswer,
      status,
      checked: learn.lessonCheck === "passed",
      current: skill.id === focus.id,
    };
  });
}

/** Every grade is listed. The current skill belongs to the grade they are working in. */
export function describeCatalog(
  access: Pick<GradeAccess, "working">,
  cards: SkillCard[],
  startSkillId?: string,
): SkillProgress[] {
  const focusId = accuracyScheduler.chooseSkill({
    grade: access.working,
    cards,
    sessionCount: 0,
    startSkillId,
  }).id;
  return selectorGrades().flatMap((grade) =>
    describeSkills(grade, cards, grade === access.working ? startSkillId : undefined).map((skill) => ({
      ...skill,
      current: skill.id === focusId,
    })),
  );
}
