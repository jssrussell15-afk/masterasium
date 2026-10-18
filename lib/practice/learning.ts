import { advanceLessonCheck, lessonCheckOpen } from "@/lib/practice/lesson-check";
import { readLearn, writeLearn, type LearnState } from "@/lib/practice/memory";
import { applyRetest } from "@/lib/practice/review";
import { armRollback, shouldRollback, spendSupport } from "@/lib/practice/rollback";
import { accuracyScheduler, isConfirmed, isMastered, recordAttempt, type SkillCard } from "@/lib/practice/scheduler";
import { skillsForGrade } from "@/lib/practice/skills";
import type { QuestionKind } from "@/lib/practice/types";
import type { SupportedGrade } from "@/lib/grades";

export type QuestionPlan = {
  skillId: string;
  kind: QuestionKind;
  small: boolean;
  rollbackSkillId?: string;
};

export function planNextQuestion(input: {
  grade: SupportedGrade;
  cards: SkillCard[];
  sessionCount: number;
  today?: string;
  requestedSkillId?: string;
  explicit?: boolean;
  coachSmall?: boolean;
  provisionalIds?: readonly string[];
}): QuestionPlan {
  const inGrade = (id: string | undefined): id is string =>
    !!id && skillsForGrade(input.grade).some((skill) => skill.id === id);

  if (input.explicit && inGrade(input.requestedSkillId)) {
    return { skillId: input.requestedSkillId, kind: "focus", small: false };
  }

  const chosen = accuracyScheduler.chooseSkill({
    grade: input.grade,
    cards: input.cards,
    sessionCount: input.sessionCount,
    today: input.today,
    provisionalIds: input.provisionalIds,
  });
  const card = input.cards.find((item) => item.skillId === chosen.id);
  const learn = readLearn(card?.fsrs);

  if (shouldRollback(learn)) {
    const prerequisite = chosen.prerequisites.find((id) => inGrade(id));
    return {
      skillId: prerequisite ?? chosen.id,
      kind: "support",
      small: true,
      rollbackSkillId: chosen.id,
    };
  }

  if (lessonCheckOpen(learn)) {
    return { skillId: chosen.id, kind: "check", small: false };
  }

  if (input.coachSmall && inGrade(input.requestedSkillId)) {
    return { skillId: input.requestedSkillId, kind: "focus", small: true };
  }

  const focus = accuracyScheduler.chooseSkill({
    grade: input.grade,
    cards: input.cards,
    sessionCount: 0,
    today: input.today,
  });
  return {
    skillId: chosen.id,
    kind: chosen.id === focus.id ? "focus" : "review",
    small: false,
  };
}

export function applyLearning(input: {
  card: SkillCard;
  correct: boolean;
  kind: QuestionKind | null;
  today: string;
  rollbackCard?: SkillCard | null;
}): { card: SkillCard; extra?: SkillCard } {
  const before = readLearn(input.card.fsrs);
  const wasMastered = isMastered(input.card);
  const recorded = recordAttempt(input.card, input.correct);

  if (input.kind === "support") {
    return applySupport(recorded, before, input);
  }

  const learn: LearnState = {
    ...before,
    missStreak: input.correct ? 0 : (before.missStreak ?? 0) + 1,
  };

  if (input.kind === "check") {
    advanceLessonCheck(learn, before, {
      correct: input.correct,
      today: input.today,
    });
  } else if (!wasMastered && isMastered(recorded) && !before.lessonCheck) {
    learn.lessonCheck = "due";
  } else if (isConfirmed(input.card)) {
    applyRetest(learn, before, {
      correct: input.correct,
      kind: input.kind,
      today: input.today,
    });
  }

  armRollback(learn);

  return { card: { ...recorded, fsrs: writeLearn(recorded.fsrs, learn) } };
}

function applySupport(
  recorded: SkillCard,
  before: LearnState,
  input: {
    card: SkillCard;
    correct: boolean;
    today: string;
    rollbackCard?: SkillCard | null;
  },
): { card: SkillCard; extra?: SkillCard } {
  const learn: LearnState = { ...before };
  if (!isMastered(input.card) && isMastered(recorded) && !before.lessonCheck) {
    learn.lessonCheck = "due";
  }
  const card = { ...recorded, fsrs: writeLearn(recorded.fsrs, learn) };
  if (!input.rollbackCard || input.rollbackCard.skillId === card.skillId) {
    const parentLearn = readLearn(card.fsrs);
    spendSupport(parentLearn);
    return { card: { ...card, fsrs: writeLearn(card.fsrs, parentLearn) } };
  }
  const parentLearn = readLearn(input.rollbackCard.fsrs);
  spendSupport(parentLearn);
  return {
    card,
    extra: { ...input.rollbackCard, fsrs: writeLearn(input.rollbackCard.fsrs, parentLearn) },
  };
}
