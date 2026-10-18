import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  DEFAULT_PRACTICE_PROVINCE,
  openNextUp,
  type NextUpSkill,
  type WeekReview,
} from "@/lib/practice/move-ahead";
import type { SkillCard } from "@/lib/practice/scheduler";
import type { SupportedGrade } from "@/lib/grades";

export async function readMoveAhead(supabase: SupabaseClient): Promise<boolean> {
  const { data, error } = await supabase.from("children").select("move_ahead").maybeSingle();
  if (error || !data) return false;
  return Boolean((data as { move_ahead?: boolean }).move_ahead);
}

export async function readChildMoveAhead(supabase: SupabaseClient, childId: string): Promise<boolean> {
  const { data, error } = await supabase.from("children").select("move_ahead").eq("id", childId).maybeSingle();
  if (error || !data) return false;
  return Boolean((data as { move_ahead?: boolean }).move_ahead);
}

export async function readWeekPassed(supabase: SupabaseClient, childId: string): Promise<WeekReview[]> {
  const { data, error } = await supabase
    .from("skill_reviews")
    .select("skill_id, gap, done_at")
    .eq("child_id", childId);
  if (error || !data) return [];
  return (data as { skill_id: string; gap: string; done_at: string | null }[])
    .filter((row) => row.gap === "week")
    .map((row) => ({ skillId: row.skill_id, passed: Boolean(row.done_at) }));
}

export async function nextUpFor(
  supabase: SupabaseClient,
  childId: string,
  grade: SupportedGrade,
  cards: SkillCard[],
  moveAhead?: boolean,
): Promise<NextUpSkill[]> {
  const enabled = moveAhead ?? (await readMoveAhead(supabase));
  const weekPassed = await readWeekPassed(supabase, childId);
  return openNextUp({
    moveAhead: enabled,
    province: DEFAULT_PRACTICE_PROVINCE,
    grade,
    cards,
    weekPassed,
  });
}
