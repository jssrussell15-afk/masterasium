import type { SupabaseClient } from "@supabase/supabase-js";
import { buggyParentLine } from "@/lib/show-me/log";

/** Missing rows or an older events table leave the desk quiet. */
export async function loadBuggyExampleLine(supabase: SupabaseClient, childId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("practice_events")
    .select("detail")
    .eq("child_id", childId)
    .eq("kind", "show_me_style")
    .limit(20);
  if (error || !data) return null;
  const styles = (data as { detail?: { style?: string } }[])
    .map((row) => row.detail?.style)
    .filter((style): style is string => typeof style === "string");
  return buggyParentLine(styles);
}
