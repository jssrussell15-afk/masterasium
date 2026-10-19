import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { friendlyDbError } from "@/lib/db-error";
import { torontoDate } from "@/lib/digest/build";
import {
  asReviewPhase,
  asStage,
  freshRun,
  gapsToClose,
  openReview,
  reviewDates,
  type LessonRun,
  type ReviewGap,
} from "@/lib/lesson/flow";
import type { LearnState } from "@/lib/practice/memory";
import { lessonById } from "@/lib/lesson/catalog";
import { skillById } from "@/lib/practice/skills";
import type { ProgressAttempt, ProgressLesson, ProgressReview } from "@/lib/lesson/parent";
import type { AskSample } from "@/lib/lesson/parent";

type DbError = { message: string; code?: string };

export function lessonTableMissing(error: DbError): boolean {
  const message = error.message.toLowerCase();
  return (
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    message.includes("lesson_runs") ||
    message.includes("skill_reviews") ||
    message.includes("talk_samples")
  );
}

export const LESSON_SETUP_MESSAGE =
  "Lesson progress is not available yet.";

type RunRow = {
  skill_id: string;
  stage: string;
  step_index: number;
  mastery_correct: number;
  mastery_asked: number;
  generation: number;
  last_mistake: string | null;
  feedback_note: string | null;
  feedback_expected: string | null;
  mode: string;
  review_phase: string | null;
  missed_in_round: boolean;
  completed_at: string | null;
};

function rowToRun(row: RunRow): LessonRun {
  return {
    skillId: row.skill_id,
    stage: asStage(row.stage),
    stepIndex: row.step_index,
    masteryCorrect: row.mastery_correct,
    masteryAsked: row.mastery_asked,
    generation: row.generation,
    lastMistake: row.last_mistake,
    feedbackNote: row.feedback_note,
    feedbackExpected: row.feedback_expected,
    mode: row.mode === "review" ? "review" : "learn",
    reviewPhase: asReviewPhase(row.review_phase),
    missedInRound: row.missed_in_round,
  };
}

function runToRow(childId: string, run: LessonRun, completedAt: string | null) {
  return {
    child_id: childId,
    skill_id: run.skillId,
    stage: run.stage,
    step_index: run.stepIndex,
    mastery_correct: run.masteryCorrect,
    mastery_asked: run.masteryAsked,
    generation: run.generation,
    last_mistake: run.lastMistake,
    feedback_note: run.feedbackNote,
    feedback_expected: run.feedbackExpected,
    mode: run.mode,
    review_phase: run.reviewPhase,
    missed_in_round: run.missedInRound,
    completed_at: completedAt,
    updated_at: new Date().toISOString(),
  };
}

export async function loadRun(
  supabase: SupabaseClient,
  childId: string,
  skillId: string,
): Promise<{ run: LessonRun | null; completedAt: string | null; error: string | null }> {
  const { data, error } = await supabase
    .from("lesson_runs")
    .select(
      "skill_id, stage, step_index, mastery_correct, mastery_asked, generation, last_mistake, feedback_note, feedback_expected, mode, review_phase, missed_in_round, completed_at",
    )
    .eq("child_id", childId)
    .eq("skill_id", skillId)
    .maybeSingle();
  if (error) {
    return {
      run: null,
      completedAt: null,
      error: lessonTableMissing(error) ? LESSON_SETUP_MESSAGE : friendlyDbError(error),
    };
  }
  if (!data) return { run: null, completedAt: null, error: null };
  const row = data as RunRow;
  return { run: rowToRun(row), completedAt: row.completed_at, error: null };
}

export async function saveRun(
  supabase: SupabaseClient,
  childId: string,
  run: LessonRun,
  completedAt: string | null,
): Promise<string | null> {
  const { error } = await supabase.from("lesson_runs").upsert(runToRow(childId, run, completedAt), {
    onConflict: "child_id,skill_id",
  });
  if (!error) return null;
  return lessonTableMissing(error) ? LESSON_SETUP_MESSAGE : friendlyDbError(error);
}

export async function prepareRun(
  supabase: SupabaseClient,
  childId: string,
  skillId: string,
  due: boolean,
): Promise<{ run: LessonRun; completedAt: string | null; error: string | null }> {
  const loaded = await ensureRun(supabase, childId, skillId);
  if (loaded.error) return loaded;
  const opened = openReview(loaded.run, due);
  if (opened === loaded.run) return loaded;
  const error = await saveRun(supabase, childId, opened, loaded.completedAt);
  return { run: opened, completedAt: loaded.completedAt, error };
}

export async function ensureRun(
  supabase: SupabaseClient,
  childId: string,
  skillId: string,
): Promise<{ run: LessonRun; completedAt: string | null; error: string | null }> {
  const loaded = await loadRun(supabase, childId, skillId);
  if (loaded.error) return { run: freshRun(skillId), completedAt: null, error: loaded.error };
  if (loaded.run) return { run: loaded.run, completedAt: loaded.completedAt, error: null };
  const run = freshRun(skillId);
  const error = await saveRun(supabase, childId, run, null);
  return { run, completedAt: null, error };
}

export async function scheduleReviews(
  supabase: SupabaseClient,
  childId: string,
  skillId: string,
  today: string,
): Promise<string | null> {
  const rows = reviewDates(today).map((item) => ({
    child_id: childId,
    skill_id: skillId,
    gap: item.gap,
    due_on: item.dueOn,
    done_at: null,
  }));
  const { error } = await supabase.from("skill_reviews").upsert(rows, { onConflict: "child_id,skill_id,gap" });
  if (!error) return null;
  return lessonTableMissing(error) ? LESSON_SETUP_MESSAGE : friendlyDbError(error);
}

