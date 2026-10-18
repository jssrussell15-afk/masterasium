import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { friendlyDbError } from "@/lib/db-error";
import { torontoDate } from "@/lib/digest/build";
import type { SupportedGrade } from "@/lib/grades";
import { lessonTableMissing } from "@/lib/lesson/store";
import { buildCanDo, type CanDoLesson, type CanDoReview, type CanDoView } from "@/lib/can-do/view";
import type { SkillCard } from "@/lib/practice/scheduler";

type DbError = { message: string; code?: string };

export type CanDoLoad = {
  view: CanDoView | null;
  error: string | null;
};

type LessonRow = {
  child_id?: string;
  skill_id: string;
  stage: string;
  completed_at: string | null;
};

type ReviewRow = {
  child_id?: string;
  skill_id: string;
  gap: string;
  due_on: string;
  done_at: string | null;
};

type StateRow = {
  child_id?: string;
  skill_id: string;
  attempted: number;
  correct: number;
  consecutive_correct: number;
  fsrs: unknown;
  updated_at: string | null;
};

/**
 * Reads one child's mastered skills.
 * Callers must pass the signed-in student's id, or a child id already checked
 * against the parent's roster. RLS still applies on the client.
 */
export async function loadCanDo(
  supabase: SupabaseClient,
  input: { childId: string; grade: SupportedGrade; today: string; showReviewLinks: boolean },
): Promise<CanDoLoad> {
  const childId = input.childId;
  const [runs, reviews, states] = await Promise.all([
    supabase.from("lesson_runs").select("skill_id, stage, completed_at").eq("child_id", childId),
    supabase.from("skill_reviews").select("skill_id, gap, due_on, done_at").eq("child_id", childId),
    supabase
      .from("skill_states")
      .select("skill_id, attempted, correct, consecutive_correct, fsrs, updated_at")
      .eq("child_id", childId),
  ]);

  if (states.error && !lessonTableMissing(states.error)) {
    return { view: null, error: friendlyDbError(states.error) };
  }

  const lessonResult = optionalRows<LessonRow>(runs.error, runs.data);
  if (lessonResult.error) return { view: null, error: lessonResult.error };
  const reviewResult = optionalRows<ReviewRow>(reviews.error, reviews.data);
  if (reviewResult.error) return { view: null, error: reviewResult.error };

  const stateRows = ((states.data ?? []) as StateRow[]).filter((row) => !row.child_id || row.child_id === childId);
  const practicedOn: Record<string, string> = {};
  for (const row of stateRows) {
    const date = calendarDay(row.updated_at);
    if (date) practicedOn[row.skill_id] = date;
  }

  const lessons: CanDoLesson[] = lessonResult.rows
    .filter((row) => !row.child_id || row.child_id === childId)
    .map((row) => ({
      skillId: row.skill_id,
      stage: row.stage,
      completedOn: calendarDay(row.completed_at),
    }));

  const reviewRows: CanDoReview[] = reviewResult.rows
    .filter((row) => !row.child_id || row.child_id === childId)
    .map((row) => ({
      skillId: row.skill_id,
      gap: row.gap,
      dueOn: calendarDay(row.due_on) ?? row.due_on,
      done: Boolean(row.done_at),
    }));

  const cards: SkillCard[] = stateRows.map((row) => ({
    skillId: row.skill_id,
    attempted: row.attempted,
    correct: row.correct,
    consecutiveCorrect: row.consecutive_correct,
    fsrs: row.fsrs ?? null,
  }));

  return {
    view: buildCanDo({
      grade: input.grade,
      today: input.today,
      childId,
      showReviewLinks: input.showReviewLinks,
      lessons,
      reviews: reviewRows,
      cards,
      practicedOn,
    }),
    error: null,
  };
}

function optionalRows<T>(error: DbError | null, data: T[] | null): { rows: T[]; error: string | null } {
  if (!error) return { rows: data ?? [], error: null };
  if (lessonTableMissing(error)) return { rows: [], error: null };
  return { rows: [], error: friendlyDbError(error) };
}

function calendarDay(value: string | null): string | null {
  if (!value) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return torontoDate(parsed);
}
