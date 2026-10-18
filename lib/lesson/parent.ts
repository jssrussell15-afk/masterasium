import { addDays } from "@/lib/practice/dates";
import type { ReviewGap } from "@/lib/lesson/flow";

export type LearnedSkill = {
  skillId: string;
  title: string;
  sentence: string;
};

export type HelpSkill = {
  skillId: string;
  title: string;
  strand: string;
  nextStep: string;
};

export type UpcomingReview = {
  skillId: string;
  title: string;
  dueOn: string;
  when: string;
};

export type AskSample = {
  title: string;
  prompt: string;
  answer: string;
};

export type ParentProgress = {
  learned: LearnedSkill[];
  needsHelp: HelpSkill[];
  upcoming: UpcomingReview[];
  ask: {
    solved: AskSample | null;
    repaired: AskSample | null;
  };
};

export type ProgressLesson = {
  skillId: string;
  title: string;
  sentence: string;
  stage: string;
  completedOn: string | null;
  lastMistake: string | null;
};

export type ProgressReview = {
  skillId: string;
  title: string;
  gap: ReviewGap;
  dueOn: string;
  done: boolean;
};

export type ProgressAttempt = {
  skillId: string;
  title: string;
  correct: boolean;
  date: string;
};

export function buildParentProgress(input: {
  today: string;
  lessons: ProgressLesson[];
  reviews: ProgressReview[];
  attempts: ProgressAttempt[];
  solved: AskSample | null;
  repaired: AskSample | null;
}): ParentProgress {
  const weekStart = addDays(input.today, -6);
  const learned = input.lessons.filter(
    (lesson) =>
      lesson.stage === "complete" &&
      lesson.completedOn != null &&
      lesson.completedOn >= weekStart &&
      lesson.completedOn <= input.today,
  );
  const learnedIds = new Set(learned.map((lesson) => lesson.skillId));
  const help = new Map<string, HelpSkill>();

  for (const lesson of input.lessons) {
    if (lesson.stage === "complete" || learnedIds.has(lesson.skillId)) continue;
    const struggled = input.attempts.some(
      (attempt) =>
        attempt.skillId === lesson.skillId && !attempt.correct && inWeek(attempt.date, weekStart, input.today),
    );
    if (!lesson.lastMistake && !struggled) continue;
    help.set(lesson.skillId, {
      skillId: lesson.skillId,
      title: lesson.title,
      strand: lesson.title,
      nextStep: nextStep(lesson.lastMistake),
    });
  }

  for (const attempt of input.attempts) {
    if (attempt.correct || !inWeek(attempt.date, weekStart, input.today)) continue;
    if (learnedIds.has(attempt.skillId) || help.has(attempt.skillId)) continue;
    const lesson = input.lessons.find((item) => item.skillId === attempt.skillId);
    if (lesson?.stage === "complete") continue;
    help.set(attempt.skillId, {
      skillId: attempt.skillId,
      title: attempt.title,
      strand: attempt.title,
      nextStep: nextStep(lesson?.lastMistake ?? null),
    });
  }

  const upcoming = input.reviews
    .filter((review) => !review.done)
    .sort((left, right) => left.dueOn.localeCompare(right.dueOn) || left.title.localeCompare(right.title))
    .map((review) => ({
      skillId: review.skillId,
      title: review.title,
      dueOn: review.dueOn,
      when: whenLabel(review.dueOn, input.today, review.gap),
    }));

  return {
    learned: learned.map((lesson) => ({
      skillId: lesson.skillId,
      title: lesson.title,
      sentence: lesson.sentence,
    })),
    needsHelp: [...help.values()],
    upcoming,
    ask: { solved: input.solved, repaired: input.repaired },
  };
}

export function plainDate(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return iso;
  return new Intl.DateTimeFormat("en-CA", {
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]))));
}

function inWeek(date: string, start: string, today: string): boolean {
  return date >= start && date <= today;
}

function nextStep(mistake: string | null): string {
  if (mistake) return `${mistake} Next, go back to the worked example, then try new numbers.`;
  return "Go back to the worked example, then try the questions with new numbers.";
}

function whenLabel(dueOn: string, today: string, gap: ReviewGap): string {
  if (dueOn <= today) return "Ready now";
  const gapLabel =
    gap === "day" ? "About a day later" : gap === "week" ? "About a week later" : "About a month later";
  return `${gapLabel} · ${plainDate(dueOn)}`;
}