export async function syncReviewRows(
  supabase: SupabaseClient,
  childId: string,
  skillId: string,
  learn: LearnState,
  today: string,
): Promise<void> {
  if (learn.recallMark === "day" || learn.recallMark === "week" || learn.recallMark === "month") {
    await supabase
      .from("skill_reviews")
      .update({ done_at: new Date().toISOString() })
      .eq("child_id", childId)
      .eq("skill_id", skillId)
      .eq("gap", learn.recallMark)
      .is("done_at", null);
    return;
  }
  const { data, error } = await supabase
    .from("skill_reviews")
    .select("gap, due_on, done_at")
    .eq("child_id", childId)
    .eq("skill_id", skillId);
  if (error || !data) return;
  const rows = (data as { gap: ReviewGap; due_on: string; done_at: string | null }[]).map((row) => ({
    gap: row.gap,
    dueOn: row.due_on,
  }));
  const closing = gapsToClose(learn.reviewPlan, today, rows);
  if (closing.length === 0) return;
  await supabase
    .from("skill_reviews")
    .update({ done_at: new Date().toISOString() })
    .eq("child_id", childId)
    .eq("skill_id", skillId)
    .in("gap", closing)
    .is("done_at", null);
}

export async function saveTalkSample(
  supabase: SupabaseClient,
  childId: string,
  kind: "solved" | "repaired",
  skillId: string,
  prompt: string,
  answer: string,
): Promise<void> {
  const trimmedPrompt = prompt.trim().slice(0, 500);
  const trimmedAnswer = answer.trim().slice(0, 80);
  if (!trimmedPrompt || !trimmedAnswer) return;
  await supabase.from("talk_samples").upsert(
    {
      child_id: childId,
      kind,
      skill_id: skillId,
      prompt: trimmedPrompt,
      answer: trimmedAnswer,
      created_at: new Date().toISOString(),
    },
    { onConflict: "child_id,kind" },
  );
}

export type ParentBundle = {
  lessons: ProgressLesson[];
  reviews: ProgressReview[];
  attempts: ProgressAttempt[];
  solved: AskSample | null;
  repaired: AskSample | null;
  missing: boolean;
};

export async function loadParentBundle(supabase: SupabaseClient, childId: string): Promise<ParentBundle> {
  const empty: ParentBundle = {
    lessons: [],
    reviews: [],
    attempts: [],
    solved: null,
    repaired: null,
    missing: false,
  };
  const [runs, reviews, samples, attempts] = await Promise.all([
    supabase
      .from("lesson_runs")
      .select("skill_id, stage, last_mistake, completed_at")
      .eq("child_id", childId),
    supabase.from("skill_reviews").select("skill_id, gap, due_on, done_at").eq("child_id", childId),
    supabase.from("talk_samples").select("kind, skill_id, prompt, answer").eq("child_id", childId),
    supabase.from("attempts").select("skill_id, correct, created_at").eq("child_id", childId),
  ]);
  const firstError = runs.error ?? reviews.error ?? samples.error;
  if (firstError && lessonTableMissing(firstError)) return { ...empty, missing: true };
  if (firstError) return empty;

  const lessons: ProgressLesson[] = ((runs.data ?? []) as {
    skill_id: string;
    stage: string;
    last_mistake: string | null;
    completed_at: string | null;
  }[]).flatMap((row) => {
    const skill = skillById(row.skill_id);
    const lesson = lessonById(row.skill_id);
    if (!skill || !lesson) return [];
    return [
      {
        skillId: row.skill_id,
        title: skill.title,
        sentence: lesson.sentence,
        stage: row.stage,
        completedOn: row.completed_at ? torontoDate(new Date(row.completed_at)) : null,
        lastMistake: row.last_mistake,
      },
    ];
  });

  const reviewRows: ProgressReview[] = ((reviews.data ?? []) as {
    skill_id: string;
    gap: ReviewGap;
    due_on: string;
    done_at: string | null;
  }[]).flatMap((row) => {
    const skill = skillById(row.skill_id);
    if (!skill) return [];
    if (row.gap !== "day" && row.gap !== "week" && row.gap !== "month") return [];
    return [
      {
        skillId: row.skill_id,
        title: skill.title,
        gap: row.gap,
        dueOn: row.due_on,
        done: Boolean(row.done_at),
      },
    ];
  });

  const sampleRows = (samples.data ?? []) as {
    kind: string;
    skill_id: string;
    prompt: string;
    answer: string;
  }[];
  const sampleFor = (kind: "solved" | "repaired"): AskSample | null => {
    const row = sampleRows.find((item) => item.kind === kind);
    const skill = row ? skillById(row.skill_id) : undefined;
    if (!row || !skill) return null;
    return { title: skill.title, prompt: row.prompt, answer: row.answer };
  };

  const attemptRows: ProgressAttempt[] = ((attempts.data ?? []) as {
    skill_id: string;
    correct: boolean;
    created_at: string;
  }[]).flatMap((row) => {
    const skill = skillById(row.skill_id);
    if (!skill || !row.created_at) return [];
    return [
      {
        skillId: row.skill_id,
        title: skill.title,
        correct: row.correct,
        date: torontoDate(new Date(row.created_at)),
      },
    ];
  });

  return {
    lessons,
    reviews: reviewRows,
    attempts: attemptRows,
    solved: sampleFor("solved"),
    repaired: sampleFor("repaired"),
    missing: false,
  };
}

export function nextReviewDate(learn: LearnState): string | null {
  return learn.reviewDueAt ?? learn.reviewPlan?.[0] ?? null;
}
