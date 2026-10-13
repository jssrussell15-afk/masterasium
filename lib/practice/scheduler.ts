import type { SupportedGrade } from "@/lib/grades";
import { skillsForGrade, type Skill } from "@/lib/practice/skills";
import type { SkillProgress } from "@/lib/practice/types";

export const MASTERY_MIN_ATTEMPTS = 10;
export const MASTERY_MIN_ACCURACY = 0.8;

/**
 * Per-skill memory shared by the starter scheduler and a future FSRS scheduler.
 * `fsrs` is stored and round-tripped. AccuracyScheduler does not read it.
 * An FSRS scheduler can store stability, difficulty, due, and state there
 * and replace AccuracyScheduler without changing the practice page.
 */
export type SkillCard = {
  skillId: string;
  attempted: number;
  correct: number;
  streak: number;
  fsrs: unknown;
};

export type SchedulerInput = {
  grade: SupportedGrade;
  cards: SkillCard[];
  /**
   * Questions already answered in the running count.
   * 0 asks for the focus skill. Counts 3 and 7 of every 8 can review a mastered skill.
   */
  sessionCount: number;
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

export class AccuracyScheduler implements PracticeScheduler {
  chooseSkill(input: SchedulerInput): Skill {
    const skills = skillsForGrade(input.grade);
    const cards = new Map(input.cards.map((card) => [card.skillId, card]));
    const mastered = skills.filter((skill) => isMastered(cards.get(skill.id)));

    const reviewTurn =
      input.sessionCount > 0 && (input.sessionCount % 8 === 3 || input.sessionCount % 8 === 7);
    if (reviewTurn && mastered.length > 0) {
      return lowestAccuracy(mastered, cards);
    }

    for (const skill of skills) {
      const ready = skill.prerequisites.every((id) => isMastered(cards.get(id)));
      if (ready && !isMastered(cards.get(skill.id))) return skill;
    }

    return lowestAccuracy(skills, cards);
  }
}

export const accuracyScheduler = new AccuracyScheduler();

export function describeSkills(grade: SupportedGrade, cards: SkillCard[]): SkillProgress[] {
  const focus = accuracyScheduler.chooseSkill({ grade, cards, sessionCount: 0 });
  const byId = new Map(cards.map((card) => [card.skillId, card]));
  return skillsForGrade(grade).map((skill) => {
    const card = byId.get(skill.id);
    const status =
      !card || card.attempted === 0 ? "not-started" : isMastered(card) ? "mastered" : "practicing";
    return {
      id: skill.id,
      title: skill.title,
      summary: skill.summary,
      examplePrompt: skill.examplePrompt,
      exampleSteps: skill.exampleSteps,
      exampleAnswer: skill.exampleAnswer,
      status,
      current: skill.id === focus.id,
    };
  });
}
