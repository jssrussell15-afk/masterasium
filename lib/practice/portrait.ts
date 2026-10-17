import type { SupportedGrade } from "@/lib/grades";
import { badgeTree, type BadgePiece } from "@/lib/practice/badges";
import { readLearn } from "@/lib/practice/memory";
import { accuracyScheduler, isConfirmed, type SkillCard } from "@/lib/practice/scheduler";
import { skillsForGrade } from "@/lib/practice/skills";
import { sessionStreak, type StreakMilestone } from "@/lib/practice/streak";
import { sessionRecap } from "@/lib/practice/summary";

export type AttemptPoint = {
  skillId: string;
  correct: boolean;
  date: string;
  /** ISO time, used to order recently practiced skills. */
  at?: string;
};

export type PracticePortrait = {
  streakDays: number;
  streakMilestone: StreakMilestone | null;
  recap: string | null;
  badges: BadgePiece[];
  needsReview: { skillId: string; title: string }[];
};

export function buildPortrait(input: {
  grade: SupportedGrade;
  cards: SkillCard[];
  attempts: AttemptPoint[];
  today: string;
}): PracticePortrait {
  const streak = sessionStreak(
    input.attempts.map((attempt) => attempt.date),
    input.today,
  );
  const focus = accuracyScheduler.chooseSkill({
    grade: input.grade,
    cards: input.cards,
    sessionCount: 0,
    today: input.today,
  });
  const todayRows = input.attempts.filter((attempt) => attempt.date === input.today);
  const counts = new Map<string, number>();
  for (const attempt of todayRows) {
    counts.set(attempt.skillId, (counts.get(attempt.skillId) ?? 0) + 1);
  }
  let trendId = focus.id;
  let trendCount = -1;
  for (const [skillId, count] of counts) {
    if (count > trendCount) {
      trendId = skillId;
      trendCount = count;
    }
  }
  const skills = skillsForGrade(input.grade);
  const trend = skills.find((skill) => skill.id === trendId) ?? focus;
  const trendToday = todayRows.filter((attempt) => attempt.skillId === trend.id);
  const card = input.cards.find((item) => item.skillId === trend.id);

  return {
    streakDays: streak.days,
    streakMilestone: streak.milestone,
    recap: sessionRecap({
      todayAttempted: todayRows.length,
      todayCorrect: todayRows.filter((attempt) => attempt.correct).length,
      skillTitle: trend.title,
      earlierAttempted: (card?.attempted ?? 0) - trendToday.length,
      earlierCorrect: (card?.correct ?? 0) - trendToday.filter((attempt) => attempt.correct).length,
    }),
    badges: badgeTree(
      skills.map((skill) => ({
        id: skill.id,
        title: skill.title,
        confirmed: isConfirmed(input.cards.find((item) => item.skillId === skill.id)),
      })),
    ),
    needsReview: skills
      .filter((skill) => readLearn(input.cards.find((item) => item.skillId === skill.id)?.fsrs).needsReview)
      .map((skill) => ({ skillId: skill.id, title: skill.title })),
  };
}
