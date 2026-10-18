import type { SupabaseClient } from "@supabase/supabase-js";
import { strategyLines, type StrandLine, type TaggedAnswer } from "@/lib/strategy/desk";
import { isStrategy } from "@/lib/strategy/types";

/** A database without the strategy columns leaves the desk quiet. */
export async function loadStrategyLines(supabase: SupabaseClient, childId: string): Promise<StrandLine[] | null> {
  const { data, error } = await supabase
    .from("attempts")
    .select("skill_id, strategy")
    .eq("child_id", childId)
    .limit(400);
  if (error || !data) return null;
  const answers: TaggedAnswer[] = [];
  for (const row of data as { skill_id?: string; strategy?: string }[]) {
    if (!row.skill_id || !isStrategy(row.strategy)) continue;
    answers.push({ skillId: row.skill_id, strategy: row.strategy });
  }
  if (answers.length === 0) return [];
  return strategyLines(answers);
}
