import type { SupportedGrade } from "@/lib/grades";
import { readLearn } from "@/lib/practice/memory";
import type { AttemptPoint } from "@/lib/practice/portrait";
import { isReviewDue } from "@/lib/practice/review";
import { accuracyOf, accuracyScheduler, type SkillCard } from "@/lib/practice/scheduler";
import { skillById, skillsForGrade, type Skill } from "@/lib/practice/skills";

export type HomeSkill = {
  id: string;
  title: string;
  grade: SupportedGrade;
  note: string;
};

export type StudentHome = {
  assigned: HomeSkill[];
  recommended: HomeSkill[];
  recent: HomeSkill[];
};

const LIST_LIMIT = 3;

function unique(ids: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const id of ids) {
    if (!id || seen.has(id)) continue;
    seen.add(id);
    result.push(id);
  }
  return result;
}

function asHome(skill: Skill, note: string): HomeSkill {
  return { id: skill.id, title: skill.title, grade: skill.grade, note };
}

/**
 * Three short lists for the student home.
 * Assigned is the path plus review the grade still owes.
 * Recommended is other skills worth a try, never a copy of assigned.
 */
export function studentHome(input: {
  grade: SupportedGrade;
  cards: SkillCard[];
  attempts: AttemptPoint[];
  today: string;
  startSkillId?: string;
}): StudentHome {
  const skills = skillsForGrade(input.grade);
  const focus = accuracyScheduler.chooseSkill({
    grade: input.grade,
    cards: input.cards,
    sessionCount: 0,
    today: input.today,
    startSkillId: input.startSkillId,
  });
  const review = skills.filter((skill) =>
    isReviewDue(readLearn(input.cards.find((card) => card.skillId === skill.id)?.fsrs), input.today),
  );
  const assignedIds = unique([focus.id, ...review.map((skill) => skill.id)]).slice(0, LIST_LIMIT);
  const assignedSet = new Set(assignedIds);
  const pool = skills.filter((skill) => !assignedSet.has(skill.id));
  const struggled = [...pool]
    .filter((skill) => (input.cards.find((card) => card.skillId === skill.id)?.attempted ?? 0) > 0)
    .sort((left, right) => {
      const leftCard = input.cards.find((card) => card.skillId === left.id);
      const rightCard = input.cards.find((card) => card.skillId === right.id);
      return accuracyOf(leftCard) - accuracyOf(rightCard);
    });
  const focusIndex = skills.findIndex((skill) => skill.id === focus.id);
  const after =
    focusIndex >= 0
      ? skills.slice(focusIndex + 1).filter((skill) => !assignedSet.has(skill.id))
      : [];
  const recommendedIds = unique([
    ...struggled.map((skill) => skill.id),
    ...after.map((skill) => skill.id),
    ...pool.map((skill) => skill.id),
  ]).slice(0, LIST_LIMIT);

  const newestFirst = [...input.attempts].sort((left, right) =>
    (right.at ?? right.date).localeCompare(left.at ?? left.date),
  );
  const recentIds = unique(newestFirst.map((attempt) => attempt.skillId)).slice(0, LIST_LIMIT);

  return {
    assigned: assignedIds.flatMap((id) => {
      const skill = skills.find((item) => item.id === id) ?? skillById(id);
      if (!skill) return [];
      const learn = readLearn(input.cards.find((card) => card.skillId === skill.id)?.fsrs);
      const due = isReviewDue(learn, input.today);
      const note =
        skill.id === focus.id
          ? "Next in this grade"
          : due && !learn.needsReview
            ? "Review today"
            : due
              ? "Assigned for another look"
              : "Next in this grade";
      return [asHome(skill, note)];
    }),
    recommended: recommendedIds.flatMap((id) => {
      const skill = skills.find((item) => item.id === id);
      if (!skill) return [];
      const attempted = input.cards.find((card) => card.skillId === skill.id)?.attempted ?? 0;
      return [asHome(skill, attempted > 0 ? "Lowest accuracy" : "A useful next step")];
    }),
    recent: recentIds.flatMap((id) => {
      const skill = skillById(id);
      const attempt = newestFirst.find((item) => item.skillId === id);
      if (!skill || !attempt) return [];
      const note = attempt.date === input.today ? "Practiced today" : `Practiced ${attempt.date}`;
      return [asHome(skill, note)];
    }),
  };
}
