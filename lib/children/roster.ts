import type { SupabaseClient } from "@supabase/supabase-js";
import {
  friendlyDbError,
  isGradeProgressMissing,
  isStudentLoginMissing,
} from "@/lib/db-error";
import { gradeAccessFrom } from "@/lib/practice/grade-access";

export type RosterChild = {
  id: string;
  first_name: string;
  grade: number;
  username: string | null;
  workingGrade: number;
  nextUnlocked: boolean;
  requestedGrade: number | null;
  /** Null uses the grade default until a parent chooses. */
  readQuestionsAloud: boolean | null;
};

type BasicRow = {
  id: string;
  first_name: string;
  grade: number;
};

type ExtraRow = {
  id: string;
  username?: string | null;
  working_grade?: number | null;
  next_grade_unlocked?: boolean | null;
  requested_grade?: number | null;
};

function asRoster(row: BasicRow, extra?: ExtraRow): RosterChild {
  const access = gradeAccessFrom({
    enrolled: row.grade,
    working: extra?.working_grade,
    nextUnlocked: extra?.next_grade_unlocked,
    requested: extra?.requested_grade,
  });
  return {
    id: row.id,
    first_name: row.first_name,
    grade: row.grade,
    username: extra?.username ?? null,
    workingGrade: access?.working ?? row.grade,
    nextUnlocked: access?.nextUnlocked ?? false,
    requestedGrade: access?.requested ?? null,
    readQuestionsAloud: null,
  };
}

export async function loadRoster(
  supabase: SupabaseClient,
  parentId: string,
): Promise<{
  children: RosterChild[];
  error: string | null;
  studentSetup: string | null;
  gradeSetup: string | null;
}> {
  const basic = await supabase
    .from("children")
    .select("id, first_name, grade")
    .eq("parent_id", parentId)
    .order("created_at", { ascending: true });

  if (basic.error) {
    return { children: [], error: friendlyDbError(basic.error), studentSetup: null, gradeSetup: null };
  }

  const basics = (basic.data ?? []) as BasicRow[];
  const extra = await supabase
    .from("children")
    .select("id, username, working_grade, next_grade_unlocked, requested_grade")
    .eq("parent_id", parentId);

  if (!extra.error) {
    const byId = new Map(((extra.data ?? []) as ExtraRow[]).map((row) => [row.id, row]));
    return {
      children: await withReadAloud(
        supabase,
        parentId,
        basics.map((row) => asRoster(row, byId.get(row.id))),
      ),
      error: null,
      studentSetup: null,
      gradeSetup: null,
    };
  }

  if (!isGradeProgressMissing(extra.error) && !isStudentLoginMissing(extra.error)) {
    return {
      children: [],
      error: friendlyDbError(extra.error),
      studentSetup: null,
      gradeSetup: null,
    };
  }

  const gradeSetup = isGradeProgressMissing(extra.error) ? friendlyDbError(extra.error) : null;
  const studentSetup = isStudentLoginMissing(extra.error) ? friendlyDbError(extra.error) : null;
  const names = gradeSetup
    ? await supabase.from("children").select("id, username").eq("parent_id", parentId)
    : null;
  const progress = studentSetup
    ? await supabase
        .from("children")
        .select("id, working_grade, next_grade_unlocked, requested_grade")
        .eq("parent_id", parentId)
    : null;

  const nameRows =
    names && !names.error ? ((names.data ?? []) as { id: string; username: string | null }[]) : [];
  const progressRows = progress && !progress.error ? ((progress.data ?? []) as ExtraRow[]) : [];
  const byId = new Map<string, ExtraRow>();
  for (const row of nameRows) byId.set(row.id, { id: row.id, username: row.username });
  for (const row of progressRows) byId.set(row.id, { ...byId.get(row.id), ...row });

  return {
    children: await withReadAloud(
      supabase,
      parentId,
      basics.map((row) => asRoster(row, byId.get(row.id))),
    ),
    error: null,
    studentSetup: names?.error && isStudentLoginMissing(names.error) ? friendlyDbError(names.error) : studentSetup,
    gradeSetup:
      progress?.error && isGradeProgressMissing(progress.error) ? friendlyDbError(progress.error) : gradeSetup,
  };
}

async function withReadAloud(
  supabase: SupabaseClient,
  parentId: string,
  children: RosterChild[],
): Promise<RosterChild[]> {
  const aloud = await supabase.from("children").select("id, read_questions_aloud").eq("parent_id", parentId);
  if (aloud.error || !aloud.data) return children;
  const byId = new Map(
    (aloud.data as { id: string; read_questions_aloud: boolean | null }[]).map((row) => [
      row.id,
      row.read_questions_aloud,
    ]),
  );
  return children.map((child) => ({ ...child, readQuestionsAloud: byId.get(child.id) ?? null }));
}
