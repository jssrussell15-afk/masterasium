import { STRANDS, ontarioLine, type StrandId } from "@/lib/curriculum/ontario";
import type { SupportedGrade } from "@/lib/grades";
import { iCanStatement } from "@/lib/can-do/statements";
import { isLessonSkill } from "@/lib/lesson/catalog";
import { readLearn, writeLearn } from "@/lib/practice/memory";
import { accuracyScheduler, emptyCard, isConfirmed, type SkillCard } from "@/lib/practice/scheduler";
import { skillById } from "@/lib/practice/skills";

export const PARENT_CAN_DO_LIMIT = 5;

export const STUDENT_EMPTY = "Your first skill will show up here when you've learned it.";
export const PARENT_EMPTY = "No skill is finished yet.";
export const LOOKBACK_LABEL = "Time for a quick look back";

export type CanDoReviewLink =
  | { kind: "lesson"; href: string }
  | { kind: "practice"; childId: string; skillId: string };

export type CanDoItem = {
  skillId: string;
  statement: string;
  strandId: StrandId;
  strandLabel: string;
  learnedOn: string;
  month: string;
  review: CanDoReviewLink | null;
};

export type CanDoStrand = {
  id: StrandId;
  label: string;
  skills: CanDoItem[];
};

export type CanDoView = {
  workingTitle: string;
  strands: CanDoStrand[];
  /** Every mastered skill, newest first. The parent desk shows the first five. */
  recent: CanDoItem[];
};

export type CanDoLesson = {
  skillId: string;
  stage: string;
  completedOn: string | null;
};

export type CanDoReview = {
  skillId: string;
  gap: string;
  dueOn: string;
  done: boolean;
};

const REVIEW_GAPS = new Set(["day", "week", "month"]);

export function learnedMonth(isoDate: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!match) return "";
  return new Intl.DateTimeFormat("en-CA", {
    month: "long",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]))));
}

export function workingOnLine(title: string): string {
  return `Working on now: ${title}.`;
}

export function buildCanDo(input: {
  grade: SupportedGrade;
  today: string;
  childId: string;
  showReviewLinks: boolean;
  lessons: CanDoLesson[];
  reviews: CanDoReview[];
  cards: SkillCard[];
  practicedOn?: Record<string, string>;
}): CanDoView {
  const practicedOn = input.practicedOn ?? {};
  const learnedOn = new Map<string, string>();

  for (const lesson of input.lessons) {
    if (lesson.stage !== "complete" || !skillById(lesson.skillId)) continue;
    const dated = lesson.completedOn || practicedOn[lesson.skillId] || "";
    const previous = learnedOn.get(lesson.skillId);
    if (!previous || (dated && dated > previous)) learnedOn.set(lesson.skillId, dated);
  }

  for (const card of input.cards) {
    if (!isConfirmed(card) || !skillById(card.skillId)) continue;
    if (learnedOn.get(card.skillId)) continue;
    learnedOn.set(card.skillId, practicedOn[card.skillId] || "");
  }

  const items = [...learnedOn.entries()].flatMap(([skillId, date]) => {
    const skill = skillById(skillId);
    const strand = skill ? ontarioLine(skill.id) : undefined;
    const strandMeta = strand ? STRANDS.find((item) => item.id === strand.strand) : undefined;
    if (!skill || !strand || !strandMeta) return [];
    const due = input.showReviewLinks && reviewIsDue(skillId, input.reviews, input.today);
    return [
      {
        skillId,
        statement: iCanStatement(skill),
        strandId: strand.strand,
        strandLabel: strandMeta.label,
        learnedOn: date,
        month: learnedMonth(date),
        order: skill.order,
        review: due ? reviewLink(input.childId, skillId) : null,
      },
    ];
  });

  const strands = STRANDS.flatMap((strand) => {
    const skills = items
      .filter((item) => item.strandId === strand.id)
      .sort(newestFirst)
      .map(withoutOrder);
    return skills.length > 0 ? [{ id: strand.id, label: strand.label, skills }] : [];
  });

  return {
    workingTitle: accuracyScheduler.chooseSkill({
      grade: input.grade,
      cards: cardsWithPassedLessons(input.cards, learnedOn.keys()),
      sessionCount: 0,
      today: input.today,
    }).title,
    strands,
    recent: [...items].sort(newestFirst).map(withoutOrder),
  };
}

function withoutOrder(item: CanDoItem & { order: number }): CanDoItem {
  return {
    skillId: item.skillId,
    statement: item.statement,
    strandId: item.strandId,
    strandLabel: item.strandLabel,
    learnedOn: item.learnedOn,
    month: item.month,
    review: item.review,
  };
}

function newestFirst(left: { learnedOn: string; order: number }, right: { learnedOn: string; order: number }): number {
  const byDate = right.learnedOn.localeCompare(left.learnedOn);
  if (byDate !== 0) return byDate;
  return right.order - left.order;
}

function reviewIsDue(skillId: string, reviews: CanDoReview[], today: string): boolean {
  return reviews.some(
    (review) =>
      review.skillId === skillId &&
      !review.done &&
      REVIEW_GAPS.has(review.gap) &&
      review.dueOn <= today,
  );
}

function reviewLink(childId: string, skillId: string): CanDoReviewLink {
  if (isLessonSkill(skillId)) {
    return { kind: "lesson", href: `/practice/${childId}/lesson/${skillId}` };
  }
  return { kind: "practice", childId, skillId };
}

/** A finished lesson counts as learned even if the skill card has not caught up. */
function cardsWithPassedLessons(cards: SkillCard[], masteredIds: Iterable<string>): SkillCard[] {
  const next = cards.map((card) => ({ ...card }));
  for (const skillId of masteredIds) {
    const index = next.findIndex((card) => card.skillId === skillId);
    const current = index >= 0 ? next[index] : emptyCard(skillId);
    if (!current || isConfirmed(current)) {
      if (index < 0 && current) next.push(current);
      continue;
    }
    const learn = { ...readLearn(current.fsrs), lessonCheck: "passed" as const };
    delete learn.lessonHold;
    const passed = { ...current, fsrs: writeLearn(current.fsrs, learn) };
    if (index >= 0) next[index] = passed;
    else next.push(passed);
  }
  return next;
}
