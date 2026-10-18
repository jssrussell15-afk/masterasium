import { loadBuggyExampleLine } from "@/lib/show-me/load";
import type { SupabaseClient } from "@supabase/supabase-js";

export async function ShowMeDesk({ supabase, childId }: { supabase: SupabaseClient; childId: string }) {
  const line = await loadBuggyExampleLine(supabase, childId).catch(() => null);
  if (!line) return null;
  return <p className="hint">{line}</p>;
}
